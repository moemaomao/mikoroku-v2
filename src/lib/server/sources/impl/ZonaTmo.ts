import { BaseSource } from '../BaseSource';
import type { Manga, MangaDetails, Chapter } from '../types';
import * as cheerio from 'cheerio';

/**
 * ZonaTMO (zonatmo.org) adapter
 * Fokus: hanya Últimas subidas
 *
 * Paths:
 * - Latest: /ultimas-subidas  (atau /ultimas-subidas?page=N)
 * - Manga:  /library/manga/{id}/{slug}
 * - Chapter: /view_uploads/{id}  → viewer /viewer/{uniqid}/cascade
 */
export class ZonaTmoSource extends BaseSource {
	id = 'zonatmo';
	name = 'ZonaTMO';
	baseUrl = 'https://zonatmo.org';

	private readonly PER_PAGE = 24;

	// ── Helpers ──────────────────────────────────────────────────────────────

	private absUrl(href: string): string {
		if (!href) return '';
		if (href.startsWith('http')) return href;
		if (href.startsWith('//')) return `https:${href}`;
		return `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
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
		return id.replace(/\/+$/, '').split('?')[0];
	}

	private detectType(text: string): 'manga' | 'manhwa' | 'manhua' {
		const t = (text || '').toLowerCase();
		if (t.includes('manhwa')) return 'manhwa';
		if (t.includes('manhua')) return 'manhua';
		if (t.includes('webtoon') || t.includes('comic') || t.includes('one_shot') || t.includes('one shot')) {
			return 'manhwa';
		}
		return 'manga';
	}

	// ── Últimas subidas (satu-satunya list yang di-support) ──────────────────

	async getLatestManga(page: number): Promise<Manga[]> {
	// Últimas subidas
	const path =
		page <= 1
			? '/ultimas-subidas'
			: `/ultimas-subidas?page=${page}`;

	const html = await this.fetchHtml(path);
	const $ = cheerio.load(html);

	const mangas: Manga[] = [];
	const seen = new Set<string>();

	// Selector utama (pola TMO / ZonaTMO)
	const cards = $(
		'div.element, div.book-item, .element-bg, .upload-item, a[href*="/library/manga/"]'
	);

	cards.each((_, el) => {
		const $el = $(el);

		// Link manga
		const $a =
			$el.is('a[href*="/library/"]')
				? $el
				: $el.find('a[href*="/library/manga/"]').first().length
					? $el.find('a[href*="/library/manga/"]').first()
					: $el.find('a[href*="/library/"]').first();

		const href = $a.attr('href') || '';
		if (!href || !href.includes('/library/')) return;

		const id = this.cleanId(href);
		if (seen.has(id)) return;
		seen.add(id);

		// Title
		let title =
			$a.find('h4, h3, .title').first().text().trim() ||
			$el.find('h4, h3, .title').first().text().trim() ||
			$a.attr('title')?.trim() ||
			$a.text().replace(/\s+/g, ' ').trim();

		// Bersihkan sisa "Capítulo X"
		title = title
			.replace(/\s*Cap[ií]tulo\s*\d+(?:\.\d+)?.*$/i, '')
			.replace(/\s*Chapter\s*\d+(?:\.\d+)?.*$/i, '')
			.replace(/\s+/g, ' ')
			.trim();

		if (!title || title.length < 2) return;

		// Cover: img dulu, fallback background-image / data-bg
		let cover = '';
		const $img = $el.find('img').first();
		if ($img.length) {
			cover =
				$img.attr('src') ||
				$img.attr('data-src') ||
				$img.attr('data-original') ||
				'';
		}

		if (!cover) {
			const style =
				$el.find('.thumbnail, .thumb, .book-thumbnail').attr('style') ||
				$el.attr('style') ||
				'';
			const bgMatch = style.match(
				/url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)/i
			);
			if (bgMatch) cover = bgMatch[1];
		}

		if (!cover) {
			cover = $el.attr('data-bg') || $el.find('[data-bg]').attr('data-bg') || '';
		}

		cover = this.absUrl(cover);

		const type = this.detectType($el.text());

		mangas.push({
			id,
			title,
			cover,
			sourceId: this.id,
			type
		});
	});

	return mangas.slice(0, this.PER_PAGE);
}

	async searchManga(query: string, opts?: { page?: number }): Promise<Manga[]> {
		// Karena request hanya fokus ke Últimas subidas, search dikembalikan kosong
		// atau bisa diarahkan ke library kalau mau diperluas nanti
		return [];
	}

	// ── Manga Details ────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		let path = this.cleanId(mangaId);
		if (!path.startsWith('/library/manga/')) {
			path = `/library/manga/${path.replace(/^\//, '')}`;
		}

		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);

		const title =
			$('h1').first().text().trim() ||
			$('meta[property="og:title"]').attr('content')?.replace(/\s*\|?\s*ZonaTMO.*$/i, '').trim() ||
			path;

		let cover =
			$('meta[property="og:image"]').attr('content') ||
			$('.cover img, .manga-cover img, img[itemprop="image"]').first().attr('src') ||
			$('img').first().attr('src') ||
			'';
		cover = this.absUrl(cover);

		let description =
			$('[itemprop="description"], .description, .sinopsis, .synopsis, .summary')
				.first()
				.text()
				.replace(/\s+/g, ' ')
				.trim() ||
			$('meta[name="description"]').attr('content')?.trim() ||
			'';

		// Status
		let status = 'Ongoing';
		const statusText = $('body').text().toLowerCase();
		if (/completado|finalizado|tamat|finished|completed/.test(statusText)) {
			status = 'Completed';
		} else if (/publicándose|en emisión|ongoing/.test(statusText)) {
			status = 'Ongoing';
		}

		// Type
		const type = this.detectType($('body').text());

		// Genres
		const genres: string[] = [];
		$('a[href*="/tag/"], .genres a, .genre a, [class*="genre"] a').each((_, el) => {
			const g = $(el).text().trim();
			if (g && !genres.includes(g)) genres.push(g);
		});

		// Authors (kalau ada)
		const authors: string[] = [];
		$('a[href*="author"], .author a, [itemprop="author"]').each((_, el) => {
			const a = $(el).text().trim();
			if (a && !authors.includes(a)) authors.push(a);
		});

		// Chapters
		const chapters: Chapter[] = [];
		const seen = new Set<string>();

		$('a[href*="/view_uploads/"]').each((i, el) => {
			const $a = $(el);
			const href = $a.attr('href') || '';
			if (!href) return;

			const id = this.cleanId(href);
			if (seen.has(id)) return;
			seen.add(id);

			// Cari judul chapter di sekitar link
			const $row = $a.closest('div, li, tr, .chapter, .upload');
			let rawTitle =
				$row.find('a[href*="/view_uploads/"]').not($a).first().text().trim() ||
				$row.text().replace(/\s+/g, ' ').trim() ||
				$a.text().replace(/\s+/g, ' ').trim() ||
				`Capítulo ${i + 1}`;

			// Ambil nomor
			const numMatch =
				rawTitle.match(/(?:capítulo|capitulo|chapter|cap\.?)\s*(\d+(?:\.\d+)?)/i) ||
				rawTitle.match(/(\d+(?:\.\d+)?)/);
			const number = numMatch ? parseFloat(numMatch[1]) : i + 1;

			// Date
			const dateMatch = rawTitle.match(
				/(\d+\s*(?:hour|day|week|month|year|hora|día|dia|semana|mes|año)s?\s*ago|\d{1,2}\/\d{1,2}\/\d{4}|yesterday|today)/i
			);
			const date = dateMatch ? dateMatch[1] : '';

			const chTitle = `Capítulo ${number}`;

			chapters.push({
				id,
				title: chTitle,
				number,
				date
			});
		});

		// Sort newest first
		chapters.sort((a, b) => b.number - a.number);

		return {
			id: path,
			sourceId: this.id,
			title,
			cover,
			type,
			description,
			authors,
			status,
			genres,
			chapters
		};
	}

	// ── Chapter Pages ────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
		let path = this.cleanId(chapterId);

		// view_uploads → coba ambil uniqid lalu ke cascade viewer
		if (path.includes('/view_uploads/')) {
			const html = await this.fetchHtml(path);
			const uniqidMatch = html.match(/uniqid\s*[:=]\s*['"]([^'"]+)['"]/i);
			if (uniqidMatch) {
				path = `/viewer/${uniqidMatch[1]}/cascade`;
			} else {
				// fallback: coba ganti path
				const id = path.split('/').pop();
				if (id) path = `/viewer/${id}/cascade`;
			}
		} else if (path.includes('/viewer/') && !path.endsWith('/cascade')) {
			path = path.replace(/\/?$/, '') + '/cascade';
		}

		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);

		const pages: string[] = [];
		const seen = new Set<string>();

		const selectors = [
			'#viewer-container img',
			'.viewer-image img',
			'.reading-content img',
			'#chapter-content img',
			'.page-img img',
			'img[data-original]',
			'img[data-src]',
			'img.img-fluid',
			'img'
		];

		for (const sel of selectors) {
			$(sel).each((_, img) => {
				let src =
					$(img).attr('data-original') ||
					$(img).attr('data-src') ||
					$(img).attr('data-lazy-src') ||
					$(img).attr('src') ||
					'';

				src = this.absUrl(src);

				if (
					src &&
					!seen.has(src) &&
					/\.(jpg|jpeg|png|webp|avif)/i.test(src) &&
					!/logo|icon|avatar|spinner|ads|placeholder|lazy|thumb|banner/i.test(src)
				) {
					seen.add(src);
					pages.push(src);
				}
			});
			if (pages.length > 3) break; // cukup yakin
		}

		return pages;
	}
}
