import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * Komiku (komiku.org) adapter – Manga / Manhwa / Manhua Bahasa Indonesia
 */
export class KomikuSource extends BaseSource {
	id = 'komiku';
	name = 'Komiku';
	baseUrl = 'https://komiku.org';

	/** API base (HTMX load) */
	private readonly apiBase = 'https://api.komiku.org';

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
				// ignore
			}
		}
		if (!id.startsWith('/')) id = `/${id}`;
		// hapus trailing slash + query
		id = id.replace(/\/+$/, '').split('?')[0];
		return id;
	}

	private normalizeTitle(raw: string): string {
		if (!raw) return '';
		return raw
			.trim()
			.replace(/\s+/g, ' ')
			.replace(/\s*[-|]\s*Komiku.*$/i, '')
			.replace(/^Baca\s+(Komik\s+)?/i, '')
			.replace(/^Komik\s+/i, '')
			.trim();
	}

	private parseCards($: cheerio.CheerioAPI): Manga[] {
		const mangas: Manga[] = [];
		const seen = new Set<string>();

		$('.bge').each((_, el) => {
			const $el = $(el);

			const a = $el.find('.kan a[href*="/manga/"]').first().length
				? $el.find('.kan a[href*="/manga/"]').first()
				: $el.find('a[href*="/manga/"]').first();

			const href = a.attr('href') || '';
			if (!href || !href.includes('/manga/')) return;

			const id = this.cleanId(href);
			if (seen.has(id)) return;
			seen.add(id);

			const rawTitle =
				$el.find('.kan h3').first().text() ||
				$el.find('h3').text() ||
				a.find('h3').text() ||
				a.text() ||
				a.attr('title') ||
				'';
			const title = this.normalizeTitle(rawTitle);
			if (!title || title.toLowerCase() === 'untitled') return;

			const cover =
				$el.find('.bgei img').attr('src') ||
				$el.find('.bgei img').attr('data-src') ||
				$el.find('img').attr('src') ||
				'';

			const cardText = $el.text().toLowerCase();
			let type: 'manga' | 'manhwa' | 'manhua' = 'manga';
			if (cardText.includes('manhwa')) type = 'manhwa';
			else if (cardText.includes('manhua')) type = 'manhua';

			const badgeText = $el.find('.tpe, .status, span, .tpe1_inf').text().toLowerCase();
			let status = 'Ongoing';
			if (/\b(tamat|end|completed|complete)\b/.test(badgeText) && !/\b(ongoing)\b/.test(badgeText)) {
				status = 'Completed';
			}

			mangas.push({
				id,
				title,
				cover: this.absUrl(cover),
				sourceId: this.id,
				status,
				type
			} as Manga);
		});

		return mangas;
	}

	// ── List / Search ────────────────────────────────────────────────────────

	async getLatestManga(page: number): Promise<Manga[]> {
		const mangas: Manga[] = [];
		const seen = new Set<string>();

		// API selalu return 10 item per page.
		// Kita ambil 3 halaman supaya cukup untuk target 24 item.
		const startPage = (page - 1) * 3 + 1;
		const pagesToFetch = [startPage, startPage + 1, startPage + 2];

		for (const p of pagesToFetch) {
			const path =
				p <= 1 ? `${this.apiBase}/manga/` : `${this.apiBase}/manga/page/${p}/`;

			try {
				const html = await this.fetchHtml(path);
				const $ = cheerio.load(html);
				const items = this.parseCards($);

				for (const item of items) {
					if (!seen.has(item.id)) {
						seen.add(item.id);
						mangas.push(item);
					}
				}
			} catch (e) {
				console.error(`[komiku] failed fetch page ${p}:`, e);
			}
		}

		return mangas.slice(0, this.PER_PAGE);
	}

	async searchManga(query: string): Promise<Manga[]> {
		const q = (query || '').trim();
		if (!q) return [];

		const path = `${this.apiBase}/manga/?s=${encodeURIComponent(q)}`;
		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);
		const mangas = this.parseCards($);

		return mangas.slice(0, this.PER_PAGE);
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const path = this.cleanId(
			mangaId.startsWith('/manga/') ? mangaId : `/manga/${mangaId.replace(/^\//, '')}`
		);
		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);

		// Title
		let title =
			$('h1').first().text().trim() ||
			$('table.inftable td:contains("Judul:")').next().text().trim() ||
			$('meta[property="og:title"]').attr('content') ||
			path;
		title = this.normalizeTitle(title);

		// Cover
		let cover =
			$('.ims img').attr('src') ||
			$('.ims img').attr('data-src') ||
			$('img[itemprop="image"]').attr('src') ||
			$('meta[property="og:image"]').attr('content') ||
			'';
		cover = this.absUrl(cover);

		// Sinopsis
		let description = '';
		$('h2').each((_, h2) => {
			if ($(h2).text().toLowerCase().includes('sinopsis')) {
				description = $(h2)
					.nextAll('p')
					.first()
					.text()
					.replace(/\s+/g, ' ')
					.trim();
			}
		});
		if (!description) {
			description =
				$('.sinopsis, [itemprop="description"]')
					.first()
					.text()
					.replace(/\s+/g, ' ')
					.trim() || '';
		}

		// Status
		let status = 'Ongoing';
		$('table.inftable tr').each((_, tr) => {
			const label = $(tr).find('td').first().text().toLowerCase();
			if (label.includes('status')) {
				const val = $(tr).find('td').last().text().trim().toLowerCase();
				if (/complete|tamat|end|finish/.test(val)) status = 'Completed';
			}
		});

		// Authors
		const authors: string[] = [];
		$('table.inftable tr').each((_, tr) => {
			const label = $(tr).find('td').first().text().toLowerCase();
			if (label.includes('author') || label.includes('pengarang')) {
				const val = $(tr).find('td').last().text().trim();
				if (val) authors.push(val);
			}
		});

		// Genres
		const genres: string[] = [];
		$('table.inftable tr').each((_, tr) => {
			const label = $(tr).find('td').first().text().toLowerCase();
			if (label.includes('genre') || label.includes('tema')) {
				$(tr)
					.find('td')
					.last()
					.find('a')
					.each((__, a) => {
						const t = $(a).text().trim();
						if (t && !genres.includes(t)) genres.push(t);
					});
				if (genres.length === 0) {
					const txt = $(tr).find('td').last().text().trim();
					txt.split(/,|\//).forEach((g) => {
						const t = g.trim();
						if (t && !genres.includes(t)) genres.push(t);
					});
				}
			}
		});
		$('.genre a').each((_, a) => {
			const t = $(a).text().trim();
			if (t && !genres.includes(t)) genres.push(t);
		});

		// Chapters
		const chapters: Chapter[] = [];
		const seen = new Set<string>();

		$('#Daftar_Chapter tr, table#Daftar_Chapter tr, .bixbox .listing tr, table.ttingkat tr').each(
			(_, el) => {
				const $el = $(el);
				const $a = $el.find('a[href*="chapter"], a[href*="ch-"], a[href*="/ch/"]').first();
				const href = $a.attr('href') || '';
				if (!href) return;

				const id = this.cleanId(href);
				if (seen.has(id)) return;
				seen.add(id);

				const chapterTitle =
					$a.text().replace(/\s+/g, ' ').trim() ||
					$a.attr('title') ||
					`Chapter ${chapters.length + 1}`;

				const numMatch =
	               chapterTitle.match(/(?:chapter|ch\.?|episode|ep\.?)\s*(\d+(?:\.\d+)?)/i) ||
	               chapterTitle.match(/(\d+(?:\.\d+)?)/);

                const number = numMatch?.[1] ? parseFloat(numMatch[1]) : chapters.length + 1;
				const date = $el.find('.tanggalseries, .date, td:last-child').text().trim() || '';

				chapters.push({ id, title: chapterTitle, number, date });
			}
		);

		// Urutkan dari chapter kecil ke besar (penting untuk next/prev)
		chapters.sort((a, b) => a.number - b.number);

		return {
			id: path,
			sourceId: this.id,
			title,
			cover,
			description,
			authors,
			genres,
			status,
			chapters,
			type: 'manga',
			latestChapter: chapters.length ? chapters[chapters.length - 1].number : undefined
		};
	}

	// ── Pages ────────────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
		const path = this.cleanId(chapterId.startsWith('/') ? chapterId : `/${chapterId}`);
		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);

		const images: string[] = [];
		const seen = new Set<string>();

		// Selector utama
		$('#Baca_Komik img, #readerarea img, .reader img, .img-land img, .post-reading img').each(
			(_, img) => {
				let src =
					$(img).attr('data-src') ||
					$(img).attr('data-lazy-src') ||
					$(img).attr('src') ||
					'';
				src = this.absUrl(src);

				if (
					src &&
					!seen.has(src) &&
					!/logo|icon|avatar|spinner|ads|lazy\.jpg|komikuplus|promo|asset\/img|thumb|placeholder/i.test(
						src
					)
				) {
					seen.add(src);
					images.push(src);
				}
			}
		);

		// Fallback kalau selector utama kosong
		if (images.length === 0) {
			$('img').each((_, img) => {
				let src = $(img).attr('data-src') || $(img).attr('src') || '';
				src = this.absUrl(src);
				if (
					src &&
					!seen.has(src) &&
					/\.(jpg|jpeg|png|webp)/i.test(src) &&
					!/logo|icon|avatar|spinner|ads|lazy\.jpg|komikuplus|promo|asset\/img|thumb|placeholder/i.test(
						src
					)
				) {
					seen.add(src);
					images.push(src);
				}
			});
		}

		return images;
	}
}