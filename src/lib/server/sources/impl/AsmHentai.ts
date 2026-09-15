import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * AsmHentai adapter (https://asmhentai.com)
 *
 * List/Latest : /  |  /page/{n}/
 *               /language/{english|japanese|chinese}/  |  .../page/{n}/
 * Search      : /?q=  |  /?q=&page=
 * Detail      : /g/{id}/
 * Pages       : https://images.asmhentai.com/{dir}/{id}/{n}.jpg
 *               (dir + page count dari detail: load_dir, t_pages)
 *
 * ID format:
 *   manga   : "/g/{id}"
 *   chapter : "/g/{id}/chapter/1"  (gallery = 1 chapter)
 *
 * Language filter (pola MangaDex / Hentaifox):
 *   opts.lang → en|ja|zh|english|japanese|chinese
 */
export class AsmHentaiSource extends BaseSource {
	id = 'asmhentai';
	name = 'AsmHentai';
	baseUrl = 'https://asmhentai.com';

	private readonly PER_PAGE = 24;
	private readonly DEFAULT_LANG = 'all';

	// ── HTTP ─────────────────────────────────────────────────────────────────

	private reqHeaders(): Record<string, string> {
		return {
			...this.headers,
			Accept:
				'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9',
			Referer: `${this.baseUrl}/`
		};
	}

	private async getHtml(path: string): Promise<string> {
		const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
		const res = await fetch(url, { headers: this.reqHeaders() });
		if (!res.ok) throw new Error(`AsmHentai HTTP ${res.status} ${path}`);
		return await res.text();
	}

	// ── Language (pola MangaDex) ─────────────────────────────────────────────

	/**
	 * Normalize → slug path language site:
	 *   en/english → english
	 *   ja/jp/japanese → japanese
	 *   zh/cn/chinese → chinese
	 *   all → null (no filter)
	 */
	private normalizeLang(lang?: string): string | null {
		const raw = String(lang || '')
			.trim()
			.toLowerCase();
		if (!raw || raw === 'all' || raw === 'any' || raw === '*') return null;

		const aliases: Record<string, string> = {
			en: 'english',
			english: 'english',
			ja: 'japanese',
			jp: 'japanese',
			japanese: 'japanese',
			zh: 'chinese',
			cn: 'chinese',
			chinese: 'chinese',
			'zh-cn': 'chinese',
			'zh-tw': 'chinese'
		};
		if (aliases[raw]) return aliases[raw];
		if (raw === 'english' || raw === 'japanese' || raw === 'chinese') return raw;
		return null;
	}

	private langCodeFromSlug(slug?: string | null): string {
		const s = String(slug || '').toLowerCase();
		if (s.startsWith('en')) return 'en';
		if (s.startsWith('ja') || s === 'jp') return 'ja';
		if (s.startsWith('zh') || s === 'cn' || s.startsWith('ch')) return 'zh';
		return 'ja';
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private absUrl(href: string): string {
		if (!href) return '';
		if (href.startsWith('http')) return href;
		if (href.startsWith('//')) return `https:${href}`;
		return `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
	}

	private toMangaId(gid: string | number): string {
		return `/g/${String(gid).replace(/\D/g, '')}`;
	}

	private extractGid(mangaId: string): string {
		const m = String(mangaId).match(/\/g\/(\d+)/i);
		if (m) return m[1];
		return String(mangaId).replace(/\D/g, '');
	}

	private toChapterId(gid: string): string {
		return `/g/${gid}/chapter/1`;
	}

	private extractChapterGid(chapterId: string): string {
		const m = String(chapterId).match(/\/g\/(\d+)/i);
		if (m) return m[1];
		return String(chapterId).replace(/\D/g, '');
	}

	private parseList(html: string, fallbackLang?: string | null): Manga[] {
		const $ = cheerio.load(html);
		const res: Manga[] = [];
		const seen = new Set<string>();

		$('.preview_item').each((_, el) => {
			const $el = $(el);

			const href =
				$el.find('.image a[href*="/g/"]').attr('href') ||
				$el.find('a[href*="/g/"]').attr('href') ||
				'';
			const idm = href.match(/\/g\/(\d+)/);
			if (!idm) return;

			const id = this.toMangaId(idm[1]);
			if (seen.has(id)) return;
			seen.add(id);

			const title =
				$el.find('.caption a, .caption, h3 a').first().text().replace(/\s+/g, ' ').trim() ||
				$el.find('a').last().text().replace(/\s+/g, ' ').trim() ||
				`Gallery ${idm[1]}`;

			const img = $el.find('.image img, img').first();
			let cover =
				img.attr('data-src') ||
				img.attr('data-original') ||
				img.attr('src') ||
				'';
			if (cover.startsWith('data:')) {
				cover = img.attr('data-src') || img.attr('data-original') || '';
			}
			cover = this.absUrl(cover);

			const type =
				$el.find('.cl h3 a, a[href*="/category/"]').first().text().replace(/\s+/g, ' ').trim() ||
				'doujinshi';

			const langHref =
				$el.find('a[href*="/language/"]').attr('href') ||
				$el.find('a:has(.flag)').attr('href') ||
				'';
			const langSlug = langHref
				? langHref.replace(/\/$/, '').split('/').pop() || ''
				: fallbackLang || '';
			const lang = this.langCodeFromSlug(langSlug || fallbackLang);

			res.push({
				id,
				sourceId: this.id,
				title,
				cover,
				type: type.toLowerCase() || 'doujinshi',
				status: 'Completed',
				lang
			} as Manga & { lang?: string });
		});

		return res;
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

	async getLatestManga(
		page: number,
		opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		const p = Math.max(1, Number(page) || 1);
		const langSlug = this.normalizeLang(opts?.lang);

		try {
			let path: string;
			if (langSlug) {
				path = p <= 1 ? `/language/${langSlug}/` : `/language/${langSlug}/page/${p}/`;
			} else {
				path = p <= 1 ? '/' : `/page/${p}/`;
			}

			const html = await this.getHtml(path);
			const list = this.parseList(html, langSlug);

			console.log(
				`[asmhentai] latest page=${p} lang=${langSlug ?? 'all'} → ${list.length}`
			);
			return list.slice(0, this.PER_PAGE);
		} catch (e) {
			console.error('[asmhentai] getLatestManga', e);
			return [];
		}
	}

	async searchManga(
		query: string,
		opts?: { page?: number; lang?: string; type?: string }
	): Promise<Manga[]> {
		const q = (query || '').trim();
		const page = Math.max(1, opts?.page || 1);
		const langSlug = this.normalizeLang(opts?.lang);

		if (!q) return this.getLatestManga(page, opts);

		try {
			// Site search: /?q=term  (+ optional language via path filter is limited;
			// append language: term if user filters lang)
			let searchQ = q;
			if (langSlug) {
				// AsmHentai supports language:english style in search box
				if (!/\blanguage:/i.test(searchQ)) {
					searchQ = `${searchQ} language:${langSlug}`;
				}
			}

			const params = new URLSearchParams();
			params.set('q', searchQ);
			if (page > 1) params.set('page', String(page));

			const html = await this.getHtml(`/?${params.toString()}`);
			const list = this.parseList(html, langSlug);

			console.log(
				`[asmhentai] search "${q}" page=${page} lang=${langSlug ?? 'all'} → ${list.length}`
			);
			return list.slice(0, this.PER_PAGE);
		} catch (e) {
			console.error('[asmhentai] searchManga', e);
			return [];
		}
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(
		mangaId: string,
		opts?: { lang?: string }
	): Promise<MangaDetails> {
		const gid = this.extractGid(mangaId);
		if (!gid) throw new Error(`Invalid asmhentai id: ${mangaId}`);

		const html = await this.getHtml(`/g/${gid}/`);
		const $ = cheerio.load(html);

		const title =
			$('h1').first().text().replace(/\s+/g, ' ').trim() ||
			$('.book_page h1, .title').first().text().replace(/\s+/g, ' ').trim() ||
			`Gallery ${gid}`;

		let cover =
			$('.book_page img, .cover img, img[src*="/cover."]').first().attr('src') ||
			$(`img[src*="/${gid}/"]`).first().attr('src') ||
			'';
		cover = this.absUrl(cover);

		const loadDir =
			$('#load_dir').attr('value') ||
			$('input#load_dir').attr('value') ||
			(cover.match(/images\.asmhentai\.com\/(\d+)\//) || [])[1] ||
			'';

		const tPagesRaw =
			$('#t_pages').attr('value') ||
			$('input#t_pages').attr('value') ||
			'';
		let pageCount = parseInt(tPagesRaw, 10) || 0;
		if (!pageCount) {
			const m = $.root().text().match(/Pages:\s*(\d+)/i);
			if (m) pageCount = parseInt(m[1], 10);
		}
		if (!pageCount) {
			pageCount = $(`.preview_thumb a, a[href*="/gallery/${gid}/"]`).length || 1;
		}

		const authors: string[] = [];
		$('a[href*="/artists/"], .tags:contains("Artists") a, a[href*="/artist/"]').each(
			(_, el) => {
				const t = $(el).clone().children().remove().end().text().replace(/\s+/g, ' ').trim();
				if (t && !authors.includes(t)) authors.push(t);
			}
		);

		const genres: string[] = [];
		$('.tag_list a.tag, .tags a.tag, a[href*="/tag/"]').each((_, el) => {
			const t = $(el).clone().children().remove().end().text().replace(/\s+/g, ' ').trim();
			if (t && t.length < 40 && !genres.includes(t)) genres.push(t);
		});

		const type =
			$('a[href*="/category/"]').first().text().replace(/\s+/g, ' ').trim() ||
			'doujinshi';

		const langHref =
			$('a[href*="/language/"]').attr('href') ||
			$('a:has(.flag)').attr('href') ||
			'';
		const langSlug =
			langHref.replace(/\/$/, '').split('/').pop() ||
			this.normalizeLang(opts?.lang) ||
			'japanese';
		const lang = this.langCodeFromSlug(langSlug);

		if (!cover && loadDir) {
			cover = `https://images.asmhentai.com/${loadDir}/${gid}/cover.jpg`;
		}

		const chapters: Chapter[] = [
			{
				id: this.toChapterId(gid),
				title: `Chapter 1`,
				number: 1,
				date: ''
			}
		];

		const metaLines = [
			`Language: ${langSlug}`,
			`Type: ${type.toLowerCase()}`,
			authors[0] && `Author: ${authors.join(', ')}`,
			authors[0] && `Artist: ${authors.join(', ')}`,
			pageCount > 0 && `Pages: ${pageCount}`,
			loadDir && `Dir: ${loadDir}`
		].filter(Boolean);

		// Simpan loadDir di description agar getChapterPages bisa fallback;
		// UI filter META_KEYS tidak kenal "Dir:" → ikut di synopsis; kita buang di parse.
		// Lebih aman: encode di chapter id tidak perlu — fetch ulang detail di pages.

		const description = metaLines.filter((l) => !String(l).startsWith('Dir:')).join('\n');

		console.log(`[asmhentai] details ${gid} pages=${pageCount} dir=${loadDir}`);

		return {
			id: this.toMangaId(gid),
			sourceId: this.id,
			title,
			cover,
			type: type.toLowerCase() || 'doujinshi',
			status: 'Completed',
			description,
			authors,
			genres,
			chapters,
			latestChapter: '1'
		};
	}

	// ── Pages ────────────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
		const gid = this.extractChapterGid(chapterId);
		if (!gid) {
			console.error('[asmhentai] getChapterPages bad id:', chapterId);
			return [];
		}

		try {
			const html = await this.getHtml(`/g/${gid}/`);
			const $ = cheerio.load(html);

			const loadDir =
				$('#load_dir').attr('value') ||
				$('input#load_dir').attr('value') ||
				'';
			const tPagesRaw =
				$('#t_pages').attr('value') ||
				$('input#t_pages').attr('value') ||
				'';
			let pageCount = parseInt(tPagesRaw, 10) || 0;
			if (!pageCount) {
				const m = $.root().text().match(/Pages:\s*(\d+)/i);
				if (m) pageCount = parseInt(m[1], 10);
			}

			if (!loadDir || pageCount < 1) {
				// Fallback: thumb links → full
				const urls: string[] = [];
				$('img[src*="images.asmhentai.com"]').each((_, el) => {
					const src = $(el).attr('src') || $(el).attr('data-src') || '';
					const full = src.replace(/(\d+)t\.(jpg|jpeg|png|webp)$/i, '$1.$2');
					if (
						full.includes(`/${gid}/`) &&
						!/cover|thumb/i.test(full) &&
						/^https?:\/\//i.test(full)
					) {
						urls.push(full);
					}
				});
				const uniq = [...new Set(urls)];
				console.log(`[asmhentai] pages fallback ${uniq.length} → ${gid}`);
				return uniq;
			}

			const urls: string[] = [];
			for (let i = 1; i <= pageCount; i++) {
				urls.push(`https://images.asmhentai.com/${loadDir}/${gid}/${i}.jpg`);
			}

			console.log(`[asmhentai] ${urls.length} pages → ${gid}`);
			return urls;
		} catch (e) {
			console.error('[asmhentai] getChapterPages failed', gid, e);
			return [];
		}
	}
}
