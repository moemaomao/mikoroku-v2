import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * MangaKakalot.gg adapter (HTML + chapters JSON API)
 *
 * Domain   : https://www.mangakakalot.gg
 * Latest   : GET /manga-list/latest-manga?page=N
 * Search   : GET /search/story/{query}
 * Detail   : GET /manga/{slug}
 * Chapters : GET /api/manga/{slug}/chapters?limit=&offset=
 * Pages    : GET /manga/{slug}/{chapter-slug}  → img on 2xstorage CDN
 *
 * ID format:
 *   manga   : "/manga/{slug}"
 *   chapter : "/manga/{slug}/{chapter-slug}"   e.g. /manga/set-up/chapter-111
 */
export class MangaKakalotSource extends BaseSource {
	id = 'mangakakalot';
	name = 'MangaKakalot';
	baseUrl = 'https://www.mangakakalot.gg';

	private readonly PER_PAGE = 24;
	private readonly DEFAULT_LANG = 'en';

	// ── Helpers ──────────────────────────────────────────────────────────────

	private absUrl(url: string): string {
		if (!url) return '';
		let u = url.trim().replace(/&amp;/g, '&');
		if (u.startsWith('http')) return u;
		if (u.startsWith('//')) return `https:${u}`;
		return `${this.baseUrl}${u.startsWith('/') ? '' : '/'}${u}`;
	}

	private toMangaId(slug: string): string {
		const s = String(slug || '')
			.replace(/^\/+/, '')
			.replace(/^manga\//i, '')
			.split('/')[0];
		return `/manga/${s}`;
	}

	private extractSlug(mangaId: string): string {
		const parts = String(mangaId)
			.replace(/^\/+/, '')
			.split('/')
			.filter(Boolean);
		if (parts[0] === 'manga' && parts[1]) return parts[1];
		return parts[0] || '';
	}

	private extractChapterPath(chapterId: string): { slug: string; chapterSlug: string } {
		const parts = String(chapterId)
			.replace(/^\/+/, '')
			.split('/')
			.filter(Boolean);
		// /manga/{slug}/{chapter-slug}
		if (parts[0] === 'manga' && parts[1] && parts[2]) {
			return { slug: parts[1], chapterSlug: parts[2] };
		}
		// /{slug}/{chapter-slug}
		if (parts[0] && parts[1]) {
			return { slug: parts[0], chapterSlug: parts[1] };
		}
		return { slug: parts[0] || '', chapterSlug: parts[parts.length - 1] || '' };
	}

	private toChapterId(slug: string, chapterSlug: string): string {
		return `/manga/${slug}/${chapterSlug}`;
	}

	private parseChapterNumber(text: string): number {
		const t = String(text || '');
		const m = t.match(
			/(?:chapter|chap|ch\.?)\s*(\d+)(?:[.,](\d+))?/i
		);
		if (m) {
			if (m[2] != null) return parseFloat(`${m[1]}.${m[2]}`);
			return parseInt(m[1], 10);
		}
		const n = t.match(/\b(\d+(?:\.\d+)?)\b/);
		return n ? parseFloat(n[1]) : 0;
	}

	private formatDate(iso?: string | null): string {
		if (!iso) return '';
		try {
			return new Date(iso).toISOString().slice(0, 10);
		} catch {
			return String(iso).slice(0, 10);
		}
	}

	private mapStatus(raw?: string): string {
		const s = String(raw || '').toLowerCase();
		if (s.includes('complete')) return 'Completed';
		if (s.includes('hiatus')) return 'Hiatus';
		if (s.includes('cancel') || s.includes('drop')) return 'Dropped';
		return 'Ongoing';
	}

	private decodeHtml(s: string): string {
		return s
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'")
			.replace(/&#x27;/g, "'")
			.trim();
	}

	/** Parse list cards from latest / homepage style .item blocks */
	private parseItemList(html: string): Manga[] {
		const $ = cheerio.load(html);
		const list: Manga[] = [];
		const seen = new Set<string>();

		$('div.item').each((_, el) => {
			const $el = $(el);
			const a = $el.find('h3 a[href*="/manga/"]').first();
			const href = a.attr('href') || '';
			const m = href.match(/\/manga\/([^/?#]+)/i);
			if (!m) return;
			const slug = m[1];
			if (seen.has(slug)) return;
			seen.add(slug);

			const title =
				(a.attr('title') || a.text() || $el.find('img').attr('alt') || slug)
					.replace(/\s+/g, ' ')
					.trim();
			const cover = this.absUrl(
				$el.find('img').attr('src') ||
					$el.find('img').attr('data-src') ||
					''
			);

			const chA = $el.find('a[href*="/chapter"]').first();
			const chText = (chA.attr('title') || chA.text() || '').replace(/\s+/g, ' ').trim();
			const chNum = this.parseChapterNumber(chText);

			list.push({
				id: this.toMangaId(slug),
				title: this.decodeHtml(title),
				cover,
				sourceId: this.id,
				type: 'manga',
				status: 'Ongoing',
				latestChapter: chNum ? String(chNum) : undefined,
				lang: this.DEFAULT_LANG
			});
		});

		return list;
	}

	/** Parse search results .story_item */
	private parseSearchList(html: string): Manga[] {
		const $ = cheerio.load(html);
		const list: Manga[] = [];
		const seen = new Set<string>();

		$('div.story_item').each((_, el) => {
			const $el = $(el);
			const a = $el.find('h3.story_name a[href*="/manga/"], a[href*="/manga/"]').first();
			const href = a.attr('href') || $el.find('a[href*="/manga/"]').first().attr('href') || '';
			const m = href.match(/\/manga\/([^/?#]+)/i);
			if (!m) return;
			const slug = m[1];
			if (seen.has(slug)) return;
			seen.add(slug);

			const title =
				(a.text() || $el.find('img').attr('alt') || slug).replace(/\s+/g, ' ').trim();
			const cover = this.absUrl(
				$el.find('img').attr('src') || $el.find('img').attr('data-src') || ''
			);

			const chA = $el.find('em.story_chapter a').first();
			const chText = (chA.attr('title') || chA.text() || '').replace(/\s+/g, ' ').trim();
			const chNum = this.parseChapterNumber(chText);

			list.push({
				id: this.toMangaId(slug),
				title: this.decodeHtml(title),
				cover,
				sourceId: this.id,
				type: 'manga',
				status: 'Ongoing',
				latestChapter: chNum ? String(chNum) : undefined,
				lang: this.DEFAULT_LANG
			});
		});

		// Fallback: any /manga/ links with images nearby
		if (list.length === 0) {
			$('a[href*="/manga/"]').each((_, el) => {
				const href = $(el).attr('href') || '';
				const m = href.match(/\/manga\/([^/?#]+)/i);
				if (!m || href.includes('/chapter')) return;
				const slug = m[1];
				if (seen.has(slug)) return;
				seen.add(slug);
				const title = ($(el).text() || slug).replace(/\s+/g, ' ').trim();
				if (title.length < 2) return;
				list.push({
					id: this.toMangaId(slug),
					title: this.decodeHtml(title),
					cover: '',
					sourceId: this.id,
					type: 'manga',
					status: 'Ongoing',
					lang: this.DEFAULT_LANG
				});
			});
		}

		return list;
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

	async getLatestManga(
		page: number,
		_opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			const path =
				p === 1
					? '/manga-list/latest-manga'
					: `/manga-list/latest-manga?page=${p}`;
			const html = await this.fetchHtml(path);
			const list = this.parseItemList(html).slice(0, this.PER_PAGE);
			console.log(`[mangakakalot] latest page=${p} → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[mangakakalot] getLatestManga', e);
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
			// Site uses path segment for query
			const slug = encodeURIComponent(q).replace(/%20/g, '%20');
			const path =
				page > 1
					? `/search/story/${slug}?page=${page}`
					: `/search/story/${slug}`;
			const html = await this.fetchHtml(path);
			const list = this.parseSearchList(html).slice(0, this.PER_PAGE);
			console.log(`[mangakakalot] search "${q}" → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[mangakakalot] searchManga', e);
			return [];
		}
	}

	async getMangaDetails(
		mangaId: string,
		_opts?: { lang?: string }
	): Promise<MangaDetails> {
		const slug = this.extractSlug(mangaId);
		if (!slug) throw new Error(`MangaKakalot: invalid mangaId ${mangaId}`);

		const html = await this.fetchHtml(`/manga/${slug}`);
		const $ = cheerio.load(html);

		const pageTitle = $('title').first().text() || '';
		let title = pageTitle
			.replace(/\s*\|\s*MangaKakalot.*$/i, '')
			.replace(/^Read\s+/i, '')
			.replace(/\s+Latest Chapter.*$/i, '')
			.replace(/\s+Manga Online Free.*$/i, '')
			.replace(/\s+/g, ' ')
			.trim();
		if (!title || title.length < 2) {
			title =
				$('h1').first().text().replace(/\s+/g, ' ').trim() ||
				$('ul.manga-info-top h1, .manga-info-top h1').first().text().trim() ||
				slug;
		}

		const cover = this.absUrl(
			$('meta[property="og:image"]').attr('content') ||
				$('.manga-info-pic img, .info-image img').first().attr('src') ||
				$(`img[src*="${slug}"]`).first().attr('src') ||
				''
		);

		let status = 'Ongoing';
		const authors: string[] = [];
		const genres: string[] = [];
		let description = '';

		$('li').each((_, li) => {
			const text = $(li).text().replace(/\s+/g, ' ').trim();
			if (/^Author/i.test(text)) {
				const body = text.replace(/^Author\(s\)\s*:\s*/i, '').trim();
				body.split(/,/).forEach((s) => {
					const t = s.trim();
					if (t) authors.push(t);
				});
				$(li)
					.find('a')
					.each((__, a) => {
						const t = $(a).text().replace(/\s+/g, ' ').trim();
						if (t && !authors.includes(t)) authors.push(t);
					});
			} else if (/^Status/i.test(text)) {
				status = this.mapStatus(text.replace(/^Status\s*:\s*/i, ''));
			} else if (/^Genres/i.test(text)) {
				$(li)
					.find('a')
					.each((__, a) => {
						const t = $(a).text().replace(/\s+/g, ' ').trim();
						if (t) genres.push(t);
					});
			}
		});

		$('.genre-list a, a[href*="/genre/"]').each((_, a) => {
			const t = $(a).text().replace(/\s+/g, ' ').trim();
			if (t && !genres.includes(t)) genres.push(t);
		});

		description =
			$('#noidungm, .manga-info-summary, .panel-story-info-description')
				.first()
				.text()
				.replace(/\s+/g, ' ')
				.trim() ||
			$('meta[name="description"]').attr('content') ||
			'';

		// Chapters via API (paginated, full list)
		const chapters: Chapter[] = [];
		const seen = new Set<string>();
		try {
			let offset = 0;
			const limit = 100;
			let hasMore = true;
			while (hasMore) {
				const apiUrl = `${this.baseUrl}/api/manga/${encodeURIComponent(slug)}/chapters?limit=${limit}&offset=${offset}`;
				const res = await fetch(apiUrl, {
					headers: {
						...this.headers,
						Accept: 'application/json',
						Referer: `${this.baseUrl}/manga/${slug}`
					}
				});
				if (!res.ok) break;
				const json: any = await res.json();
				const rows: any[] = json?.data?.chapters || [];
				for (const row of rows) {
					const chapterSlug = String(row.chapter_slug || '').trim();
					if (!chapterSlug || seen.has(chapterSlug)) continue;
					seen.add(chapterSlug);
					const name = String(row.chapter_name || chapterSlug);
					const num =
						typeof row.chapter_num === 'number'
							? row.chapter_num
							: this.parseChapterNumber(name);
					chapters.push({
						id: this.toChapterId(slug, chapterSlug),
						title: name,
						number: num || chapters.length + 1,
						date: this.formatDate(row.updated_at) || undefined
					});
				}
				hasMore = Boolean(json?.data?.pagination?.has_more) && rows.length > 0;
				offset += limit;
				if (offset > 5000) break; // safety
			}
		} catch (e) {
			console.error('[mangakakalot] chapters API', e);
			// Fallback: DOM chapter list (only newest ~50)
			$('a[href*="/chapter"]').each((_, a) => {
				const href = $(a).attr('href') || '';
				const cm = href.match(/\/manga\/[^/]+\/(chapter-[^/?#]+)/i);
				if (!cm) return;
				const chapterSlug = cm[1];
				if (seen.has(chapterSlug)) return;
				seen.add(chapterSlug);
				const name = ($(a).attr('title') || $(a).text() || chapterSlug)
					.replace(/\s+/g, ' ')
					.trim();
				chapters.push({
					id: this.toChapterId(slug, chapterSlug),
					title: name,
					number: this.parseChapterNumber(name) || chapters.length + 1
				});
			});
		}

		chapters.sort((a, b) => (b.number || 0) - (a.number || 0));

		const latestChapter =
			chapters.length > 0 ? String(chapters[0].number) : undefined;

		return {
			id: this.toMangaId(slug),
			sourceId: this.id,
			title,
			cover,
			type: 'manga',
			status,
			latestChapter,
			lang: this.DEFAULT_LANG,
			description,
			authors: [...new Set(authors)],
			genres: [...new Set(genres)],
			chapters
		};
	}

	async getChapterPages(chapterId: string): Promise<string[]> {
		try {
			const { slug, chapterSlug } = this.extractChapterPath(chapterId);
			if (!slug || !chapterSlug) return [];

			const path = `/manga/${slug}/${chapterSlug}`;
			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);

			const pages: string[] = [];
			const seen = new Set<string>();

			// Primary: img tags pointing at 2xstorage chapter images
			$('img').each((_, img) => {
				const src =
					$(img).attr('src') ||
					$(img).attr('data-src') ||
					$(img).attr('data-url') ||
					'';
				if (!src) return;
				if (!/2xstorage\.com\//i.test(src) && !/\/\d+\.(webp|jpg|png)/i.test(src))
					return;
				if (/thumb\//i.test(src) || /404-avatar/i.test(src)) return;
				const url = this.absUrl(src);
				const key = url.split('?')[0];
				if (seen.has(key)) return;
				seen.add(key);
				pages.push(url);
			});

			// Fallback: regex scan for CDN chapter paths
			if (pages.length === 0) {
				const re =
					/(https?:\/\/(?:img-r\d+|imgs-\d+)\.2xstorage\.com\/[^"'\\\s]+\.(?:webp|jpg|png))/gi;
				let m: RegExpExecArray | null;
				while ((m = re.exec(html)) !== null) {
					const url = m[1];
					if (/thumb\//i.test(url)) continue;
					const key = url.split('?')[0];
					if (seen.has(key)) continue;
					seen.add(key);
					pages.push(url);
				}
			}

			// Sort by page index in path (.../111/0.webp, .../111/1.webp)
			pages.sort((a, b) => {
				const na = parseInt(a.match(/\/(\d+)\.(?:webp|jpg|png)/i)?.[1] || '0', 10);
				const nb = parseInt(b.match(/\/(\d+)\.(?:webp|jpg|png)/i)?.[1] || '0', 10);
				return na - nb;
			});

			console.log(
				`[mangakakalot] getChapterPages ${slug}/${chapterSlug} → ${pages.length} pages`
			);
			return pages;
		} catch (e) {
			console.error('[mangakakalot] getChapterPages', e);
			return [];
		}
	}
}
