import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * id.mgkomik.cc adapter (Madara / WP-Manga)
 *
 * Homepage  : hanya section "Project Update" (bukan UPDATE KOMIK TERBARU)
 * List      : /manga/?m_orderby=latest&page={n}  (fallback)
 * Search    : /?s=QUERY&post_type=wp-manga
 * Detail    : /manga/{slug}/
 * Chapter   : /manga/{slug}/chapter-{n}/  (atau path chapter Madara)
 *
 * ID format:
 *   manga   : "/manga/{slug}"
 *   chapter : full path "/manga/{slug}/chapter-xx/"
 */
export class MgkomikSource extends BaseSource {
	id = 'mgkomik';
	name = 'MGKomik';
	baseUrl = 'https://id.mgkomik.cc';

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
		const m = String(text).match(
			/(?:chapter|chap|ch\.?|episode|ep\.?)\s*(\d+(?:\.\d+)?)/i
		);
		if (m) return parseFloat(m[1]);
		const n = String(text).match(/(\d+(?:\.\d+)?)/);
		return n ? parseFloat(n[1]) : 0;
	}

	private imgSrc($el: cheerio.Cheerio<any>): string {
		return (
			$el.attr('data-src') ||
			$el.attr('data-lazy-src') ||
			$el.attr('data-original') ||
			$el.attr('src') ||
			''
		);
	}

	// ── Card parser (Madara page-item-detail) ────────────────────────────────

	private parseMadaraCards($: cheerio.CheerioAPI, scope?: cheerio.Cheerio<any>): Manga[] {
		const out: Manga[] = [];
		const seen = new Set<string>();
		const $items = scope
			? scope.find('.page-item-detail, .manga, .manga-item, .bs')
			: $('.page-item-detail, .c-tabs-item__content, .manga, .bs');

		$items.each((_, el) => {
			const $el = $(el);

			const a = $el
				.find(
					'.post-title a, h3 a, h5 a, .tt a, a[href*="/manga/"], a[href*="/komik/"]'
				)
				.first();
			let href = a.attr('href') || '';
			if (!href) return;

			const id = this.cleanId(href);
			// skip chapter links
			if (/chapter|ch-|\/\d+\/?$/i.test(id) && !/\/manga\/[^/]+\/?$/.test(id)) return;
			if (!id.includes('/manga/') && !id.includes('/komik/')) return;
			if (seen.has(id)) return;
			seen.add(id);

			let title =
				a.attr('title') ||
				a.text() ||
				$el.find('.post-title, .tt, h3, h5').first().text() ||
				'';
			title = title
				.replace(/\s+/g, ' ')
				.replace(/\s*(Chapter|Ch\.?)\s*\d+.*$/i, '')
				.trim();
			if (!title) return;

			const img = $el.find('img').first();
			let cover = this.imgSrc(img);
			cover = this.absUrl((cover || '').split('?')[0]);

			// Chapter badge text
			const chText =
				$el.find('.chapter a, .list-chapter a, .chapter-item a, .epxs, .latest-chap a').first().text() ||
				$el.find('.chapter, .list-chapter, .epxs').first().text() ||
				'';
			const latestChapter = this.parseChapterNumber(chText) || undefined;

			// Status / type (opsional)
			let status = 'Ongoing';
			const badge = $el.find('.manga-title-badges, .status, .badge').text().toLowerCase();
			if (/complete|selesai|end|tamat/.test(badge)) status = 'Completed';

			let type = 'manga';
			const typeText = ($el.text() + ' ' + title).toLowerCase();
			if (typeText.includes('manhwa')) type = 'manhwa';
			else if (typeText.includes('manhua')) type = 'manhua';

			out.push({
				id,
				sourceId: this.id,
				title,
				cover,
				type,
				status,
				latestChapter
			});
		});

		return out;
	}

	/**
	 * Ambil HANYA section "Project Update" di homepage.
	 * Skip section "UPDATE KOMIK TERBARU".
	 */
	private parseProjectUpdate($: cheerio.CheerioAPI): Manga[] {
		const out: Manga[] = [];
		const seen = new Set<string>();

		// Cari heading yang mengandung "Project Update"
		$('h2, h3, h4, .c-blog__heading, .heading, .section-title, .widget-title').each((_, h) => {
			const $h = $(h);
			const label = $h.text().replace(/\s+/g, ' ').trim().toLowerCase();
			if (!label.includes('project update') && !label.includes('project-update')) return;

			// Ambil container setelah heading (sibling / parent section)
			let $section = $h.closest('.c-page__content, .widget, .section, .row, .container, div').first();
			if (!$section.length) $section = $h.parent();

			// Cari grid item di dalam / setelah heading
			const $scope = $section.length ? $section : $h.nextAll().first();
			const cards = this.parseMadaraCards($, $scope);

			for (const m of cards) {
				if (seen.has(m.id)) continue;
				seen.add(m.id);
				out.push(m);
			}
		});

		// Fallback: kalau heading tidak ketemu, coba class khusus
		if (!out.length) {
			const $fallback = $(
				'.project-update, #project-update, [class*="project-update"], [id*="project-update"]'
			);
			if ($fallback.length) {
				for (const m of this.parseMadaraCards($, $fallback)) {
					if (seen.has(m.id)) continue;
					seen.add(m.id);
					out.push(m);
				}
			}
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

			// Page 1 → homepage, ambil Project Update
			if (p === 1) {
				const html = await this.fetchHtml('/');
				const $ = cheerio.load(html);
				let list = this.parseProjectUpdate($);

				// Kalau kurang dari 24, tambah dari /manga/?m_orderby=latest
				if (list.length < this.PER_PAGE) {
					const more = await this.fetchMadaraList(1);
					const seen = new Set(list.map((m) => m.id));
					for (const m of more) {
						if (seen.has(m.id)) continue;
						seen.add(m.id);
						list.push(m);
						if (list.length >= this.PER_PAGE) break;
					}
				}

				const result = list.slice(0, this.PER_PAGE);
				console.log(`[mgkomik] latest page=1 (Project Update) → ${result.length} items`);
				return result;
			}

			// Page 2+ → archive latest
			const list = await this.fetchMadaraList(p);
			console.log(`[mgkomik] latest page=${p} → ${list.length} items`);
			return list.slice(0, this.PER_PAGE);
		} catch (e) {
			console.error('[mgkomik] getLatestManga', e);
			return [];
		}
	}

	private async fetchMadaraList(page: number): Promise<Manga[]> {
		const path =
			page <= 1
				? '/manga/?m_orderby=latest'
				: `/manga/page/${page}/?m_orderby=latest`;
		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);
		return this.parseMadaraCards($);
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
					? `/?s=${encodeURIComponent(q)}&post_type=wp-manga`
					: `/page/${page}/?s=${encodeURIComponent(q)}&post_type=wp-manga`;

			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			const list = this.parseMadaraCards($);
			console.log(`[mgkomik] search "${q}" page=${page} → ${list.length} items`);
			return list.slice(0, this.PER_PAGE);
		} catch (e) {
			console.error('[mgkomik] searchManga', e);
			return [];
		}
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const path = this.cleanId(mangaId);
		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);

		const title =
			$('.post-title h1, .manga-title, h1').first().text().replace(/\s+/g, ' ').trim() ||
			$('meta[property="og:title"]').attr('content')?.replace(/\s*[-|].*$/, '').trim() ||
			'Unknown';

		let cover =
			this.imgSrc($('.summary_image img, .manga-thumb img, .thumb img').first()) ||
			$('meta[property="og:image"]').attr('content') ||
			'';
		cover = this.absUrl((cover || '').split('?')[0]);

		// Status
		let status = 'Ongoing';
		$('.post-content_item, .summary-content, .manga-info, .imptdt').each((_, el) => {
			const t = $(el).text().toLowerCase();
			if (/status/.test(t)) {
				if (/complete|selesai|tamat|end|finished/.test(t)) status = 'Completed';
				else if (/hiatus/.test(t)) status = 'Hiatus';
				else if (/ongoing|berjalan|publishing/.test(t)) status = 'Ongoing';
			}
		});

		// Type
		let type = 'manga';
		$('.post-content_item, .summary-content, .imptdt').each((_, el) => {
			const t = $(el).text().toLowerCase();
			if (/type|tipe|jenis/.test(t)) {
				if (t.includes('manhwa')) type = 'manhwa';
				else if (t.includes('manhua')) type = 'manhua';
				else if (t.includes('manga')) type = 'manga';
			}
		});

		// Authors
		const authors: string[] = [];
		$('.author-content a, a[href*="manga-author"], .artist-content a').each((_, a) => {
			const name = $(a).text().trim();
			if (name && !authors.includes(name)) authors.push(name);
		});

		// Genres
		const genres: string[] = [];
		$('.genres-content a, .mgen a, a[href*="genre"]').each((_, a) => {
			const g = $(a).text().trim();
			if (g && !genres.includes(g) && g.length < 40) genres.push(g);
		});

		// Synopsis
		const synopsis =
			$('.description-summary .summary__content, .summary__content, .manga-excerpt, .desc')
				.first()
				.text()
				.replace(/\s+/g, ' ')
				.trim() ||
			$('meta[name="description"]').attr('content')?.trim() ||
			'';

		// Chapters
		const chapters: Chapter[] = [];
		const seen = new Set<string>();

		$('li.wp-manga-chapter a, .listing-chapters_wrap a, .chapter-list a, ul.main a').each(
			(_, a) => {
				const $a = $(a);
				const href = $a.attr('href') || '';
				if (!href) return;
				const id = this.cleanId(href);
				if (seen.has(id)) return;
				seen.add(id);

				let chTitle = $a.text().replace(/\s+/g, ' ').trim() || 'Chapter';
				// Date kadang di sibling
				const date =
					$a.find('.chapter-release-date, .chapter-time').text().trim() ||
					$a.parent().find('.chapter-release-date, i, .time').text().trim() ||
					'';

				// Bersihkan date dari title
				chTitle = chTitle
					.replace(date, '')
					.replace(/\s+/g, ' ')
					.trim();

				const number = this.parseChapterNumber(chTitle) || chapters.length + 1;

				chapters.push({
					id,
					title: chTitle || `Chapter ${number}`,
					number,
					date
				});
			}
		);

		// Newest first
		chapters.sort((a, b) => b.number - a.number);
		const latestChapter = chapters[0]?.number;

		const description = [synopsis].filter(Boolean).join('\n\n');

		return {
			id: path,
			sourceId: this.id,
			title,
			cover,
			type,
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
		try {
			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			const urls: string[] = [];
			const seen = new Set<string>();

			const selectors = [
				'.reading-content img',
				'#readerarea img',
				'.read-container img',
				'.chapter-content img',
				'.page-break img',
				'#images img',
				'.entry-content img'
			];

			for (const sel of selectors) {
				$(sel).each((_, img) => {
					let src = this.imgSrc($(img));
					if (!src || src.startsWith('data:')) return;
					src = this.absUrl(src.split('?')[0]);
					if (!/^https?:\/\//i.test(src)) return;
					if (/logo|icon|avatar|ads|banner|spinner|placeholder|loading/i.test(src)) return;
					if (seen.has(src)) return;
					seen.add(src);
					urls.push(src);
				});
				if (urls.length > 0) break;
			}

			console.log(`[mgkomik] ${urls.length} pages → ${path}`);
			return urls;
		} catch (e) {
			console.error('[mgkomik] getChapterPages failed', path, e);
			return [];
		}
	}
}
