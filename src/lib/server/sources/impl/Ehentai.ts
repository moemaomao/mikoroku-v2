import { BaseSource } from '../BaseSource';
import type { Manga, MangaDetails, Chapter } from '../types';
import * as cheerio from 'cheerio';

/**
 * E-Hentai Adapter
 * https://e-hentai.org
 *
 * Categories (f_cats bitmask):
 *  Misc=1, Doujinshi=2, Manga=4, Artist CG=8, Game CG=16,
 *  Image Set=32, Cosplay=64, Asian Porn=128, Non-H=256, Western=512
 *  All = 1023
 *
 * - List: table.itg  |  pagination via ?next={gid}
 * - Search: /?f_search=...
 * - Gallery: /g/{gid}/{token}/
 * - Metadata API: https://api.e-hentai.org/api.php  (gdata)
 * - Image API: showpage (butuh showkey dari halaman gambar pertama)
 */
export class EhentaiSource extends BaseSource {
	id = 'ehentai';
	name = 'E-Hentai';
	baseUrl = 'https://e-hentai.org';
	private apiUrl = 'https://api.e-hentai.org/api.php';

	/** Semua kategori (bit) */
	private static readonly CAT_ALL = 1023;

	private static readonly CAT_BITS: Record<string, number> = {
		misc: 1,
		doujinshi: 2,
		manga: 4,
		artistcg: 8,
		gamecg: 16,
		imageset: 32,
		cosplay: 64,
		asianporn: 128,
		'non-h': 256,
		nonh: 256,
		western: 512
	};

	private absUrl(href: string): string {
		if (!href) return '';
		if (href.startsWith('http')) return href;
		if (href.startsWith('//')) return `https:${href}`;
		return `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
	}

	/** id format: /g/{gid}/{token}/ */
	private parseGalleryId(
		mangaId: string
	): { gid: number; token: string; path: string } | null {
		const raw = mangaId.trim();
		const m =
			raw.match(/\/g\/(\d+)\/([0-9a-f]+)\/?/i) ||
			raw.match(/^(\d+)\/([0-9a-f]+)$/i);
		if (!m) return null;
		const gid = parseInt(m[1], 10);
		const token = m[2].toLowerCase();
		return { gid, token, path: `/g/${gid}/${token}/` };
	}

	/** Normalisasi label kategori EH → id filter UI */
	private normalizeType(cat: string): string {
		const t = (cat || '').toLowerCase().replace(/\s+/g, '');
		if (t.includes('doujin')) return 'doujinshi';
		if (t === 'manga') return 'manga';
		if (t.includes('artist')) return 'artistcg';
		if (t.includes('game')) return 'gamecg';
		if (t.includes('image')) return 'imageset';
		if (t.includes('cosplay')) return 'cosplay';
		if (t.includes('asian')) return 'asianporn';
		if (t.includes('non')) return 'non-h';
		if (t.includes('western')) return 'western';
		if (t.includes('misc')) return 'misc';
		return t || 'manga';
	}

	/**
	 * f_cats = bitmask kategori yang DI-DISABLE.
	 * Untuk hanya menampilkan 1 kategori: disable semua kecuali kategori itu.
	 */
	private typeToDisabledMask(type?: string): number | null {
		if (!type || type === 'all') return null;
		const bit = EhentaiSource.CAT_BITS[type.toLowerCase().replace(/\s+/g, '')];
		if (bit == null) return null;
		return EhentaiSource.CAT_ALL - bit;
	}

	private buildListPath(query?: string, type?: string, next?: string): string {
		const params = new URLSearchParams();
		if (query) params.set('f_search', query);
		const mask = this.typeToDisabledMask(type);
		if (mask != null) params.set('f_cats', String(mask));
		if (next) params.set('next', next);
		const qs = params.toString();
		return qs ? `/?${qs}` : '/';
	}

	private async postApi<T = any>(body: Record<string, unknown>): Promise<T> {
		const res = await fetch(this.apiUrl, {
			method: 'POST',
			headers: {
				...this.headers,
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Referer: this.baseUrl
			},
			body: JSON.stringify(body)
		});
		if (!res.ok) throw new Error(`EH API ${res.status}`);
		return res.json();
	}

	// ── List parsing ─────────────────────────────────────────────────────────

	private parseList($: cheerio.CheerioAPI): Manga[] {
		const res: Manga[] = [];
		const seen = new Set<string>();

		$('table.itg tr').each((_, tr) => {
			const $tr = $(tr);
			const $a = $tr.find('a[href*="/g/"]').first();
			const href = $a.attr('href') || '';
			const parsed = this.parseGalleryId(href);
			if (!parsed) return;

			const id = parsed.path;
			if (seen.has(id)) return;
			seen.add(id);

			const title =
				$tr.find('.glink').first().text().replace(/\s+/g, ' ').trim() ||
				$a.text().replace(/\s+/g, ' ').trim() ||
				`${parsed.gid}`;

			const $img = $tr.find('img').first();
			let cover = $img.attr('data-src') || $img.attr('src') || '';
			if (cover.startsWith('data:')) cover = $img.attr('data-src') || '';
			cover = this.absUrl(cover);

			const catRaw =
				$tr.find('.cn, .cs').first().text().replace(/\s+/g, ' ').trim() ||
				'Doujinshi';
			const type = this.normalizeType(catRaw);

			res.push({
				id,
				title,
				cover,
				sourceId: this.id,
				type,
				status: 'Completed'
			});
		});

		return res;
	}

	private getNextCursor($: cheerio.CheerioAPI): string | null {
		const href = $('#dnext').attr('href') || '';
		const m = href.match(/[?&]next=(\d+)/);
		return m ? m[1] : null;
	}

	/**
	 * Walk pagination sampai page yang diminta.
	 * EH modern pakai cursor ?next=gid.
	 */
	private async fetchListPage(
		startPath: string,
		page: number
	): Promise<cheerio.CheerioAPI> {
		const p = Math.max(1, page);
		let path = startPath;
		let html = await this.fetchHtml(path);
		let $ = cheerio.load(html);

		for (let i = 1; i < p; i++) {
			const next = this.getNextCursor($);
			if (!next) break;

			const base = startPath.includes('?')
				? startPath.replace(/&?next=\d+/g, '').replace(/\?$/, '')
				: startPath;
			const join = base.includes('?') ? '&' : '?';
			path = `${base}${join}next=${next}`;
			html = await this.fetchHtml(path);
			$ = cheerio.load(html);
		}
		return $;
	}

	async getLatestManga(
		page: number,
		opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			// Filter bahasa di homepage lewat f_search language:
			let query = '';
			if (opts?.lang && opts.lang !== 'all') {
				query = `language:${opts.lang}`;
			}
			const start = this.buildListPath(query || undefined, opts?.type);
			const $ = await this.fetchListPage(start, page);
			return this.parseList($);
		} catch (e) {
			console.error('[ehentai] getLatestManga', e);
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
			let search = q;
			if (opts?.lang && opts.lang !== 'all' && !/language:/i.test(search)) {
				search = `${search} language:${opts.lang}`;
			}
			const start = this.buildListPath(search, opts?.type);
			const $ = await this.fetchListPage(start, page);
			return this.parseList($);
		} catch (e) {
			console.error('[ehentai] searchManga', e);
			return [];
		}
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const parsed = this.parseGalleryId(mangaId);
		if (!parsed) throw new Error(`Invalid E-Hentai id: ${mangaId}`);

		const { gid, token, path } = parsed;

		let title = `${gid}`;
		let titleJpn = '';
		let cover = '';
		let category = 'doujinshi';
		let rating = '0.0';
		let filecount = 0;
		let tags: string[] = [];
		let uploader = '';

		try {
			const data = await this.postApi<{
				gmetadata?: Array<Record<string, any>>;
			}>({
				method: 'gdata',
				gidlist: [[gid, token]],
				namespace: 1
			});
			const meta = data?.gmetadata?.[0];
			if (meta && !meta.error) {
				title = meta.title || title;
				titleJpn = meta.title_jpn || '';
				cover = meta.thumb || '';
				category = this.normalizeType(meta.category || category);
				rating = String(meta.rating || '0');
				filecount = parseInt(String(meta.filecount || '0'), 10) || 0;
				uploader = meta.uploader || '';
				if (Array.isArray(meta.tags)) tags = meta.tags.map(String);
			}
		} catch (e) {
			console.error('[ehentai] gdata', e);
		}

		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);

		if (!title || title === `${gid}`) {
			title = $('#gn').text().replace(/\s+/g, ' ').trim() || title;
		}
		if (!titleJpn) {
			titleJpn = $('#gj').text().replace(/\s+/g, ' ').trim();
		}
		if (!cover) {
			const style =
				$('#gd1 > div').attr('style') || $('#gd1').attr('style') || '';
			const bm = style.match(/url\(([^)]+)\)/i);
			if (bm) cover = bm[1].replace(/['"]/g, '').trim();
		}
		if (!category) {
			const catText = $('#gdc .cs, #gdc').text().replace(/\s+/g, ' ').trim();
			if (catText) category = this.normalizeType(catText);
		}
		if (rating === '0.0' || rating === '0') {
			const rl = $('#rating_label').text();
			const rm = rl.match(/([\d.]+)/);
			if (rm) rating = rm[1];
		}
		if (filecount <= 0) {
			const lenText = $('#gdd').text();
			const lm = lenText.match(/Length:\s*(\d+)\s*pages/i);
			if (lm) filecount = parseInt(lm[1], 10);
		}

		if (tags.length === 0) {
			$('#taglist a').each((_, el) => {
				const t = $(el).text().replace(/\s+/g, ' ').trim();
				if (t) tags.push(t);
			});
		}

		const genres = tags.map((t) => {
			const parts = t.split(':');
			return parts.length > 1 ? parts.slice(1).join(':') : t;
		});

		const authors: string[] = [];
		for (const t of tags) {
			if (t.startsWith('artist:')) authors.push(t.slice(7));
			if (t.startsWith('group:')) authors.push(t.slice(6));
		}

		const metaLines = [
			rating && rating !== '0' ? `Rating: ${parseFloat(rating).toFixed(1)}` : '',
			`Status: Completed`,
			`Type: ${category}`,
			filecount > 0 ? `Pages: ${filecount}` : '',
			uploader ? `Uploader: ${uploader}` : '',
			titleJpn ? `AltTitle: ${titleJpn}` : ''
		].filter(Boolean);

		const description = metaLines.join('\n');

		const chapters: Chapter[] = [
			{
				id: path,
				title: filecount > 0 ? `Read (${filecount} pages)` : 'Read',
				number: 1,
				date: ''
			}
		];

		return {
			id: path,
			sourceId: this.id,
			title,
			cover: this.absUrl(cover),
			type: category,
			status: 'Completed',
			description,
			authors,
			genres,
			chapters
		};
	}

	// ── Pages ────────────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
		const parsed = this.parseGalleryId(chapterId);
		if (!parsed) throw new Error(`Invalid E-Hentai chapter id: ${chapterId}`);

		const { gid, path } = parsed;

		// 1) Kumpulkan semua imgkey dari thumbnail pages (?p=0,1,2…)
		const imgKeys: string[] = [];
		let p = 0;
		let emptyStreak = 0;

		while (p < 50 && emptyStreak < 2) {
			const pagePath = p === 0 ? path : `${path}?p=${p}`;
			const html = await this.fetchHtml(pagePath);
			const $ = cheerio.load(html);

			let found = 0;
			$('#gdt a[href*="/s/"], .gdtm a[href*="/s/"], .gdtl a[href*="/s/"]').each(
				(_, el) => {
					const href = $(el).attr('href') || '';
					const m = href.match(/\/s\/([0-9a-f]+)\/(\d+)-(\d+)/i);
					if (m) {
						const key = m[1].toLowerCase();
						const pageNum = parseInt(m[3], 10);
						if (!imgKeys[pageNum - 1]) {
							imgKeys[pageNum - 1] = key;
							found++;
						}
					}
				}
			);

			if (found === 0) emptyStreak++;
			else emptyStreak = 0;

			const lenText = $('#gdd').text();
			const lm = lenText.match(/Length:\s*(\d+)\s*pages/i);
			const total = lm ? parseInt(lm[1], 10) : 0;
			if (total > 0 && imgKeys.filter(Boolean).length >= total) break;

			p++;
		}

		const keys = imgKeys.filter(Boolean);
		if (keys.length === 0) return [];

		// 2) Ambil showkey dari halaman gambar pertama
		const firstUrl = `/s/${keys[0]}/${gid}-1`;
		const firstHtml = await this.fetchHtml(firstUrl);
		const skMatch = firstHtml.match(/var\s+showkey\s*=\s*"([^"]+)"/);
		const showkey = skMatch?.[1] || '';

		const pages: string[] = [];

		const $first = cheerio.load(firstHtml);
		const firstSrc = $first('#img').attr('src') || '';
		if (firstSrc) pages.push(firstSrc);

		if (!showkey) {
			// Fallback: fetch tiap halaman gambar
			for (let i = 1; i < keys.length; i++) {
				const html = await this.fetchHtml(`/s/${keys[i]}/${gid}-${i + 1}`);
				const $ = cheerio.load(html);
				const src = $('#img').attr('src') || '';
				if (src) pages.push(src);
			}
			return pages;
		}

		// 3) showpage API untuk sisa halaman
		for (let i = 1; i < keys.length; i++) {
			try {
				const data = await this.postApi<{ i3?: string }>({
					method: 'showpage',
					gid,
					page: i + 1,
					imgkey: keys[i],
					showkey
				});
				const i3 = data?.i3 || '';
				const srcMatch = i3.match(/src="([^"]+)"/i);
				if (srcMatch?.[1]) {
					pages.push(srcMatch[1].replace(/&amp;/g, '&'));
				}
			} catch (e) {
				console.error(`[ehentai] showpage ${i + 1}`, e);
			}
		}

		return pages;
	}
}