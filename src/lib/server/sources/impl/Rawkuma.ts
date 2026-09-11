import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * rawkuma.net adapter (HTML + admin-ajax chapter_list)
 *
 * List    : /manga/?orderby=update  |  /manga/page/{n}/?orderby=update
 * Search  : /?s=QUERY (site library redirect sering 404 → fallback filter title)
 * Detail  : /manga/{slug}/
 * Chapters: POST/GET wp-admin/admin-ajax.php?action=chapter_list&manga_id=&page=1
 * Pages   : /manga/{slug}/chapter-{n}.{id}/  → <img src='...'>
 *
 * ID format:
 *   manga   : "/manga/{slug}"
 *   chapter : "/manga/{slug}/chapter-{n}.{id}"
 */
export class RawkumaSource extends BaseSource {
	id = 'rawkuma';
	name = 'Rawkuma';
	baseUrl = 'https://rawkuma.net';

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
		// drop trailing slash except root
		id = id.replace(/\/+$/, '') || '/';
		return id;
	}

	private extractSlug(mangaId: string): string {
		const path = this.cleanId(mangaId);
		const m = path.match(/\/manga\/([^/]+)/);
		return m?.[1] || path.replace(/^\/+/, '');
	}

	private parseChapterNumber(text: string): number {
		const m = String(text).match(
			/(?:chapter|chap|ch\.?)\s*(\d+(?:\.\d+)?)/i
		);
		if (m) return parseFloat(m[1]);
		const n = String(text).match(/(\d+(?:\.\d+)?)/);
		return n ? parseFloat(n[1]) : 0;
	}

	private decodeHtml(s: string): string {
		return s
			.replace(/&#8211;/g, '–')
			.replace(/&#8217;/g, "'")
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&hellip;/g, '…')
			.replace(/\s+/g, ' ')
			.trim();
	}

	// ── List parser ──────────────────────────────────────────────────────────

	private parseCards($: cheerio.CheerioAPI): Manga[] {
		const out: Manga[] = [];
		const seen = new Set<string>();

		// Prefer cards that link to /manga/{slug}/ (not chapter)
		$('a[href*="/manga/"]').each((_, a) => {
			const $a = $(a);
			const href = $a.attr('href') || '';
			if (!href || /\/chapter-/i.test(href)) return;

			const path = this.cleanId(href);
			const m = path.match(/^\/manga\/([^/]+)$/);
			if (!m) return;
			const slug = m[1];
			if (slug === 'feed' || slug === 'page') return;

			const id = `/manga/${slug}`;
			if (seen.has(id)) return;

			// title
			let title =
				$a.attr('title') ||
				$a.find('img').attr('alt') ||
				$a.text() ||
				'';
			title = this.decodeHtml(title).replace(/\s+/g, ' ').trim();
			if (!title || title.length < 2) return;
			// skip pure chapter labels
			if (/^chapter\s+\d/i.test(title)) return;

			seen.add(id);

			// cover: img inside link or sibling card
			let cover =
				$a.find('img').attr('src') ||
				$a.find('img').attr('data-src') ||
				$a.closest('div, article, li').find('img').first().attr('src') ||
				'';
			cover = this.absUrl((cover || '').split('?')[0]);

			// latest chapter nearby
			const parent = $a.closest('div, article, li');
			const chText =
				parent.find('a[href*="/chapter-"]').first().text() ||
				parent.text().match(/Chapter\s+\d+(?:\.\d+)?/i)?.[0] ||
				'';
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
		});

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
					? `/manga/?orderby=update`
					: `/manga/page/${p}/?orderby=update`;

			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			const list = this.parseCards($);
			console.log(`[rawkuma] latest page=${p} → ${list.length} items`);
			return list.slice(0, this.PER_PAGE);
		} catch (e) {
			console.error('[rawkuma] getLatestManga', e);
			return [];
		}
	}

	async searchManga(
		query: string,
		opts?: { page?: number; lang?: string; type?: string }
	): Promise<Manga[]> {
		const q = (query || '').trim().toLowerCase();
		const page = Math.max(1, opts?.page || 1);
		if (!q) return this.getLatestManga(page, opts);

		try {
			// Site search often 404 → ambil beberapa halaman latest & filter judul
			const pagesToScan = Math.min(page + 2, 5);
			const all: Manga[] = [];
			const seen = new Set<string>();

			for (let p = 1; p <= pagesToScan; p++) {
				const path =
					p <= 1
						? `/manga/?orderby=update`
						: `/manga/page/${p}/?orderby=update`;
				const html = await this.fetchHtml(path);
				const $ = cheerio.load(html);
				for (const m of this.parseCards($)) {
					if (seen.has(m.id)) continue;
					if (!m.title.toLowerCase().includes(q) && !m.id.includes(q.replace(/\s+/g, '-'))) {
						continue;
					}
					seen.add(m.id);
					all.push(m);
				}
			}

			console.log(`[rawkuma] search "${q}" → ${all.length} items`);
			return all.slice(0, this.PER_PAGE);
		} catch (e) {
			console.error('[rawkuma] searchManga', e);
			return [];
		}
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const slug = this.extractSlug(mangaId);
		if (!slug) throw new Error(`Invalid rawkuma id: ${mangaId}`);

		const detailPath = `/manga/${slug}/`;
		const html = await this.fetchHtml(detailPath);
		const $ = cheerio.load(html);

		// JSON-LD (paling akurat)
		let ld: any = null;
		$('script[type="application/ld+json"]').each((_, el) => {
			try {
				const data = JSON.parse($(el).html() || '');
				const types = Array.isArray(data['@type'])
					? data['@type']
					: [data['@type']];
				if (
					types.some(
						(t: string) =>
							/ComicSeries|Book|ComicStory/i.test(String(t || ''))
					)
				) {
					ld = data;
				}
			} catch {
				/* ignore */
			}
		});

		let title =
			ld?.name ||
			ld?.headline ||
			$('title').text().split(/[–—|-]/)[0] ||
			slug;
		title = this.decodeHtml(String(title));

		let cover =
			ld?.image?.url ||
			ld?.image ||
			$('meta[property="og:image"]').attr('content') ||
			$('img.wp-post-image').first().attr('src') ||
			'';
		if (typeof cover === 'object' && cover?.url) cover = cover.url;
		cover = this.absUrl(String(cover || '').split('?')[0]);

		const altRaw = ld?.alternateName
			? Array.isArray(ld.alternateName)
				? ld.alternateName.join(', ')
				: String(ld.alternateName)
			: '';

		const authors: string[] = [];
		if (ld?.author?.name) authors.push(String(ld.author.name));
		if (ld?.illustrator?.name) authors.push(String(ld.illustrator.name));

		const genres: string[] = Array.isArray(ld?.genre)
			? ld.genre.map(String)
			: [];

		let status = 'Ongoing';
		if (ld?.isCompleted === true || /complete/i.test(String(ld?.creativeWorkStatus || ''))) {
			status = 'Completed';
		} else if (ld?.creativeWorkStatus) {
			status = String(ld.creativeWorkStatus);
		}

		const lastUpdate = ld?.dateModified
			? String(ld.dateModified).slice(0, 10)
			: '';

		const synopsis = this.decodeHtml(
			String(ld?.description || $('meta[name="description"]').attr('content') || '')
		);

		// manga_id untuk ajax chapter list
		const mangaIdNum =
			html.match(/manga_id=(\d+)/)?.[1] ||
			html.match(/manga_id['"]?\s*[:=]\s*['"]?(\d+)/)?.[1] ||
			'';

		const chapters = await this.fetchChapters(slug, mangaIdNum, detailPath);

		const description = [
			altRaw && `Alternative: ${this.decodeHtml(altRaw)}`,
			lastUpdate && `Latest update: ${lastUpdate}`,
			chapters[0]?.number != null && `Latest chapter: ${chapters[0].number}`,
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
			authors: [...new Set(authors)],
			genres,
			chapters,
			latestChapter: chapters[0]?.number
		};
	}

	private async fetchChapters(
		slug: string,
		mangaIdNum: string,
		pageUrl: string
	): Promise<Chapter[]> {
		const chapters: Chapter[] = [];
		const seen = new Set<string>();

		if (mangaIdNum) {
			try {
				const ajaxUrl =
					`${this.baseUrl}/wp-admin/admin-ajax.php` +
					`?manga_id=${mangaIdNum}&page=1&action=chapter_list`;

				const res = await fetch(ajaxUrl, {
					headers: {
						...this.headers,
						Referer: `${this.baseUrl}${pageUrl}`,
						'HX-Request': 'true',
						'HX-Trigger': 'chapter-list',
						'HX-Target': 'chapter-list',
						'HX-Current-URL': `${this.baseUrl}${pageUrl}`,
						Accept: 'text/html, */*'
					}
				});
				const html = await res.text();
				const $ = cheerio.load(html);

				$('a[href*="/chapter-"]').each((_, a) => {
					const href = $(a).attr('href') || '';
					if (!href) return;
					const id = this.cleanId(href);
					if (seen.has(id)) return;
					seen.add(id);

					const numAttr = $(a)
						.closest('[data-chapter-number]')
						.attr('data-chapter-number');
					const title =
						$(a).find('span').first().text().trim() ||
						$(a).text().replace(/\s+/g, ' ').trim() ||
						`Chapter ${numAttr || ''}`;
					const number =
						numAttr && !isNaN(parseFloat(numAttr))
							? parseFloat(numAttr)
							: this.parseChapterNumber(title || id);
					const date =
						$(a).find('time').attr('datetime')?.slice(0, 10) ||
						$(a).find('time').text().trim() ||
						'';

					chapters.push({
						id,
						title: title || `Chapter ${number}`,
						number: number || chapters.length + 1,
						date
					});
				});
			} catch (e) {
				console.warn('[rawkuma] chapter_list ajax failed', e);
			}
		}

		// Fallback: parse dari halaman detail jika ajax gagal
		if (!chapters.length) {
			// re-fetch not needed — caller already has detail html only if we pass $
			// leave empty; caller can still open chapter if known
		}

		// newest first
		chapters.sort((a, b) => (b.number || 0) - (a.number || 0));
		return chapters;
	}

	// ── Pages ────────────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
		const path = this.cleanId(chapterId);
		if (!/\/chapter-/i.test(path)) {
			console.error('[rawkuma] getChapterPages → not a chapter path:', chapterId);
			return [];
		}

		try {
			const html = await this.fetchHtml(path.endsWith('/') ? path : `${path}/`);
			const $ = cheerio.load(html);
			const urls: string[] = [];
			const seen = new Set<string>();

			// gallery-dl style: <img src='...'>
			$('img').each((_, img) => {
				let src =
					$(img).attr('src') ||
					$(img).attr('data-src') ||
					$(img).attr('data-lazy-src') ||
					'';
				if (!src || src.startsWith('data:')) return;
				src = this.absUrl(src.split('?')[0]);
				if (!/^https?:\/\//i.test(src)) return;
				// skip UI assets
				if (
					/logo|icon|avatar|emoji|gravatar|svg|spinner|banner|ads|wp-content\/themes/i.test(
						src
					)
				) {
					return;
				}
				// prefer chapter CDN / uploads pages
				if (
					!/kuma\.kyut\.dev|\/scr\/|wp-content\/uploads|\/chapter/i.test(src) &&
					!/\.(jpe?g|png|webp)$/i.test(src)
				) {
					return;
				}
				if (seen.has(src)) return;
				seen.add(src);
				urls.push(src);
			});

			console.log(`[rawkuma] ${urls.length} pages → ${path}`);
			return urls;
		} catch (e) {
			console.error('[rawkuma] getChapterPages failed', path, e);
			return [];
		}
	}
}
