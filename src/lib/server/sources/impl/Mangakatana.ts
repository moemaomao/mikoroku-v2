import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * mangakatana.com adapter (HTML scrape)
 *
 * List   : /latest  |  /latest/page/{n}   (~20/page → ambil 2 page utk 24)
 * Search : /?search=QUERY&search_by=m_name
 * Detail : /manga/{slug}.{id}
 * Chapter: /manga/{slug}.{id}/c{num}
 * Pages  : var thzq=['url1','url2',...]  di HTML chapter
 *
 * ID format:
 *   manga   : "/manga/{slug}.{id}"
 *   chapter : "/manga/{slug}.{id}/c{num}"
 */
export class MangaKatanaSource extends BaseSource {
	id = 'mangakatana';
	name = 'MangaKatana';
	baseUrl = 'https://mangakatana.com';

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

	private parseChapterNumber(text: string): number {
		const m = String(text).match(/(?:chapter|chap|ch\.?|c)\s*(\d+(?:\.\d+)?)/i);
		if (m) return parseFloat(m[1]);
		const n = String(text).match(/(\d+(?:\.\d+)?)/);
		return n ? parseFloat(n[1]) : 0;
	}

	// ── List parser ──────────────────────────────────────────────────────────

	private parseCards($: cheerio.CheerioAPI): Manga[] {
		const out: Manga[] = [];
		const seen = new Set<string>();

		$('#book_list .item[data-id], #book_list .item').each((_, el) => {
			const $el = $(el);
			const a = $el.find('h3.title a, .title a, .wrap_img a').first();
			const href = a.attr('href') || '';
			if (!href || !/\/manga\//i.test(href)) return;

			const id = this.cleanId(href);
			// skip chapter links
			if (/\/c[\d.]+$/i.test(id) || /\/fc$/i.test(id)) return;
			if (!/^\/manga\/[^/]+$/.test(id)) return;
			if (seen.has(id)) return;
			seen.add(id);

			let title = (a.text() || a.attr('title') || '').replace(/\s+/g, ' ').trim();
			// hapus suffix " - Update chapter X"
			title = title.replace(/\s*-\s*Update chapter\s+\d+(?:\.\d+)?\s*$/i, '').trim();
			if (!title) return;

			let cover =
				$el.find('picture source').attr('srcset') ||
				$el.find('img').attr('src') ||
				$el.find('img').attr('data-src') ||
				'';
			cover = this.absUrl((cover || '').split('?')[0]);
			// prefer webp from source if present
			const webp = $el.find('picture source[type="image/webp"]').attr('srcset');
			if (webp) cover = this.absUrl(webp.split('?')[0]);

			const statusText = $el.find('.status').text().toLowerCase();
			const status = /complete|finished|end/.test(statusText)
				? 'Completed'
				: 'Ongoing';

			const chText =
				$el.find('.chapters a, .chapter a, h3.title span').text() ||
				$el.text().match(/chapter\s+\d+(?:\.\d+)?/i)?.[0] ||
				'';
			const latestChapter = this.parseChapterNumber(chText) || undefined;

			out.push({
				id,
				sourceId: this.id,
				title,
				cover,
				type: 'manga',
				status,
				latestChapter
			});
		});

		return out;
	}

	private async fetchListPages(
		paths: string[]
	): Promise<Manga[]> {
		const seen = new Set<string>();
		const merged: Manga[] = [];

		for (const path of paths) {
			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			for (const m of this.parseCards($)) {
				if (seen.has(m.id)) continue;
				seen.add(m.id);
				merged.push(m);
			}
			if (merged.length >= this.PER_PAGE) break;
		}

		return merged.slice(0, this.PER_PAGE);
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

	async getLatestManga(
		page: number,
		_opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			// site ~20/page → ambil 2 halaman site per "page" app
			const start = (p - 1) * 2 + 1;
			const paths = [
				start <= 1 ? `/latest` : `/latest/page/${start}`,
				`/latest/page/${start + 1}`
			];

			const list = await this.fetchListPages(paths);
			console.log(`[mangakatana] latest page=${p} → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[mangakatana] getLatestManga', e);
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
			const path = `/?search=${encodeURIComponent(q)}&search_by=m_name`;
			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			const list = this.parseCards($).slice(0, this.PER_PAGE);
			console.log(`[mangakatana] search "${q}" → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[mangakatana] searchManga', e);
			return [];
		}
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const path = this.cleanId(mangaId);
		if (!/\/manga\//i.test(path)) {
			throw new Error(`Invalid mangakatana id: ${mangaId}`);
		}

		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);

		let title =
			$('h1.heading, h1').first().text().trim() ||
			$('meta[property="og:title"]').attr('content') ||
			$('title').text().split('|')[0] ||
			path;
		title = title.replace(/\s*[-|].*MangaKatana.*$/i, '').trim();

		let cover =
			$('meta[property="og:image"]').attr('content') ||
			$('.cover img, .media img, picture source').attr('srcset') ||
			$('.cover img, .media img').attr('src') ||
			'';
		cover = this.absUrl((cover || '').split('?')[0]);

		// Alternative titles
		let alt = '';
		$('.d-table .d-row, .meta .row, div').each((_, el) => {
			const $el = $(el);
			const label = $el.find('.d-cell-small, .label').first().text();
			if (/alt name/i.test(label) || /alt name/i.test($el.text().slice(0, 40))) {
				const val =
					$el.find('.alt_name, .value').text().trim() ||
					$el.text().replace(/Alt name\(s\)\s*:?/i, '').trim();
				if (val && val.length > 2) alt = val.replace(/\s+/g, ' ').trim();
			}
		});
		if (!alt) {
			alt = $('.alt_name').text().replace(/\s+/g, ' ').trim();
		}

		// Status
		let status = 'Ongoing';
		$('.status, .value.status').each((_, el) => {
			const t = $(el).text().toLowerCase();
			if (/complete|finished|end/.test(t)) status = 'Completed';
			else if (/ongoing|publishing/.test(t)) status = 'Ongoing';
		});

		// Authors
		const authors: string[] = [];
		$('a[href*="/author/"], .author a').each((_, a) => {
			const n = $(a).text().trim();
			if (n && !authors.includes(n)) authors.push(n);
		});

		// Genres
		const genres: string[] = [];
		$('a[href*="/genre/"]').each((_, a) => {
			const g = $(a).text().trim();
			if (g && !genres.includes(g) && g.length < 40) genres.push(g);
		});

		// Description / summary
		const synopsis =
			$('.summary p, .summary, #summary, .desc').text().replace(/\s+/g, ' ').trim() ||
			$('meta[name="description"]').attr('content') ||
			'';

		// Chapters
		const chapters: Chapter[] = [];
		const seen = new Set<string>();

		$('.chapters a[href*="/c"], table.chapters a[href*="/c"], a[href*="/c"]').each(
			(_, a) => {
				const $a = $(a);
				const href = $a.attr('href') || '';
				if (!href || !/\/c[\d.]+/i.test(href)) return;
				const id = this.cleanId(href);
				if (seen.has(id)) return;
				seen.add(id);

				const chTitle =
					$a.text().replace(/\s+/g, ' ').trim() ||
					`Chapter ${this.parseChapterNumber(id)}`;
				const number = this.parseChapterNumber(chTitle) || this.parseChapterNumber(id);
				const date =
					$a.closest('tr, li, div').find('.update_time, .date, time').text().trim() ||
					'';

				chapters.push({
					id,
					title: chTitle,
					number: number || chapters.length + 1,
					date
				});
			}
		);

		// site lists newest first
		const latestUpdate = chapters[0]?.date || '';
		const latestChapter = chapters[0]?.number;

		const description = [
			alt && `Alternative: ${alt}`,
			latestUpdate && `Latest update: ${latestUpdate}`,
			latestChapter != null && `Latest chapter: ${latestChapter}`,
			synopsis
		]
			.filter(Boolean)
			.join('\n\n');

		return {
			id: path,
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
		if (!/\/c[\d.]+/i.test(path)) {
			console.error('[mangakatana] getChapterPages → not a chapter path:', chapterId);
			return [];
		}

		try {
			const html = await this.fetchHtml(path);
			const urls: string[] = [];
			const seen = new Set<string>();

			// Primary: var thzq=['url',...]
			const thzqMatch = html.match(/var\s+thzq\s*=\s*\[([\s\S]*?)\];/);
			if (thzqMatch) {
				const re = /['"](https?:\/\/[^'"]+)['"]/g;
				let m: RegExpExecArray | null;
				while ((m = re.exec(thzqMatch[1])) !== null) {
					const u = m[1].replace(/\\u0026/g, '&');
					if (seen.has(u)) continue;
					seen.add(u);
					urls.push(u);
				}
			}

			// Fallback: ytaw atau img data-src
			if (!urls.length) {
				const ytaw = html.match(/var\s+ytaw\s*=\s*\[([\s\S]*?)\];/);
				if (ytaw) {
					const re = /['"](https?:\/\/[^'"]+)['"]/g;
					let m: RegExpExecArray | null;
					while ((m = re.exec(ytaw[1])) !== null) {
						const u = m[1];
						if (seen.has(u)) continue;
						seen.add(u);
						urls.push(u);
					}
				}
			}

			if (!urls.length) {
				const $ = cheerio.load(html);
				$('img[data-src], img[src]').each((_, img) => {
					let src =
						$(img).attr('data-src') ||
						$(img).attr('src') ||
						'';
					if (!src || src === '#' || src.startsWith('data:')) return;
					src = this.absUrl(src);
					if (!/^https?:\/\//i.test(src)) return;
					if (/logo|icon|avatar|static\/img/i.test(src)) return;
					if (seen.has(src)) return;
					seen.add(src);
					urls.push(src);
				});
			}

			console.log(`[mangakatana] ${urls.length} pages → ${path}`);
			return urls;
		} catch (e) {
			console.error('[mangakatana] getChapterPages failed', path, e);
			return [];
		}
	}
}
