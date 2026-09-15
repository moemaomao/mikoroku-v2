import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * Cucumber Manga adapter (WordPress Madara / wp-manga)
 *
 * Domain  : https://cucumbermanga.com
 * Latest  : /?s=&post_type=wp-manga&m_orderby=latest&page=N
 * Search  : /?s={q}&post_type=wp-manga
 * Detail  : /manga/{slug}/
 * Chapters: POST /manga/{slug}/ajax/chapters/
 * Pages   : /manga/{slug}/{chapter-slug}/  → .page-break img[data-src]
 *
 * ID format:
 *   manga   : "/manga/{slug}"
 *   chapter : "/manga/{slug}/{chapter-slug}"
 *
 * Bahasa default: English
 */
export class CucumberMangaSource extends BaseSource {
	id = 'cucumbermanga';
	name = 'Cucumber Manga';
	baseUrl = 'https://cucumbermanga.com';

	private readonly PER_PAGE = 24;
	private readonly DEFAULT_LANG = 'en';

	// ── Helpers ──────────────────────────────────────────────────────────────

	private absUrl(url: string): string {
		if (!url) return '';
		const u = url.trim();
		if (u.startsWith('http')) return u;
		if (u.startsWith('//')) return `https:${u}`;
		return `${this.baseUrl}${u.startsWith('/') ? '' : '/'}${u}`;
	}

	private cleanId(link: string): string {
		let id = (link || '').trim();
		if (id.startsWith('http')) {
			try {
				id = new URL(id).pathname;
			} catch {
				/* ignore */
			}
		}
		if (!id.startsWith('/')) id = `/${id}`;
		return id.replace(/\/+$/, '').split('?')[0] || '/';
	}

	private extractSlug(mangaId: string): string {
		const parts = String(mangaId)
			.replace(/^\/+/, '')
			.split('/')
			.filter(Boolean);
		if (parts[0] === 'manga' && parts[1]) return parts[1];
		return parts[0] || '';
	}

	private preferFullCover(url: string): string {
		if (!url) return '';
		return url.replace(/-\d+x\d+(\.\w+)(\?.*)?$/, '$1$2');
	}

	private parseChapterNumber(text: string, path = ''): number {
		const fromPath = path.match(/chapter[_-]?(\d+)(?:[.-](\d+))?/i);
		if (fromPath) {
			const major = parseInt(fromPath[1], 10);
			if (fromPath[2] != null && fromPath[2].length <= 2) {
				return parseFloat(`${major}.${fromPath[2]}`);
			}
			return major;
		}
		const m = String(text).match(
			/(?:chapter|chap|ch\.?)\s*(\d+)(?:[.,](\d+))?/i
		);
		if (m) {
			if (m[2] != null) return parseFloat(`${m[1]}.${m[2]}`);
			return parseInt(m[1], 10);
		}
		const n = String(text).match(/\b(\d+(?:\.\d+)?)\b/);
		return n ? parseFloat(n[1]) : 0;
	}

	private parseListCards($: cheerio.CheerioAPI): Manga[] {
		const res: Manga[] = [];
		const seen = new Set<string>();

		// Madara latest/search cards
		$('.c-tabs-item__content, .page-item-detail, .manga').each((_, el) => {
			const $el = $(el);
			const a = $el
				.find('a[href*="/manga/"]')
				.filter((_, link) => {
					const h = ($(link).attr('href') || '').split('?')[0];
					return /\/manga\/[^/]+\/?$/.test(h);
				})
				.first();

			const href = a.attr('href') || '';
			if (!href) return;

			const id = this.cleanId(href);
			if (!id.includes('/manga/') || seen.has(id)) return;
			// skip non-series paths
			const slug = id.split('/').filter(Boolean).pop() || '';
			if (!slug || slug === 'feed' || slug === 'manga') return;
			seen.add(id);

			const title = (
				a.attr('title') ||
				$el.find('h3 a, h5 a, .post-title a, .manga-title').first().text() ||
				a.text() ||
				''
			)
				.replace(/\s+/g, ' ')
				.trim();
			if (!title) return;

			const img = $el.find('img').first();
			let cover =
				img.attr('data-src') ||
				img.attr('data-lazy-src') ||
				img.attr('src') ||
				'';
			cover = this.preferFullCover(this.absUrl(cover));

			const chText =
				$el.find('.chapter a, .list-chapter a, .chapter').first().text() ||
				$el.text().match(/Chapter\s*[\d.]+/i)?.[0] ||
				'';
			const latestChapter = chText
				? String(
						this.parseChapterNumber(chText) ||
							chText.replace(/\s+/g, ' ').trim()
					)
				: undefined;

			res.push({
				id,
				title,
				cover,
				sourceId: this.id,
				type: 'manhwa',
				status: 'Ongoing',
				latestChapter,
				lang: this.DEFAULT_LANG
			});
		});

		return res;
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

	async getLatestManga(
		page: number,
		_opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			const path =
				p > 1
					? `/?s=&post_type=wp-manga&m_orderby=latest&paged=${p}`
					: `/?s=&post_type=wp-manga&m_orderby=latest`;
			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			const list = this.parseListCards($).slice(0, this.PER_PAGE);
			console.log(`[cucumbermanga] latest page=${p} → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[cucumbermanga] getLatestManga', e);
			return [];
		}
	}

	async searchManga(
		query: string,
		opts?: { page?: number; lang?: string; type?: string }
	): Promise<Manga[]> {
		const q = (query || '').trim();
		const page = Math.max(1, opts?.page || 1);
		if (!q) return this.getLatestManga(page, opts);

		try {
			const path =
				page > 1
					? `/?s=${encodeURIComponent(q)}&post_type=wp-manga&paged=${page}`
					: `/?s=${encodeURIComponent(q)}&post_type=wp-manga`;
			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			const list = this.parseListCards($);
			console.log(`[cucumbermanga] search "${q}" → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[cucumbermanga] searchManga', e);
			return [];
		}
	}

	async getMangaDetails(
		mangaId: string,
		_opts?: { lang?: string }
	): Promise<MangaDetails> {
		const id = this.cleanId(mangaId);
		const slug = this.extractSlug(id);
		if (!slug) throw new Error('CucumberManga: invalid mangaId');

		const path = id.endsWith('/') ? id : `${id}/`;
		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);

		const title = (
			$('div.post-title h1, .post-title h1, h1').first().text() ||
			$('meta[property="og:title"]').attr('content') ||
			slug
		)
			.replace(/\s+/g, ' ')
			.trim();

		let cover =
			$('.summary_image img, .tab-summary img, img.wp-post-image')
				.first()
				.attr('data-src') ||
			$('.summary_image img').first().attr('src') ||
			$('meta[property="og:image"]').attr('content') ||
			'';
		cover = this.preferFullCover(this.absUrl(cover));

		const description = (
			$('.description-summary .summary__content, .summary__content, .dsct')
				.first()
				.text() || ''
		)
			.replace(/\s+/g, ' ')
			.trim();

		const genres: string[] = [];
		$('.genres-content a, a[href*="/manga-genre/"]').each((_, el) => {
			const t = $(el).text().replace(/\s+/g, ' ').trim();
			if (t && !genres.includes(t)) genres.push(t);
		});

		let status = 'Ongoing';
		$('.post-status .summary-content, .post-content_item').each((_, el) => {
			const text = $(el).text().replace(/\s+/g, ' ').trim();
			if (/status/i.test(text)) {
				if (/complet/i.test(text)) status = 'Completed';
				else if (/hiatus/i.test(text)) status = 'Hiatus';
				else if (/drop|cancel/i.test(text)) status = 'Dropped';
			}
		});

		const authors: string[] = [];
		$('.author-content a, .artist-content a').each((_, el) => {
			const t = $(el).text().replace(/\s+/g, ' ').trim();
			if (t) authors.push(t);
		});

		// Chapters via Madara AJAX
		const chapters: Chapter[] = [];
		const seen = new Set<string>();
		try {
			const ajaxUrl = `${this.baseUrl}/manga/${encodeURIComponent(slug)}/ajax/chapters/`;
			const res = await fetch(ajaxUrl, {
				method: 'POST',
				headers: {
					...this.headers,
					'Content-Type': 'application/x-www-form-urlencoded',
					'X-Requested-With': 'XMLHttpRequest',
					Referer: `${this.baseUrl}/manga/${slug}/`
				},
				body: ''
			});
			const chHtml = await res.text();
			const $ch = cheerio.load(chHtml);

			$ch('li.wp-manga-chapter a, .wp-manga-chapter a, li a[href*="/manga/"]').each(
				(_, a) => {
					const href = $ch(a).attr('href') || '';
					if (!href || !href.includes('/manga/')) return;
					const chId = this.cleanId(href);
					if (seen.has(chId)) return;
					// must be deeper than series path
					if (chId === id || chId === `/manga/${slug}`) return;
					seen.add(chId);

					const text = $ch(a).text().replace(/\s+/g, ' ').trim();
					const number = this.parseChapterNumber(text, chId);
					const date = $ch(a)
						.parent()
						.find('.chapter-release-date, i, span')
						.last()
						.text()
						.replace(/\s+/g, ' ')
						.trim();

					chapters.push({
						id: chId,
						title: text || `Chapter ${number}`,
						number: number || chapters.length + 1,
						date: date || undefined
					});
				}
			);
		} catch (e) {
			console.error('[cucumbermanga] chapter list', e);
		}

		chapters.sort((a, b) => (b.number || 0) - (a.number || 0));

		const latestChapter =
			chapters.length > 0 ? String(chapters[0].number) : undefined;

		return {
			id: `/manga/${slug}`,
			sourceId: this.id,
			title,
			cover,
			type: 'manhwa',
			status,
			latestChapter,
			lang: this.DEFAULT_LANG,
			description,
			authors: [...new Set(authors)],
			genres,
			chapters
		};
	}

	async getChapterPages(chapterId: string): Promise<string[]> {
		try {
			const path = this.cleanId(chapterId);
			const html = await this.fetchHtml(path.endsWith('/') ? path : `${path}/`);
			const $ = cheerio.load(html);

			const pages: string[] = [];
			const seen = new Set<string>();

			const push = (src?: string | null) => {
				if (!src) return;
				const url = this.absUrl(src.trim());
				if (!url || url.startsWith('data:')) return;
				if (/dflazy|logo|avatar|icon|emoji/i.test(url)) return;
				if (seen.has(url)) return;
				seen.add(url);
				pages.push(url);
			};

			$('.page-break img, .reading-content img, img.wp-manga-chapter-img').each(
				(_, img) => {
					const $img = $(img);
					push(
						$img.attr('data-src') ||
							$img.attr('data-lazy-src') ||
							$img.attr('src')
					);
				}
			);

			// Fallback: WP-manga data paths in HTML
			if (pages.length === 0) {
				const re =
					/(https?:\/\/[^"'\\\s]+\/wp-content\/uploads\/WP-manga\/[^"'\\\s]+\.(?:jpg|jpeg|png|webp|avif))/gi;
				let m: RegExpExecArray | null;
				while ((m = re.exec(html)) !== null) {
					push(m[1]);
				}
			}

			console.log(
				`[cucumbermanga] getChapterPages ${path} → ${pages.length} pages`
			);
			return pages;
		} catch (e) {
			console.error('[cucumbermanga] getChapterPages', e);
			return [];
		}
	}
}
