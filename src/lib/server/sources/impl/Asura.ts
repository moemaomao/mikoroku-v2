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

	/** Ambil value di sebelah label (Status / Type / Rating) */
	private getLabeledValue($: cheerio.CheerioAPI, label: string): string {
		let value = '';
		$('div').each((_, el) => {
			const $el = $(el);
			const text = $el.text().replace(/\s+/g, ' ').trim();
			// Label murni di elemen kecil
			if (text.toLowerCase() === label.toLowerCase()) {
				const next = $el.next();
				if (next.length) {
					value = next.text().replace(/\s+/g, ' ').trim();
					return false;
				}
				// fallback: parent berisi "Label | value"
				const parentText = $el.parent().text().replace(/\s+/g, ' ').trim();
				const m = parentText.match(new RegExp(`${label}\\s+(.+)`, 'i'));
				if (m) value = m[1].split(/\s{2,}/)[0].trim();
			}
		});
		return value;
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

			// Coba deteksi type dari badge di card (kalau ada)
			let type = 'manhwa';
			const cardText = $card.text().toLowerCase();
			if (cardText.includes('manhua')) type = 'manhua';
			else if (cardText.includes('manga') && !cardText.includes('manhwa')) type = 'manga';

			if (title && id) {
				res.push({
					id,
					title,
					cover,
					sourceId: this.id,
					type
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
    let list = this.parseCards($);

    if (list.length < 24) {
        try {
            const nextPage = page + 1;
            const nextHtml = await this.fetchHtml(`/browse?page=${nextPage}`);
            const $next = cheerio.load(nextHtml);
            const nextList = this.parseCards($next);
            
            list = [...list, ...nextList];
        } catch (e) {
            console.error('[Asura] failed to fetch extra page for 24 items', e);
        }
    }

    return list.slice(0, 24);
}

	async searchManga(query: string, opts?: { page?: number }): Promise<Manga[]> {
    const q = (query || '').trim();
    const page = Math.max(1, opts?.page || 1);
    
    if (!q) return this.getLatestManga(page);

    const encoded = encodeURIComponent(q);
    const html = await this.fetchHtml(`/browse?search=${encoded}&page=${page}`);
    const $ = cheerio.load(html);
    let list = this.parseCards($);

    if (list.length < 24 && list.length > 0) {
        try {
            const nextPage = page + 1;
            const nextHtml = await this.fetchHtml(`/browse?search=${encoded}&page=${nextPage}`);
            const $next = cheerio.load(nextHtml);
            const nextList = this.parseCards($next);
            
            list = [...list, ...nextList];
        } catch (e) {
            console.error('[Asura] failed to fetch extra search pages', e);
        }
    }

    return list.slice(0, 24);
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

		// Title
		const title =
			$('h1').first().text().trim() ||
			$('title')
				.text()
				.replace(/\s*\|?\s*Asura Scans.*$/i, '')
				.trim();

		// Cover
		let cover =
			$('img[src*="asura-images/covers/"]').first().attr('src') ||
			$('meta[property="og:image"]').attr('content') ||
			'';
		cover = this.absUrl(cover);

		// Synopsis
		let synopsis =
			$('.summary__content, .summary, .description, .synopsis, .about, .series-description')
				.first()
				.text()
				.trim() ||
			$('meta[name="description"]').attr('content')?.trim() ||
			'';

		// Status
		let status = this.getLabeledValue($, 'Status') || 'Ongoing';
		status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
		if (status.toLowerCase().includes('complet')) status = 'Completed';
		else if (status.toLowerCase().includes('ongoing') || status.toLowerCase().includes('on-going'))
			status = 'Ongoing';

		// Type (manhwa / manhua / manga) — penting untuk badge
		let type = this.getLabeledValue($, 'Type').toLowerCase() || 'manhwa';
		if (!['manhwa', 'manhua', 'manga'].includes(type)) {
			type = 'manhwa';
		}

		// Rating (otomatis dari source, contoh: 8.5)
		let rating = '0.0';
		const ratingLabel = this.getLabeledValue($, 'Rating');
		if (ratingLabel) {
			const m = ratingLabel.match(/(\d+(?:\.\d+)?)/);
			if (m) {
				const val = parseFloat(m[1]);
				// Asura pakai skala 10
				if (val >= 0 && val <= 10) rating = val.toFixed(1);
			}
		}
		// Fallback: cari pola "8.5" di dekat kata Rating
		if (rating === '0.0') {
			const bodyText = $('body').text();
			const m = bodyText.match(/Rating\s+(\d+(?:\.\d+)?)/i);
			if (m) {
				const val = parseFloat(m[1]);
				if (val >= 0 && val <= 10) rating = val.toFixed(1);
			}
		}

		// Genres
		const genres: string[] = [];
		$('a[href*="genres="]').each((_, el) => {
			const g = $(el).text().trim();
			if (g && !genres.includes(g)) genres.push(g);
		});

		// Authors
		const authors: string[] = [];
		$('a[href*="author="]').each((_, el) => {
			const a = $(el).text().trim();
			if (a && !authors.includes(a)) authors.push(a);
		});
		// Artist kadang terpisah
		$('a[href*="artist="]').each((_, el) => {
			const a = $(el).text().trim();
			if (a && !authors.includes(a)) authors.push(a);
		});

		// Description + meta (agar UI parseMeta bisa baca Rating)
		const metaLines: string[] = [];
		if (rating !== '0.0') metaLines.push(`Rating: ${rating}`);
		metaLines.push(`Status: ${status}`);
		metaLines.push(`Type: ${type}`);
		const description = [...metaLines, synopsis].filter(Boolean).join('\n');

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

			// Nomor dari URL (paling akurat)
			const numFromUrl = id.match(/\/chapter\/(\d+(?:\.\d+)?)/i);
			let number = numFromUrl ? parseFloat(numFromUrl[1]) : NaN;

			let raw = $a.text().replace(/\s+/g, ' ').trim();

			// Skip navigasi
			const lower = raw.toLowerCase();
			if (['last chapter', 'next chapter', 'previous chapter'].includes(lower)) return;

			// Date
			let date = '';
			const dateMatch = raw.match(
				/((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s*\d{4}|\d+\s*(?:hour|day|week|month|year)s?\s*ago|yesterday|today|last\s+(?:week|month|year))\s*$/i
			);
			if (dateMatch) {
				date = dateMatch[1].trim();
				raw = raw.slice(0, dateMatch.index).trim();
			}

			// Bersihkan sisa relative time
			raw = raw
				.replace(/\s*\d+\s*(hour|day|week|month|year)s?\s*ago\s*$/i, '')
				.replace(/\s*(yesterday|today)\s*$/i, '')
				.replace(/\s*last\s+(week|month|year)\s*$/i, '')
				.trim();

			// "First Chapter" → chapter 0 atau 1
			if (lower === 'first chapter' || lower.includes('first chapter')) {
				if (Number.isNaN(number)) number = 0;
				raw = number === 0 ? 'Chapter 0' : `Chapter ${number}`;
			}

			// Fallback nomor dari judul
			if (Number.isNaN(number)) {
				const numFromTitle = raw.match(/chapter\s*(\d+(?:\.\d+)?)/i);
				number = numFromTitle ? parseFloat(numFromTitle[1]) : i + 1;
			}

			const chTitle = `Chapter ${number}`;

			chapters.push({
				id,
				title: chTitle,
				number,
				date
			});
		});

		// Sort newest first (biar tidak acak & konsisten dengan UI)
		chapters.sort((a, b) => b.number - a.number);

		return {
			id: path,
			sourceId: this.id,
			title,
			cover,
			type, // ← penting: manhwa / manhua / manga
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

		// 1) Primary: Astro island props JSON
		const pagesFromProps = this.parseAstroPages(html);
		if (pagesFromProps.length > 0) return pagesFromProps;

		// 2) Fallback: img tags
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

	private parseAstroPages(html: string): string[] {
		const pagesKey = html.indexOf('&quot;pages&quot;');
		if (pagesKey === -1) {
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