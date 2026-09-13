import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * v5.luvyaa.co adapter (MangaReader / Themesia-like)
 *
 * List   : /manga/?order=update  |  /manga/?order=update&page={n}
 * Search : /?s=QUERY
 * Detail : /{slug}/
 * Chapter: /{slug}-chapter-{n}/
 * Pages  : img.ts-main-image (cdn-nyaa.link)
 *
 * ID format:
 *   manga   : "/{slug}"
 *   chapter : "/{slug}-chapter-{n}"
 */
export class LuvyaaSource extends BaseSource {
	id = 'luvyaa';
	name = 'Luvyaa';
	baseUrl = 'https://v5.luvyaa.co';

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
		const s = String(text || '');
		const m =
			s.match(/(?:chapter|chap|ch\.?|episode|ep\.?)[\s_-]*(\d+(?:\.\d+)?)/i) ||
			s.match(/-chapter-(\d+(?:\.\d+)?)/i) ||
			s.match(/(\d+(?:\.\d+)?)/);
		return m ? parseFloat(m[1]) : NaN;
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

	private detectType(text: string): 'manga' | 'manhwa' | 'manhua' {
		const t = (text || '').toLowerCase();
		if (/\bmanhwa\b/.test(t)) return 'manhwa';
		if (/\bmanhua\b/.test(t)) return 'manhua';
		return 'manga';
	}

	/** path valid manga: /slug (bukan /manga /page /genres /user /login) */
	private isMangaPath(id: string): boolean {
		if (!id || id === '/') return false;
		if (
			/^\/(manga|page|genres|genre|user|login|vebe|top-reader|project|wp-|author|tag|category)\b/i.test(
				id
			)
		) {
			return false;
		}
		if (/-chapter-[\d.]+/i.test(id)) return false;
		return /^\/[a-z0-9][a-z0-9-]{1,200}$/i.test(id);
	}

	/** /slug-chapter-12 → /slug */
	private seriesIdFromChapter(path: string): string | null {
		const p = this.cleanId(path);
		const m = p.match(/^\/(.+?)-chapter-[\d.]+(?:-\d+)?$/i);
		if (m?.[1]) return `/${m[1]}`;
		return null;
	}

	// ── List parser ──────────────────────────────────────────────────────────

	private parseCards($: cheerio.CheerioAPI): Manga[] {
		const out: Manga[] = [];
		const seen = new Set<string>();

		$('.listupd .bs').each((_, el) => {
			const $el = $(el);
			const a = $el.find('a[href]').first();
			const href = a.attr('href') || '';
			if (!href) return;

			const id = this.cleanId(href);
			if (!this.isMangaPath(id) || seen.has(id)) return;
			seen.add(id);

			let title =
				a.attr('title') ||
				$el.find('.tt').first().text() ||
				a.find('img').attr('alt') ||
				'';
			title = title
				.replace(/\s+/g, ' ')
				.replace(/\s*(Chapter|Ch\.?)\s*[\d.].*$/i, '')
				.trim();
			if (!title || title.length < 2) return;

			let cover = this.imgSrc($el.find('img').first());
			cover = this.absUrl((cover || '').split('?')[0]);

			const chText =
				$el.find('.epxs').first().text().replace(/\s+/g, ' ').trim() ||
				$el.find('.fivchap').first().text().replace(/\s+/g, ' ').replace(/🔒/g, '').trim() ||
				$el.find('.chfiv a').first().text().replace(/\s+/g, ' ').replace(/🔒/g, '').trim() ||
				'';
			const chNum = this.parseChapterNumber(chText);
			const latestChapter =
				Number.isFinite(chNum) && chNum >= 0 ? chNum : undefined;

			const typeClass =
				$el.find('span.type').attr('class') ||
				$el.find('.popup-flag').attr('class') ||
				'';
			const type = this.detectType(typeClass);

			let status = 'Ongoing';
			const stClass = $el.find('span.status').attr('class') || '';
			const stText = $el.find('span.status').text() || '';
			if (/complete|selesai|tamat|finished/i.test(stClass + ' ' + stText)) {
				status = 'Completed';
			}

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

	private async fetchListPage(path: string): Promise<Manga[]> {
		try {
			const html = await this.fetchHtml(path);
			if (!html || html.length < 500) return [];
			const $ = cheerio.load(html);
			const list = this.parseCards($);
			console.log(`[luvyaa] ${path} → ${list.length} items`);
			return list;
		} catch (e) {
			console.warn('[luvyaa] fetchListPage', path, e);
			return [];
		}
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

		async getLatestManga(
		page: number,
		_opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			const path = p <= 1 ? `/project/` : `/project/page/${p}/`;
			const list = await this.fetchListPage(path);
			return list.slice(0, this.PER_PAGE);
		} catch (e) {
			console.error('[luvyaa] getLatestManga', e);
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
					? `/?s=${encodeURIComponent(q)}`
					: `/page/${page}/?s=${encodeURIComponent(q)}`;
			const list = await this.fetchListPage(path);
			console.log(`[luvyaa] search "${q}" → ${list.length}`);
			return list.slice(0, this.PER_PAGE);
		} catch (e) {
			console.error('[luvyaa] searchManga', e);
			return [];
		}
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		let path = this.cleanId(mangaId);

		if (/-chapter-[\d.]+/i.test(path)) {
			const series = this.seriesIdFromChapter(path);
			if (series) path = series;
		}

		if (!this.isMangaPath(path)) {
			throw new Error(`Invalid luvyaa id: ${mangaId}`);
		}

		const html = await this.fetchHtml(path.endsWith('/') ? path : `${path}/`);
		const $ = cheerio.load(html);

		// Title
		let title =
			$('h1.entry-title, h1').first().text().replace(/\s+/g, ' ').trim() ||
			$('meta[property="og:title"]')
				.attr('content')
				?.replace(/\s*[-|].*$/, '')
				.trim() ||
			path.replace(/^\//, '').replace(/-/g, ' ');

		// Alternative title: <span class="alternative">...</span>
		const alt =
			$('span.alternative').first().text().replace(/\s+/g, ' ').trim() || '';

		// Cover
		let cover =
			this.imgSrc($('.thumb img, img.wp-post-image').first()) ||
			$('meta[property="og:image"]').attr('content') ||
			'';
		cover = this.absUrl((cover || '').split('?')[0]);

		// Rating: .kh-stat-item.rating-score span  ATAU  meta[itemprop="ratingValue"]
		let rating =
			$('meta[itemprop="ratingValue"]').attr('content') ||
			$('.kh-stat-item.rating-score span').first().text().replace(/\s+/g, ' ').trim() ||
			'';
		rating = rating.replace(/[^\d.]/g, '');

		// Status: .kh-status .status-text
		let status = 'Ongoing';
		const statusText =
			$('.kh-status .status-text').first().text().replace(/\s+/g, ' ').trim() ||
			$('.kh-status').text().replace(/\s+/g, ' ').trim() ||
			'';
		if (/complete|selesai|tamat|finished/i.test(statusText)) status = 'Completed';
		else if (/hiatus/i.test(statusText)) status = 'Hiatus';
		else if (/ongoing|berjalan/i.test(statusText)) status = 'Ongoing';

		// Type dari meta-item
		let type: 'manga' | 'manhwa' | 'manhua' = 'manga';
		$('.meta-item').each((_, el) => {
			const $el = $(el);
			const label = $el
				.find('.meta-label')
				.text()
				.replace(/\s+/g, ' ')
				.trim()
				.toLowerCase();
			const val = $el.find('.meta-pill, a').first().text().replace(/\s+/g, ' ').trim();
			if (label === 'type' && val) type = this.detectType(val);
		});

		// Author / Artist dari meta-item
		const authors: string[] = [];
		$('.meta-item').each((_, el) => {
			const $el = $(el);
			const label = $el
				.find('.meta-label')
				.text()
				.replace(/\s+/g, ' ')
				.trim()
				.toLowerCase();
			if (label !== 'author' && label !== 'artist') return;
			const val = $el.find('.meta-pill').text().replace(/\s+/g, ' ').trim();
			val.split(/,|&/).forEach((n) => {
				n = n.trim();
				if (n && n.length < 60 && !authors.includes(n)) authors.push(n);
			});
		});

		// Genres
		const genres: string[] = [];
		$('a.meta-pill[href*="/genres/"], .mgen a').each((_, a) => {
			const g = $(a).text().replace(/\s+/g, ' ').trim();
			if (g && g.length < 40 && !genres.includes(g)) genres.push(g);
		});

		// Synopsis
		const synopsis =
			$('.entry-content[itemprop="description"]')
				.first()
				.text()
				.replace(/\s+/g, ' ')
				.trim() ||
			$('meta[name="description"]').attr('content')?.trim() ||
			'';

		// Chapters + latest update
		const chapters: Chapter[] = [];
		const seen = new Set<string>();

		$('#chapterlist li').each((_, li) => {
			const $li = $(li);
			const a = $li.find('a[href*="-chapter-"]').first();
			const href = a.attr('href') || '';
			if (!href) return;

			const id = this.cleanId(href);
			if (seen.has(id)) return;
			seen.add(id);

			let number = parseFloat(String($li.attr('data-num') || ''));
			if (!Number.isFinite(number)) {
				const fromPath = id.match(/-chapter-(\d+(?:\.\d+)?(?:-\d+)?)/i);
				// "26-1" → 26.1
				if (fromPath) {
					const raw = fromPath[1].replace('-', '.');
					number = parseFloat(raw);
				} else {
					number = this.parseChapterNumber(
						a.find('.chapternum').text() || a.text()
					);
				}
			}
			if (!Number.isFinite(number) || number < 0) number = chapters.length + 1;

			const date =
				a.find('.chapterdate').text().replace(/\s+/g, ' ').trim() || '';

			// Bersihkan emoji lock di chapternum
			let chTitle =
				a
					.find('.chapternum')
					.text()
					.replace(/\s+/g, ' ')
					.replace(/🔒/g, '')
					.trim() || `Chapter ${number}`;

			chapters.push({
				id,
				title: /chapter/i.test(chTitle) ? chTitle : `Chapter ${number}`,
				number,
				date
			});
		});

		chapters.sort((a, b) => (b.number || 0) - (a.number || 0));

		const latestChapter = chapters[0]?.number;
		const latestUpdate = chapters[0]?.date || '';

		const description = [
			alt && `Alternative: ${alt}`,
			rating && `Rating: ${rating}`,
			latestUpdate && `Latest update: ${latestUpdate}`,
			latestChapter != null && `Latest chapter: ${latestChapter}`,
			synopsis
		]
			.filter(Boolean)
			.join('\n\n');

		console.log(
			`[luvyaa] details ${path} → rating=${rating}, status=${status}, type=${type}, alt=${!!alt}, ch=${chapters.length}, latest=${latestUpdate}`
		);

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
		if (!/-chapter-[\d.]+/i.test(path)) {
			console.error('[luvyaa] not a chapter path:', chapterId);
			return [];
		}

		try {
			const html = await this.fetchHtml(path.endsWith('/') ? path : `${path}/`);
			const urls: string[] = [];
			const seen = new Set<string>();

			const push = (raw: string) => {
				let src = String(raw || '').trim();
				if (!src || src.startsWith('data:')) return;
				src = this.absUrl(src);
				if (!/^https?:\/\//i.test(src)) return;
				// buang UI / reaction / logo / tracking
				if (
					/logo|icon|avatar|ads|banner|spinner|placeholder|favicon|discord|histats|reaction-|readerarea\.svg|Luvyaa-/i.test(
						src
					)
				) {
					return;
				}
				// prioritaskan CDN page, tolak wp-content reaction
				if (/\/wp-content\//i.test(src) && !/cdn-nyaa/i.test(src)) return;
				if (seen.has(src)) return;
				seen.add(src);
				urls.push(src);
			};

			// 1) Themesia: ts_reader.run({ sources: [{ images: [...] }] })
			const tsMatch = html.match(/ts_reader\.run\(\s*(\{[\s\S]*?\})\s*\)\s*;/);
			if (tsMatch?.[1]) {
				try {
					const data = JSON.parse(tsMatch[1]);
					const sources = data?.sources;
					if (Array.isArray(sources)) {
						for (const src of sources) {
							const images = src?.images;
							if (!Array.isArray(images)) continue;
							for (const img of images) push(String(img));
							if (urls.length) break; // server pertama yang ada gambar
						}
					}
				} catch (e) {
					console.warn('[luvyaa] ts_reader JSON parse failed', e);
				}
			}

			// 2) Fallback: isi <noscript> di #readerarea
			if (urls.length < 3) {
				const nsMatch = html.match(
					/id=["']readerarea["'][\s\S]*?<noscript>([\s\S]*?)<\/noscript>/i
				);
				if (nsMatch?.[1]) {
					const $ns = cheerio.load(nsMatch[1]);
					$ns('img').each((_, img) => {
						push(this.imgSrc($ns(img)));
					});
				}
			}

			// 3) Fallback terakhir: selector biasa
			if (urls.length < 3) {
				const $ = cheerio.load(html);
				const selectors = [
					'#readerarea noscript img',
					'#readerarea img',
					'.maincontent img',
					'img.ts-main-image'
				];
				for (const sel of selectors) {
					$(sel).each((_, img) => push(this.imgSrc($(img))));
					if (urls.length > 5) break;
				}
			}

			console.log(`[luvyaa] ${urls.length} pages → ${path}`);
			return urls;
		} catch (e) {
			console.error('[luvyaa] getChapterPages', path, e);
			return [];
		}
	}
}