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
 */
export class EhentaiSource extends BaseSource {
	id = 'ehentai';
	name = 'E-Hentai';
	baseUrl = 'https://e-hentai.org';
	private apiUrl = 'https://api.e-hentai.org/api.php';

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

	protected getHeaders(): Record<string, string> {
		return {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
			Accept:
				'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
			Referer: this.baseUrl + '/',
			'Cache-Control': 'no-cache',
			Pragma: 'no-cache',
			// Cookie: ganti / hapus kalau expired
			Cookie: 'ipb_member_id=0205118; ipb_pass_hash=cead3ccaa9993b8ecc7074c5a7500c;'
		};
	}

	private absUrl(href: string): string {
		if (!href) return '';
		if (href.startsWith('http')) return href;
		if (href.startsWith('//')) return `https:${href}`;
		return `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
	}

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

	private typeToDisabledMask(type?: string): number | null {
		if (!type || type === 'all') return null;
		const bit = EhentaiSource.CAT_BITS[type.toLowerCase().replace(/\s+/g, '')];
		if (bit == null) return null;
		return EhentaiSource.CAT_ALL - bit;
	}

	private buildListPath(query?: string, type?: string, next?: string): string {
		const params = new URLSearchParams();

		if (query) {
			params.set('f_search', query);
		}

		params.set('f_s', 'f_pub');
		params.set('f_sf', '1');

		const mask = this.typeToDisabledMask(type);
		if (mask != null) {
			params.set('f_cats', String(mask));
		}

		if (next) {
			params.set('next', next);
		}

		const qs = params.toString();
		return qs ? `/index.php?${qs}` : '/index.php';
	}

	private async postApi<T = any>(body: Record<string, unknown>): Promise<T> {
		const res = await fetch(this.apiUrl, {
			method: 'POST',
			headers: {
				...this.headers,
				'Content-Type': 'application/json',
				Accept: 'application/json'
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

			// Skip header row
			if ($tr.find('th').length > 0) return;

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
			let cover =
				$img.attr('data-src') ||
				$img.attr('data-lazy-src') ||
				$img.attr('src') ||
				'';

			if (cover.startsWith('data:')) {
				cover =
					$img.attr('data-src') ||
					$img.attr('data-lazy-src') ||
					'';
			}
			cover = this.absUrl(cover);

			const catRaw =
				$tr
					.find('.cn, .cs, .gl1c .cn, .gl1e .cn, .glcat .cn')
					.first()
					.text()
					.replace(/\s+/g, ' ')
					.trim() || 'Doujinshi';

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

	private async fetchListPage(
		startPath: string,
		page: number
	): Promise<cheerio.CheerioAPI> {
		const p = Math.max(1, page);
		let path = startPath;
		let html = await this.fetchHtml(path);
		let $ = cheerio.load(html);

		console.log(
			`[ehentai] fetchListPage "${path}" → ${html.length} bytes | has itg: ${html.includes('table.itg')}`
		);

		for (let i = 1; i < p; i++) {
			const next = this.getNextCursor($);
			if (!next) {
				console.warn(`[ehentai] no next cursor at page ${i}`);
				break;
			}

			const base = startPath.includes('?')
				? startPath.replace(/&?next=\d+/g, '').replace(/\?$/, '')
				: startPath;
			const join = base.includes('?') ? '&' : '?';
			path = `${base}${join}next=${next}`;
			html = await this.fetchHtml(path);
			$ = cheerio.load(html);

			console.log(
				`[ehentai] page ${i + 1} → ${html.length} bytes | has itg: ${html.includes('table.itg')}`
			);
		}
		return $;
	}

	async getLatestManga(
		page: number,
		opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			let query = '';
			if (opts?.lang && opts.lang !== 'all') {
				query = `language:${opts.lang}`;
			}
			const start = this.buildListPath(query || undefined, opts?.type);
			const $ = await this.fetchListPage(start, page);
			const list = this.parseList($);
			console.log(`[ehentai] getLatestManga page=${page} → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[ehentai] getLatestManga error:', e);
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
			const list = this.parseList($);
			console.log(`[ehentai] searchManga "${q}" page=${page} → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[ehentai] searchManga error:', e);
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
		let posted = ''; // YYYY-MM-DD

		// 1. Coba API dulu
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

				if (Array.isArray(meta.tags)) {
					tags = meta.tags.map(String);
				}

				// posted = unix timestamp
				if (meta.posted) {
					const ts = parseInt(String(meta.posted), 10);
					if (ts > 0) {
						posted = new Date(ts * 1000).toISOString().slice(0, 10);
					}
				}
			}
		} catch (e) {
			console.error('[ehentai] gdata failed:', e);
		}

		// 2. Fallback / complement dari HTML
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
		if (!category || category === 'doujinshi') {
			const catText = $('#gdc .cs, #gdc .cn, #gdc')
				.text()
				.replace(/\s+/g, ' ')
				.trim();
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

		// Posted date fallback dari HTML
		if (!posted) {
			const postedRow = $('#gdd tr')
				.filter((_, el) => $(el).text().toLowerCase().includes('posted'))
				.first()
				.text();
			const pm = postedRow.match(/Posted:\s*([\d-]+)/i);
			if (pm) posted = pm[1].trim();
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
			posted ? `Posted: ${posted}` : '',
			titleJpn ? `AltTitle: ${titleJpn}` : ''
		].filter(Boolean);

		const description = metaLines.join('\n');

		const chapters: Chapter[] = [
			{
				id: path,
				title: filecount > 0 ? `Read (${filecount} pages)` : 'Read',
				number: 1,
				date: posted
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

	// ── 1. Ambil total pages + HTML halaman pertama ──────────────────────────
	const initialHtml = await this.fetchHtml(path);
	const $init = cheerio.load(initialHtml);

	let totalPages = 0;
	const lenText = $init('#gdd').text();
	const lm = lenText.match(/Length:\s*(\d+)\s*pages/i);
	if (lm) totalPages = parseInt(lm[1], 10);

	if (totalPages === 0) {
		// fallback dari API kalau HTML gagal
		try {
			const data = await this.postApi<{ gmetadata?: any[] }>({
				method: 'gdata',
				gidlist: [[gid, parsed.token]],
				namespace: 1
			});
			totalPages = parseInt(String(data?.gmetadata?.[0]?.filecount || '0'), 10) || 0;
		} catch {}
	}

	if (totalPages === 0) {
		console.warn('[ehentai] totalPages = 0, abort');
		return [];
	}

	console.log(`[ehentai] totalPages = ${totalPages}`);

	// ── 2. Hitung berapa halaman thumbnail yang dibutuhkan ───────────────────
	// Default EH biasanya 20 thumbnail per page
	const THUMBS_PER_PAGE = 20;
	const maxThumbPage = Math.ceil(totalPages / THUMBS_PER_PAGE); // 0-based → max p = maxThumbPage-1

	const imgKeys: string[] = new Array(totalPages);

	// ── 3. Ambil semua imgkey dari setiap halaman thumbnail ───────────────────
	for (let p = 0; p < maxThumbPage; p++) {
		const pagePath = p === 0 ? path : `${path}?p=${p}`;
		const html = p === 0 ? initialHtml : await this.fetchHtml(pagePath);
		const $ = cheerio.load(html);

		let foundOnThisPage = 0;

		// Selector paling stabil saat ini
		$('#gdt a[href*="/s/"]').each((_, el) => {
			const href = $(el).attr('href') || '';
			const m = href.match(/\/s\/([0-9a-f]+)\/(\d+)-(\d+)/i);
			if (m) {
				const key = m[1].toLowerCase();
				const pageNum = parseInt(m[3], 10); // 1-based

				if (pageNum >= 1 && pageNum <= totalPages && !imgKeys[pageNum - 1]) {
					imgKeys[pageNum - 1] = key;
					foundOnThisPage++;
				}
			}
		});

		console.log(
			`[ehentai] thumb page p=${p} → found ${foundOnThisPage} keys | total collected: ${imgKeys.filter(Boolean).length}/${totalPages}`
		);

		// Kalau sudah lengkap, berhenti lebih awal
		if (imgKeys.filter(Boolean).length >= totalPages) break;
	}

	const keys = imgKeys.filter(Boolean);

	if (keys.length === 0) {
		console.warn('[ehentai] no imgkeys found at all');
		return [];
	}

	if (keys.length < totalPages) {
		console.warn(
			`[ehentai] WARNING: only got ${keys.length}/${totalPages} imgkeys. Beberapa halaman mungkin hilang.`
		);
	}

	// ── 4. Ambil showkey dari page pertama ───────────────────────────────────
	const firstUrl = `/s/${keys[0]}/${gid}-1`;
	const firstHtml = await this.fetchHtml(firstUrl);
	const skMatch = firstHtml.match(/var\s+showkey\s*=\s*"([^"]+)"/);
	const showkey = skMatch?.[1] || '';

	const pages: string[] = [];

	// Page 1
	const $first = cheerio.load(firstHtml);
	const firstSrc = $first('#img').attr('src') || '';
	if (firstSrc) pages.push(firstSrc);

	// ── 5. Ambil sisa halaman ────────────────────────────────────────────────
	if (!showkey) {
		console.warn('[ehentai] no showkey → fallback sequential /s/ fetch');
		for (let i = 1; i < keys.length; i++) {
			try {
				const html = await this.fetchHtml(`/s/${keys[i]}/${gid}-${i + 1}`);
				const $ = cheerio.load(html);
				const src = $('#img').attr('src') || '';
				if (src) pages.push(src);
			} catch (e) {
				console.error(`[ehentai] fallback page ${i + 1} failed:`, e);
			}
		}
		return pages;
	}

	// Pakai API showpage (lebih cepat & efisien)
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
			} else {
				console.warn(`[ehentai] showpage ${i + 1} no src found`);
			}
		} catch (e) {
			console.error(`[ehentai] showpage ${i + 1} failed:`, e);
		}
	}

	console.log(`[ehentai] final result: ${pages.length} / ${totalPages} pages`);
	return pages;
}
}