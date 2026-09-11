import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * www.mangabats.com adapter (HTML + JSON chapters API)
 *
 * List   : /manga-list/latest-manga  |  ?page={n}   (~24–48/page)
 * Search : /search?q=QUERY
 * Detail : /manga/{slug}
 * Chapters: GET /api/manga/{slug}/chapters  → { success, data: { chapters: [...] } }
 * Chapter: /manga/{slug}/chapter-{n}
 * Pages  : #container-chapter-reader img  (CDN: *.2xstorage.com)
 *
 * ID format:
 *   manga   : "/manga/{slug}"
 *   chapter : "/manga/{slug}/chapter-{n}"
 */
export class MangaBatsComSource extends BaseSource {
	id = 'mangabatscom';
	name = 'MangaBats.com';
	baseUrl = 'https://www.mangabats.com';

	private readonly PER_PAGE = 24;

	// ── Helpers ──────────────────────────────────────────────────────────────

	private absUrl(url: string): string {
		if (!url) return '';
		if (url.startsWith('http')) return url;
		if (url.startsWith('//')) return `https:${url}`;
		return `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
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
		return id.replace(/\/+$/, '') || '/';
	}

	private extractSlug(mangaId: string): string {
		const path = this.cleanId(mangaId);
		const m = path.match(/\/manga\/([^/]+)/);
		return m?.[1] || path.replace(/^\/+/, '').split('/')[0];
	}

	private parseChapterNumber(text: string): number {
		const m = String(text).match(
			/(?:chapter|chap|ch\.?)\s*(\d+(?:\.\d+)?)/i
		);
		if (m) return parseFloat(m[1]);
		const n = String(text).match(/(\d+(?:\.\d+)?)/);
		return n ? parseFloat(n[1]) : 0;
	}

	// ── List parser ──────────────────────────────────────────────────────────

	private parseCards($: cheerio.CheerioAPI): Manga[] {
		const out: Manga[] = [];
		const seen = new Set<string>();

		// list page: .list-story-item | home: .itemupdate
		const processLink = (
			href: string,
			title: string,
			cover: string,
			chText = ''
		) => {
			if (!href || !/\/manga\//i.test(href)) return;
			const id = this.cleanId(href);
			// skip chapter urls
			if (/\/chapter[-/]/i.test(id)) return;
			if (!/^\/manga\/[^/]+$/.test(id)) return;
			if (seen.has(id)) return;
			seen.add(id);

			title = (title || '').replace(/\s+/g, ' ').trim();
			if (!title) return;

			cover = this.absUrl((cover || '').split('?')[0]);
			const latestChapter = this.parseChapterNumber(chText) || undefined;

			out.push({
				id,
				sourceId: this.id,
				title,
				cover,
				type: 'manga',
				status: 'Ongoing',
				latestChapter
			});
		};

		// --- list-story-item (manga-list / search) ---
		$('.list-story-item, a.list-story-item').each((_, el) => {
			const $el = $(el);
			const isAnchor = $el.is('a');
			const a = isAnchor ? $el : $el.find('a.list-story-item, a.cover, a[href*="/manga/"]').first();
			const href = a.attr('href') || '';
			const title =
				a.attr('title') ||
				$el.find('h3 a, .item-title, h3').first().text() ||
				a.find('img').attr('alt') ||
				'';
			const cover =
				a.find('img').attr('data-src') ||
				a.find('img').attr('src') ||
				$el.find('img').attr('data-src') ||
				$el.find('img').attr('src') ||
				'';
			const chText =
				$el.find('.chapter-item a, .item-chapter a, a[href*="/chapter"]').first().text() ||
				'';
			processLink(href, title, cover, chText);
		});

		// --- itemupdate (homepage daily update) ---
		if (!out.length) {
			$('.itemupdate').each((_, el) => {
				const $el = $(el);
				const a = $el.find('a.cover, a.tooltip, a[href*="/manga/"]').first();
				const href = a.attr('href') || '';
				const title =
					a.attr('title') ||
					$el.find('h3 a, a.tooltip-title').text() ||
					a.find('img').attr('alt') ||
					'';
				const cover =
					a.find('img').attr('data-src') ||
					a.find('img').attr('src') ||
					'';
				const chText =
					$el.find('a[href*="/chapter"]').first().text() || '';
				processLink(href, title, cover, chText);
			});
		}

		// fallback generic
		if (!out.length) {
			$('a[href*="/manga/"]').each((_, a) => {
				const $a = $(a);
				const href = $a.attr('href') || '';
				if (/\/chapter/i.test(href)) return;
				const title = $a.attr('title') || $a.text();
				const cover =
					$a.find('img').attr('data-src') ||
					$a.find('img').attr('src') ||
					'';
				processLink(href, title, cover);
			});
		}

		return out;
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

	async getLatestManga(
		page: number,
		_opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			const path =
				p <= 1
					? `/manga-list/latest-manga`
					: `/manga-list/latest-manga?page=${p}`;
			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			const list = this.parseCards($).slice(0, this.PER_PAGE);
			console.log(`[mangabatscom] latest page=${p} → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[mangabatscom] getLatestManga', e);
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
				page <= 1
					? `/search?q=${encodeURIComponent(q)}`
					: `/search?q=${encodeURIComponent(q)}&page=${page}`;
			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			const list = this.parseCards($).slice(0, this.PER_PAGE);
			console.log(`[mangabatscom] search "${q}" → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[mangabatscom] searchManga', e);
			return [];
		}
	}

	// ── Chapters API ─────────────────────────────────────────────────────────

	private async fetchChaptersApi(slug: string): Promise<Chapter[]> {
		const res = await fetch(`${this.baseUrl}/api/manga/${slug}/chapters`, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
				Accept: 'application/json',
				Referer: `${this.baseUrl}/manga/${slug}`,
				Origin: this.baseUrl
			}
		});
		if (!res.ok) throw new Error(`chapters API ${res.status}`);
		const json = (await res.json()) as {
			success?: boolean;
			data?: {
				chapters?: Array<{
					chapter_name?: string;
					chapter_slug?: string;
					chapter_num?: number;
					updated_at?: string;
				}>;
			};
		};
		const rows = json?.data?.chapters || [];
		const chapters: Chapter[] = [];
		const seen = new Set<string>();

		for (const row of rows) {
			const chSlug = row.chapter_slug || `chapter-${row.chapter_num}`;
			const id = `/manga/${slug}/${chSlug}`;
			if (seen.has(id)) continue;
			seen.add(id);

			const number =
				typeof row.chapter_num === 'number'
					? row.chapter_num
					: this.parseChapterNumber(row.chapter_name || chSlug);

			let date = '';
			if (row.updated_at) {
				try {
					date = new Date(row.updated_at).toISOString().slice(0, 10);
				} catch {
					date = String(row.updated_at).slice(0, 10);
				}
			}

			chapters.push({
				id,
				title: row.chapter_name || `Chapter ${number}`,
				number: number || chapters.length + 1,
				date
			});
		}

		// API already newest-first
		return chapters;
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const slug = this.extractSlug(mangaId);
		if (!slug) throw new Error(`Invalid mangabatscom id: ${mangaId}`);

		const html = await this.fetchHtml(`/manga/${slug}`);
		const $ = cheerio.load(html);

		let title =
			$('h1, .story-info-right h1, .panel-story-info h1').first().text().trim() ||
			$('meta[property="og:title"]').attr('content') ||
			$('title').text().split('|')[0] ||
			slug;
		title = title
			.replace(/^Read\s+/i, '')
			.replace(/\s+Latest Chapter.*$/i, '')
			.replace(/\s*[-|].*Mangabat.*$/i, '')
			.trim();

		let cover =
			$('meta[property="og:image"]').attr('content') ||
			$('.story-info-left img, .info-image img, img.img-loading').attr('src') ||
			$('.story-info-left img').attr('data-src') ||
			'';
		cover = this.absUrl((cover || '').split('?')[0]);

		// Alternative
		let alt = '';
		$('h2, li, .story-info-right').each((_, el) => {
			const t = $(el).text();
			if (/Alternative\s*:/i.test(t) && !alt) {
				alt = t
					.replace(/Alternative\s*:?\s*/i, '')
					.replace(/\s+/g, ' ')
					.trim();
			}
		});
		// cleaner: often in h2 next to Alternative label
		const altH2 = $('h2')
			.filter((_, el) => /Alternative/i.test($(el).prev().text()) || /;/.test($(el).text()))
			.first()
			.text()
			.trim();
		if (altH2 && altH2.length > 2) alt = altH2;

		// Status + last updated
		let status = 'Ongoing';
		let lastUpdate = '';
		$('p, li, .story-info-right span').each((_, el) => {
			const t = $(el).text().trim();
			const next = $(el).next().text().trim();
			if (/^Status:?$/i.test(t) && next) {
				const v = next.toLowerCase();
				if (/complete|finished|end/.test(v)) status = 'Completed';
				else if (/ongoing|publishing/.test(v)) status = 'Ongoing';
			}
			if (/Status\s*:/i.test(t)) {
				const v = t.toLowerCase();
				if (/complete|finished|end/.test(v)) status = 'Completed';
			}
			if (/^Last updated:?$/i.test(t) && next) {
				lastUpdate = next;
			}
			if (/Last updated\s*:/i.test(t)) {
				lastUpdate = t.replace(/Last updated\s*:?\s*/i, '').trim();
			}
		});

		// Authors
		const authors: string[] = [];
		$('a[href*="/author/"], .story-info-right a').each((_, a) => {
			const href = $(a).attr('href') || '';
			if (!/author/i.test(href) && !/Author/i.test($(a).parent().text())) return;
			const n = $(a).text().trim();
			if (n && n.toLowerCase() !== 'unknown' && !authors.includes(n)) {
				authors.push(n);
			}
		});
		if (!authors.length) {
			$('p, li').each((_, el) => {
				const t = $(el).text();
				if (/Author\(s\)\s*:/i.test(t)) {
					const n = t.replace(/Author\(s\)\s*:?\s*/i, '').trim();
					if (n && n.toLowerCase() !== 'unknown') authors.push(n);
				}
			});
		}

		// Genres
		const genres: string[] = [];
		$('a[href*="/genre/"], .genre-list a').each((_, a) => {
			const g = $(a).text().trim();
			if (g && !genres.includes(g) && g.length < 40) genres.push(g);
		});

		const synopsis =
			$('#panel-story-info-description, .panel-story-info-description, .summary')
				.text()
				.replace(/\s+/g, ' ')
				.replace(/^Description\s*:?\s*/i, '')
				.trim() ||
			$('meta[name="description"]').attr('content') ||
			'';

		// Chapters via JSON API
		let chapters: Chapter[] = [];
		try {
			chapters = await this.fetchChaptersApi(slug);
		} catch (e) {
			console.warn('[mangabatscom] chapters API failed, DOM fallback', e);
			const seen = new Set<string>();
			$(`a[href*="/manga/${slug}/chapter"]`).each((_, a) => {
				const href = $(a).attr('href') || '';
				const id = this.cleanId(href);
				if (seen.has(id)) return;
				seen.add(id);
				const chTitle = $(a).text().replace(/\s+/g, ' ').trim() || id;
				chapters.push({
					id,
					title: chTitle,
					number: this.parseChapterNumber(chTitle) || this.parseChapterNumber(id),
					date: ''
				});
			});
		}

		const latestChapter = chapters[0]?.number;
		const latestUpdate = lastUpdate || chapters[0]?.date || '';

		const description = [
			alt && `Alternative: ${alt}`,
			latestUpdate && `Latest update: ${latestUpdate}`,
			latestChapter != null && `Latest chapter: ${latestChapter}`,
			synopsis
		]
			.filter(Boolean)
			.join('\n\n');

		return {
			id: `/manga/${slug}`,
			sourceId: this.id,
			title,
			cover,
			type: 'manga',
			status,
			description,
			authors,
			genres,
			chapters,
			latestChapter
		};
	}

	// ── Pages ────────────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
		const path = this.cleanId(chapterId);
		if (!/\/chapter/i.test(path)) {
			console.error('[mangabatscom] getChapterPages → not a chapter path:', chapterId);
			return [];
		}

		try {
			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			const urls: string[] = [];
			const seen = new Set<string>();

			const $scope = $('#container-chapter-reader, .container-chapter-reader');
			const $imgs = $scope.length
				? $scope.find('img')
				: $('img[src*="2xstorage"], img[data-src*="2xstorage"]');

			$imgs.each((_, img) => {
				let src =
					$(img).attr('src') ||
					$(img).attr('data-src') ||
					$(img).attr('data-original') ||
					'';
				if (!src || src.startsWith('data:')) return;
				src = this.absUrl(src.split('?')[0]);
				if (!/^https?:\/\//i.test(src)) return;
				if (/logo|icon|favicon|avatar|og-image|thumb\//i.test(src)) return;
				if (seen.has(src)) return;
				seen.add(src);
				urls.push(src);
			});

			// fallback: any 2xstorage page image (not thumb)
			if (!urls.length) {
				$('img').each((_, img) => {
					let src =
						$(img).attr('src') || $(img).attr('data-src') || '';
					if (!src || !/2xstorage\.com/i.test(src)) return;
					if (/\/thumb\//i.test(src)) return;
					src = this.absUrl(src.split('?')[0]);
					if (seen.has(src)) return;
					seen.add(src);
					urls.push(src);
				});
			}

			console.log(`[mangabatscom] ${urls.length} pages → ${path}`);
			return urls;
		} catch (e) {
			console.error('[mangabatscom] getChapterPages failed', path, e);
			return [];
		}
	}
}
