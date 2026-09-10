import { BaseSource } from '../BaseSource';
import type { Manga, MangaDetails, Chapter } from '../types';
import * as cheerio from 'cheerio';

/**
 * AsuraComic Adapter (refactored for current asurascans.com)
 *
 * Site rebuilt (Project Asura Revival):
 * - Domain: https://asurascans.com
 * - Manga path: /comics/{slug}-{hash}
 * - Chapter path: /comics/{slug}-{hash}/chapter/{n}
 * - Catalog: /browse?page=N  |  Search: /browse?search=...
 * - Pages: Astro island props JSON (primary) + img fallback
 */
export class AsuraSource extends BaseSource {
	id = 'asura';
	name = 'Asura Scans';
	baseUrl = 'https://asurascans.com';

	// ── Helpers ──────────────────────────────────────────────────────────────

	private absUrl(href: string): string {
		if (!href) return '';
		if (href.startsWith('http')) return href;
		if (href.startsWith('//')) return `https:${href}`;
		return `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
	}

	private cleanId(link: string): string {
		// Keep path clean, e.g. /comics/the-indomitable-martial-king-53fc8424
		let id = link.trim();
		if (id.startsWith('http')) {
			try {
				id = new URL(id).pathname;
			} catch {
				/* ignore */
			}
		}
		if (!id.startsWith('/')) id = `/${id}`;
		return id.replace(/\/+$/, '');
	}

	private parseCards($: cheerio.CheerioAPI): Manga[] {
		const res: Manga[] = [];
		const seen = new Set<string>();

		$('div.series-card').each((_, card) => {
			const $card = $(card);
			const a = $card.find('a[href*="/comics/"]').first();
			const href = a.attr('href') || '';
			if (!href || href.includes('/chapter/')) return;

			const id = this.cleanId(href);
			if (seen.has(id)) return;
			seen.add(id);

			// Title: prefer h3, fallback to link text cleaned of chapter/rating noise
			let title = $card.find('h3').first().text().trim();
			if (!title) {
				title = a
					.text()
					.replace(/\s*Chapter\s*\d+.*$/i, '')
					.replace(/\s*\d+\.\d+\s*$/, '')
					.trim();
			}

			const img = $card.find('img').first();
			let cover = img.attr('src') || img.attr('data-src') || '';
			cover = this.absUrl(cover);

			if (title && id) {
				res.push({
					id,
					title,
					cover,
					sourceId: this.id
				});
			}
		});

		return res;
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

	async getLatestManga(page: number): Promise<Manga[]> {
		const path = page <= 1 ? '/browse' : `/browse?page=${page}`;
		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);
		return this.parseCards($);
	}

	async searchManga(query: string): Promise<Manga[]> {
		const encoded = encodeURIComponent(query);
		const html = await this.fetchHtml(`/browse?search=${encoded}`);
		const $ = cheerio.load(html);
		return this.parseCards($);
	}

	// ── Manga Details ────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		let path = mangaId;
		if (!path.startsWith('/comics/') && !path.startsWith('/comics')) {
			path = `/comics/${path.replace(/^\//, '')}`;
		}
		path = this.cleanId(path);

		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);

		const title =
			$('h1').first().text().trim() ||
			$('title')
				.text()
				.replace(/\s*\|?\s*Asura Scans.*$/i, '')
				.trim();

		let cover =
			$('img[src*="asura-images/covers/"]').first().attr('src') ||
			$('meta[property="og:image"]').attr('content') ||
			'';
		cover = this.absUrl(cover);

		const description =
			$('.summary__content, .summary, .description, .synopsis, .about, .series-description')
				.first()
				.text()
				.trim() ||
			$('meta[name="description"]').attr('content')?.trim() ||
			'';

		const status =
			$('div.flex.gap-3.pt-4 span.capitalize').first().text().trim() || 'Ongoing';

		const genres: string[] = [];
		$('a[href*="genres="]').each((_, el) => {
			const g = $(el).text().trim();
			if (g) genres.push(g);
		});

		const authors: string[] = [];
		$('a[href*="author="]').each((_, el) => {
			const a = $(el).text().trim();
			if (a) authors.push(a);
		});

		// Chapters
		const chapters: Chapter[] = [];
		const seen = new Set<string>();

		$('a[href*="/chapter/"]').each((i, el) => {
			const $a = $(el);
			const href = $a.attr('href') || '';
			if (!href) return;

			const id = this.cleanId(href);
			if (seen.has(id)) return;
			seen.add(id);

			let chapterTitle = $a.text().replace(/\s+/g, ' ').trim();
			// Clean relative time / date suffixes
			chapterTitle = chapterTitle
				.replace(/\s+\d+\s+(hour|day|week|month|year)s?\s+ago\s*$/i, '')
				.replace(/\s+last\s+(week|month|year)\s*$/i, '')
				.replace(/\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+,\s*\d{4}\s*$/i, '')
				.replace(/\s+(yesterday|today)\s*$/i, '')
				.trim();

			const lower = chapterTitle.toLowerCase();
			if (['last chapter', 'next chapter', 'previous chapter'].includes(lower)) return;
			if (lower === 'first chapter') chapterTitle = 'Chapter 1';

			const numMatch = id.match(/\/chapter\/(\d+(?:\.\d+)?)/) || chapterTitle.match(/chapter\s*(\d+(?:\.\d+)?)/i);
			const number = numMatch ? parseFloat(numMatch[1]) : i + 1;

			chapters.push({
				id,
				title: chapterTitle || `Chapter ${number}`,
				number,
				date: ''
			});
		});

		// Sort ascending by chapter number (site shows newest first)
		chapters.sort((a, b) => a.number - b.number);

		return {
			id: path,
			sourceId: this.id,
			title,
			cover,
			description,
			authors,
			status,
			genres,
			chapters
		};
	}

	// ── Chapter Pages ────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
		let path = chapterId;
		if (!path.startsWith('/comics/')) {
			path = `/comics/${path.replace(/^\//, '')}`;
		}
		path = this.cleanId(path);

		const html = await this.fetchHtml(path);

		// 1) Primary: Astro island props JSON (entity-escaped)
		const pagesFromProps = this.parseAstroPages(html);
		if (pagesFromProps.length > 0) return pagesFromProps;

		// 2) Fallback: img tags in reader
		const $ = cheerio.load(html);
		const pages: string[] = [];
		const seen = new Set<string>();

		const selectors = [
			"img[src*='asura-images/chapters/']",
			'#readerarea img:not([src*="asura-images/covers/"])',
			'img.w-full.block:not([src*="asura-images/covers/"])',
			'.reading-content img, #chapter-content img, .chapter-content img'
		];

		for (const sel of selectors) {
			$(sel).each((_, img) => {
				let src = $(img).attr('src') || $(img).attr('data-src') || '';
				src = this.absUrl(src);
				if (src && !seen.has(src) && !src.includes('covers/')) {
					seen.add(src);
					pages.push(src);
				}
			});
			if (pages.length > 0) break;
		}

		return pages;
	}

	/**
	 * Parse Astro island props that contain the pages array.
	 * Format roughly: props="...&quot;pages&quot;:..."
	 */
	private parseAstroPages(html: string): string[] {
		const pagesKey = html.indexOf('&quot;pages&quot;');
		if (pagesKey === -1) {
			// Try non-escaped version just in case
			const m = html.match(/"pages"\s*:\s*(\[[\s\S]*?\])/);
			if (m) {
				try {
					return this.extractUrlsFromPagesJson(JSON.parse(m[1]));
				} catch {
					/* ignore */
				}
			}
			return [];
		}

		// Find the nearest props="..." that contains the pages key
		let propsStart = -1;
		let pos = 0;
		while (true) {
			const s = html.indexOf('props="', pos);
			if (s === -1 || s > pagesKey) break;
			propsStart = s + 7;
			pos = s + 1;
		}
		if (propsStart === -1) return [];

		const end = html.indexOf('"', propsStart);
		if (end === -1) return [];

		const raw = html.slice(propsStart, end);
		const decoded = raw
			.replace(/&quot;/g, '"')
			.replace(/&#x27;/g, "'")
			.replace(/&#39;/g, "'")
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&');

		try {
			const data = JSON.parse(decoded);
			if (!data?.pages) return [];
			return this.extractUrlsFromPagesJson(data.pages);
		} catch (e) {
			console.error('Failed to parse Astro pages props', e);
			return [];
		}
	}

	private extractUrlsFromPagesJson(pagesData: any): string[] {
		// Astro often wraps as [1, [ [0, {url, width, height}], ... ]]
		const arr = Array.isArray(pagesData)
			? pagesData[1] ?? pagesData[0] ?? pagesData
			: pagesData;

		if (!Array.isArray(arr)) return [];

		const urls: string[] = [];
		const seen = new Set<string>();

		for (const tup of arr) {
			const po = tup?.[1] ?? tup?.[0] ?? tup;
			if (!po || typeof po !== 'object') continue;

			let u = po.url;
			if (Array.isArray(u)) u = u[1] ?? u[0];
			if (typeof u !== 'string' || !u) continue;

			const url = this.absUrl(u);
			if (!seen.has(url)) {
				seen.add(url);
				urls.push(url);
			}
		}
		return urls;
	}
}
