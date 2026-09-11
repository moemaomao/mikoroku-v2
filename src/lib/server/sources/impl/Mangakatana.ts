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

// ── List parser ──────────────────────────────────────────────────────────

private parseCards($: cheerio.CheerioAPI, rawHtml?: string): Manga[] {
	const out: Manga[] = [];
	const seen = new Set<string>();

	const push = (
		href: string,
		title: string,
		cover: string,
		statusText = '',
		chText = ''
	) => {
		if (!href || !/\/manga\//i.test(href)) return;
		const id = this.cleanId(href);
		// Hanya terima path manga murni: /manga/slug.id
		if (!/^\/manga\/[^/]+$/.test(id)) return;
		if (seen.has(id)) return;
		seen.add(id);

		title = (title || '').replace(/\s+/g, ' ').trim();
		title = title.replace(/\s*-\s*Update chapter\s+\d+(?:\.\d+)?\s*$/i, '').trim();
		if (!title) return;

		const status = /complete|finished|end/i.test(statusText)
			? 'Completed'
			: 'Ongoing';

		out.push({
			id,
			sourceId: this.id,
			title,
			cover: this.absUrl((cover || '').split('?')[0]),
			type: 'manga',
			status,
			latestChapter: this.parseChapterNumber(chText) || undefined
		});
	};

	// Selector utama yang stabil
	$('#book_list .item[data-id]').each((_, el) => {
		const $el = $(el);
		const a = $el.find('h3.title a, .title a, .wrap_img a').first();
		const href = a.attr('href') || '';
		const title = a.text() || a.attr('title') || '';
		const cover =
			$el.find('picture source[type="image/webp"]').attr('srcset') ||
			$el.find('picture source').attr('srcset') ||
			$el.find('img').attr('src') ||
			$el.find('img').attr('data-src') ||
			'';
		const statusText = $el.find('.status').text();
		const chText =
			$el.find('.last_chap a, .chapters a, .chapter a, h3.title span').text() || '';
		push(href, title, cover, statusText, chText);
	});

	// Regex fallback (jika cheerio gagal)
	if (!out.length && rawHtml) {
		const re =
			/<div class="item"[^>]*data-id="\d+"[^>]*>[\s\S]*?href="(https?:\/\/mangakatana\.com\/manga\/[^"]+)"[\s\S]*?(?:srcset|src)="(https?:\/\/mangakatana\.com\/imgs\/[^"]+)"[\s\S]*?<h3 class="title">\s*<a[^>]*>([^<]+)/gi;
		let m: RegExpExecArray | null;
		while ((m = re.exec(rawHtml)) !== null) {
			push(m[1], m[3], m[2]);
		}
	}

	return out;
}

private async fetchListPages(paths: string[]): Promise<Manga[]> {
	const seen = new Set<string>();
	const merged: Manga[] = [];

	for (const path of paths) {
		try {
			const html = await this.fetchHtml(path);
			if (!html || html.length < 500) {
				console.warn('[mangakatana] empty html', path);
				continue;
			}
			if (/just a moment|cf-browser-verification|challenge-platform/i.test(html)) {
				console.error('[mangakatana] Cloudflare challenge', path);
				continue;
			}
			const $ = cheerio.load(html);
			for (const m of this.parseCards($, html)) {
				if (seen.has(m.id)) continue;
				seen.add(m.id);
				merged.push(m);
			}
		} catch (e) {
			console.warn('[mangakatana] fetch page failed', path, e);
		}
	}

	return merged.slice(0, this.PER_PAGE);
}

async getLatestManga(
	page: number,
	_opts?: { lang?: string; type?: string }
): Promise<Manga[]> {
	try {
		const p = Math.max(1, Number(page) || 1);

		// Pakai /page/n (lebih stabil) + fallback /latest/page/n
		const paths =
			p === 1
				? [`/`, `/latest`]
				: [`/page/${p}`, `/latest/page/${p}`];

		let list = await this.fetchListPages(paths);

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
		const path =
			`/?search=${encodeURIComponent(q)}&search_by=m_name` +
			(page > 1 ? `&page=${page}` : '');
		const html = await this.fetchHtml(path);
		if (/just a moment|cf-browser-verification|challenge-platform/i.test(html)) {
			console.error('[mangakatana] Cloudflare challenge (search)');
			return [];
		}
		const $ = cheerio.load(html);
		const list = this.parseCards($, html).slice(0, this.PER_PAGE);
		console.log(`[mangakatana] search "${q}" page=${page} → ${list.length} items`);
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

	// ── Meta table (.d-row-small) ──────────────────────────────────────────
	const meta: Record<string, string> = {};
	$('li.d-row-small, .d-row-small').each((_, el) => {
		const $el = $(el);
		const label = $el
			.find('.d-cell-small.label, .label')
			.first()
			.text()
			.replace(/:\s*$/, '')
			.trim()
			.toLowerCase();
		const value = $el
			.find('.d-cell-small.value, .value')
			.first()
			.text()
			.replace(/\s+/g, ' ')
			.trim();
		if (label) meta[label] = value;
	});

	const alt =
		meta['alt name(s)'] ||
		meta['alt name'] ||
		$('.alt_name').text().replace(/\s+/g, ' ').trim() ||
		'';

	let status = 'Ongoing';
	const statusRaw = (meta['status'] || $('.value.status').text() || '').toLowerCase();
	if (/complete|finished|end/.test(statusRaw)) status = 'Completed';
	else if (/ongoing|publishing/.test(statusRaw)) status = 'Ongoing';

	const latestChapterLabel = meta['latest chapter(s)'] || meta['latest chapter'] || '';
	const updateAt = meta['update at'] || meta['updated'] || meta['last update'] || '';

	// Rating (kalau situs menampilkan)
	let rating = '';
	const ratingKeys = Object.keys(meta).filter((k) =>
		/rating|score|rate/.test(k)
	);
	if (ratingKeys.length) {
		rating = meta[ratingKeys[0]];
	}
	if (!rating) {
		const starText =
			$('.uk-rating, .rating, [class*="star"], [data-score]')
				.first()
				.attr('data-score') ||
			$('.uk-rating, .rating, [class*="score"]').first().text().trim();
		if (starText && /\d/.test(starText)) rating = starText.replace(/\s+/g, ' ');
	}
	// JSON-LD aggregateRating fallback
	if (!rating) {
		const ld = html.match(
			/"aggregateRating"\s*:\s*\{[^}]*"ratingValue"\s*:\s*"?([\d.]+)"?/i
		);
		if (ld) rating = ld[1];
	}

	// Authors
	const authors: string[] = [];
	$('a.author, a[href*="/author/"]').each((_, a) => {
		const n = $(a).text().trim();
		if (n && !authors.includes(n)) authors.push(n);
	});
	if (!authors.length && meta['author(s) / artist(s)']) {
		meta['author(s) / artist(s)']
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
			.forEach((n) => {
				if (!authors.includes(n)) authors.push(n);
			});
	}

	// Genres
	const genres: string[] = [];
	$('.genres a, a[href*="/genre/"]').each((_, a) => {
		const g = $(a).text().trim();
		if (g && !genres.includes(g) && g.length < 40) genres.push(g);
	});

	const synopsis =
		$('.summary p, .summary, #summary, .desc')
			.text()
			.replace(/\s+/g, ' ')
			.trim() ||
		$('meta[name="description"]').attr('content') ||
		'';

	// Chapters
	// Chapters — selector ketat, jangan pakai a[href*="/c"] global
const chapters: Chapter[] = [];
const seen = new Set<string>();

$('.chapters a[href*="/manga/"][href*="/c"]').each((_, a) => {
	const $a = $(a);
	const href = $a.attr('href') || '';
	if (!href || !/\/c[\d.]+/i.test(href)) return;

	const id = this.cleanId(href);
	if (seen.has(id)) return;
	seen.add(id);

	const chTitle =
		$a.text().replace(/\s+/g, ' ').trim() ||
		`Chapter ${this.parseChapterNumber(id)}`;
	const number =
		this.parseChapterNumber(chTitle) || this.parseChapterNumber(id);
	const date =
		$a
			.closest('tr, li, div')
			.find('.update_time, .date, time')
			.text()
			.trim() || '';

	chapters.push({
		id,
		title: chTitle,
		number: number || chapters.length + 1,
		date
	});
});

	const latestChapter =
		this.parseChapterNumber(latestChapterLabel) ||
		chapters[0]?.number;
	const latestUpdate = updateAt || chapters[0]?.date || '';

	const description = [
		alt && `Alternative: ${alt}`,
		latestUpdate && `Latest update: ${latestUpdate}`,
		latestChapter != null && `Latest chapter: ${latestChapter}`,
		rating && `Rating: ${rating}`,
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
