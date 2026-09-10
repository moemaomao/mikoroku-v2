import { BaseSource } from '../BaseSource';
import type { Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * Hitomi.la adapter (CF Workers optimized)
 *
 * List  : galleryblock saja (1 req/item)
 * Detail: galleries/{id}.js
 * Pages : hash + gg.js → CDN
 * Cover : webpsmalltn (~16KB)
 * Tags  : female:xxx / male:xxx untuk UI split
 *
 * ID format: "/{numericId}"
 */
export class HitomiSource extends BaseSource {
	id = 'hitomi';
	name = 'Hitomi.la';
	baseUrl = 'https://hitomi.la';

	private readonly ltn = 'https://ltn.gold-usergeneratedcontent.net';
	private readonly cdn = 'gold-usergeneratedcontent.net';

	private ggB = '';
	private ggM = new Set<number>();
	private ggO = 0;
	private ggLoadedAt = 0;

	private readonly PER_PAGE = 24;
	private readonly CONCURRENCY = 6;

	// ── HTTP ─────────────────────────────────────────────────────────────────

	private h(): Record<string, string> {
		return {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
			Referer: 'https://hitomi.la/',
			Accept: '*/*'
		};
	}

	private async getText(url: string): Promise<string> {
		const res = await fetch(url, { headers: this.h() });
		if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
		return res.text();
	}

	private async getBuf(url: string, range: string): Promise<ArrayBuffer> {
		const res = await fetch(url, {
			headers: { ...this.h(), Range: range }
		});
		if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status} ${url}`);
		return res.arrayBuffer();
	}

	// ── Nozomi / gg.js ───────────────────────────────────────────────────────

	private parseNozomi(buf: ArrayBuffer): number[] {
		const view = new DataView(buf);
		const ids: number[] = [];
		for (let i = 0; i + 4 <= view.byteLength; i += 4) {
			ids.push(view.getInt32(i, false));
		}
		return ids;
	}

	private async ensureGg(): Promise<void> {
		const now = Date.now();
		if (this.ggB && now - this.ggLoadedAt < 30 * 60 * 1000) return;

		const js = await this.getText(`${this.ltn}/gg.js?_=${now}`);
		const bMatch = js.match(/b:\s*['"]([^'"]+)['"]/);
		this.ggB = bMatch?.[1] || '';

		this.ggM.clear();
		for (const m of js.matchAll(/case\s+(\d+):/g)) {
			this.ggM.add(parseInt(m[1], 10));
		}

		const oMatch = js.match(/var\s+o\s*=\s*(\d+)/);
		this.ggO = oMatch ? parseInt(oMatch[1], 10) : 0;
		this.ggLoadedAt = now;
	}

	private ggS(hash: string): string {
		const m = hash.match(/(..)(.)$/);
		if (!m) return '0';
		return String(parseInt(m[2] + m[1], 16));
	}

	private imageUrl(hash: string, ext: 'webp' | 'avif' = 'webp'): string {
		const s = this.ggS(hash);
		const flag = this.ggM.has(parseInt(s, 10)) ? 1 : 0;
		const sub = `${ext[0]}${1 + (flag ^ this.ggO)}`;
		return `https://${sub}.${this.cdn}/${this.ggB}${s}/${hash}.${ext}`;
	}

	/** Cover kecil (~16KB). Path webpsmallbigtn = 404. */
	private thumbFromHash(hash: string): string {
		if (!hash) return '';
		const a = hash.slice(-1);
		const b = hash.slice(-3, -1);
		return `https://tn.${this.cdn}/webpsmalltn/${a}/${b}/${hash}.webp`;
	}

	private normalizeCover(url: string): string {
		if (!url) return '';
		let u = url.trim();
		if (u.startsWith('//')) u = `https:${u}`;

		u = u
			.replace(/https?:\/\/tn\.hitomi\.la/gi, `https://tn.${this.cdn}`)
			.replace(/\/\/tn\.hitomi\.la/gi, `https://tn.${this.cdn}`);

		u = u.replace(/\/webpbigtn\//g, '/webpsmalltn/');
		u = u.replace(/\/webpsmallbigtn\//g, '/webpsmalltn/');
		u = u.replace(/\/avifbigtn\//g, '/avifsmalltn/');
		u = u.replace(/\/avifsmallbigtn\//g, '/avifsmalltn/');

		return u;
	}

	// ── Gallery parsing ──────────────────────────────────────────────────────

	private parseGalleryInfo(js: string): any {
		const idx = js.indexOf('{');
		if (idx < 0) throw new Error('no JSON in galleryinfo');
		let raw = js.slice(idx).trim();
		if (raw.endsWith(';')) raw = raw.slice(0, -1);
		return JSON.parse(raw);
	}

	private toId(gid: number | string): string {
		const n = String(gid).replace(/\D/g, '');
		return `/${n}`;
	}

	private extractGid(mangaId: string): string {
		return String(mangaId).replace(/\D/g, '');
	}

	private normalizeType(raw?: string): string | undefined {
		if (!raw) return undefined;
		const t = raw.toLowerCase().trim();
		if (!t) return undefined;

		const map: Record<string, string> = {
			dj: 'doujinshi',
			doujinshi: 'doujinshi',
			manga: 'manga',
			acg: 'artistcg',
			artistcg: 'artistcg',
			'artist cg': 'artistcg',
			gamecg: 'gamecg',
			'game cg': 'gamecg',
			imageset: 'imageset',
			'image set': 'imageset',
			anime: 'anime',
			western: 'western',
			'non-h': 'non-h',
			nonh: 'non-h'
		};
		return map[t] || t;
	}

	/** Map tag Hitomi → female:xxx / male:xxx / plain */
	private mapTag(t: any): string {
		const name = String(t?.tag || '').trim();
		if (!name) return '';
		if (String(t.female) === '1' || t.female === true) return `female:${name}`;
		if (String(t.male) === '1' || t.male === true) return `male:${name}`;
		return name;
	}

	private parseBlock(html: string, gid: number): Manga | null {
		const $ = cheerio.load(html);

		const title = (
			$('h1 a').first().text() ||
			$('a.lillie').first().text() ||
			$('a[href*=".html"]').first().text() ||
			`Gallery ${gid}`
		)
			.replace(/\s+/g, ' ')
			.trim();

		let cover =
			$('img.lazyload').attr('data-src') ||
			$('source[data-srcset]').attr('data-srcset')?.split(/[\s,]+/)[0] ||
			$('img').attr('data-src') ||
			$('img').attr('src') ||
			'';
		cover = this.normalizeCover(cover);

		let typeRaw = '';

		// 1. Coba dari href (paling akurat)
		const href =
			$('a.lillie').attr('href') ||
			$('a[href*=".html"]').first().attr('href') ||
			'';
		const hrefMatch = href.match(
			/\/(doujinshi|manga|artistcg|gamecg|imageset|anime|western|non-h)\//i
		);
		if (hrefMatch) typeRaw = hrefMatch[1];

		// 2. Coba dari class (acg = artistcg, dj = doujinshi)
		if (!typeRaw) {
			const root = $.root().children('div').first();
			const cls = (root.attr('class') || '').toLowerCase();
			const clsMatch = cls.match(
				/\b(dj|acg|doujinshi|manga|artistcg|gamecg|imageset|anime|western|non-h)\b/
			);
			if (clsMatch) typeRaw = clsMatch[1];
		}

		// 3. Coba dari teks di dalam block
		if (!typeRaw) {
			const text = $.root().text().toLowerCase();
			if (text.includes('artist cg') || text.includes('artistcg')) typeRaw = 'artistcg';
			else if (text.includes('game cg') || text.includes('gamecg')) typeRaw = 'gamecg';
			else if (text.includes('doujinshi')) typeRaw = 'doujinshi';
			else if (text.includes('image set') || text.includes('imageset')) typeRaw = 'imageset';
		}

		if (!title) return null;

		return {
			id: this.toId(gid),
			title,
			cover,
			sourceId: this.id,
			type: this.normalizeType(typeRaw) || 'manga',
			status: 'Completed'
		};
	}

	/** List: 1 req (galleryblock). JS hanya fallback. */
	private async loadBrief(gid: number): Promise<Manga | null> {
		try {
			const block = await this.getText(`${this.ltn}/galleryblock/${gid}.html`);
			const m = this.parseBlock(block, gid);
			if (m?.title) return m;
		} catch {
			/* fallback */
		}

		try {
			const js = await this.getText(`${this.ltn}/galleries/${gid}.js`);
			const info = this.parseGalleryInfo(js);
			const hash = info.files?.[0]?.hash || '';
			return {
				id: this.toId(gid),
				title: String(info.title || info.japanese_title || `Gallery ${gid}`).trim(),
				cover: hash ? this.thumbFromHash(hash) : '',
				sourceId: this.id,
				type: this.normalizeType(String(info.type || '')) || 'manga',
				status: 'Completed'
			};
		} catch (e) {
			console.error(`[Hitomi] gid=${gid}`, e);
			return null;
		}
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

private buildNozomiPath(lang = 'all', type = 'all'): string[] {
	const l = (lang || 'all').toLowerCase().trim();
	const t = (type || 'all').toLowerCase().trim();

	const candidates: string[] = [];

	// Type + Language
	if (t !== 'all' && l !== 'all') {
		candidates.push(`${t}-${l}.nozomi`);
		candidates.push(`n/${t}-${l}.nozomi`);
		// tetap coba type saja dulu (lebih reliable)
		candidates.push(`${t}-all.nozomi`);
		candidates.push(`n/${t}-all.nozomi`);
	}
	// Hanya Type
	else if (t !== 'all') {
		candidates.push(`${t}-all.nozomi`);
		candidates.push(`n/${t}-all.nozomi`);
	}
	// Hanya Language
	else if (l !== 'all') {
		candidates.push(`index-${l}.nozomi`);
		candidates.push(`n/index-${l}.nozomi`);
	}

	// Default hanya kalau benar-benar tidak ada filter
	if (t === 'all' && l === 'all') {
		candidates.push('index-all.nozomi');
		candidates.push('n/index-all.nozomi');
	}

	return [...new Set(candidates)];
}

async getLatestManga(page: number, opts?: { lang?: string; type?: string }): Promise<Manga[]> {
	try {
		const p = Math.max(1, Number(page) || 1);
		const per = this.PER_PAGE;
		const start = (p - 1) * per * 4;
		const end = start + per * 4 - 1;

		const lang = opts?.lang || 'all';
		const type = opts?.type || 'all';

		const paths = this.buildNozomiPath(lang, type);
		let buf: ArrayBuffer | null = null;
		let usedPath = '';

		for (const path of paths) {
			try {
				console.log(`[Hitomi] mencoba: ${path}`);
				buf = await this.getBuf(`${this.ltn}/${path}`, `bytes=${start}-${end}`);
				usedPath = path;
				console.log(`[Hitomi] BERHASIL pakai: ${path}`);
				break;
			} catch (e: any) {
				console.warn(`[Hitomi] gagal ${path}:`, e?.message || e);
				continue;
			}
		}

		if (!buf) {
			// Baru fallback ke index-all kalau semua gagal
			console.warn('[Hitomi] semua path type/lang gagal, fallback ke index-all');
			try {
				buf = await this.getBuf(`${this.ltn}/index-all.nozomi`, `bytes=${start}-${end}`);
				usedPath = 'index-all.nozomi';
			} catch {
				console.error('[Hitomi] index-all juga gagal');
				return [];
			}
		}

		const ids = this.parseNozomi(buf);
		if (!ids.length) {
			console.warn(`[Hitomi] nozomi ${usedPath} kosong`);
			return [];
		}

		const out: Manga[] = [];

		for (let i = 0; i < ids.length && out.length < per; i += this.CONCURRENCY) {
			const chunk = ids.slice(i, i + this.CONCURRENCY);
			const rows = await Promise.all(chunk.map((id) => this.loadBrief(id)));
			for (const m of rows) {
				if (m) out.push(m);
				if (out.length >= per) break;
			}
		}

		return out.slice(0, per);
	} catch (e) {
		console.error('[Hitomi] getLatestManga', e);
		return [];
	}
}

	async searchManga(
	query: string,
	opts?: { page?: number; lang?: string; type?: string }
): Promise<Manga[]> {
	const q = (query || '').trim().toLowerCase().replace(/\s+/g, '_');
	const page = Math.max(1, opts?.page || 1);
	const lang = opts?.lang || 'all';
	const type = opts?.type || 'all';

	// Query kosong → treat sebagai latest + filter
	if (!q) return this.getLatestManga(page, { lang, type });

	try {
		let paths: string[] = [];

		if (q.includes(':')) {
			const [ns, ...rest] = q.split(':');
			const val = rest.join(':');
			if (ns === 'language') {
				paths = [`index-${val}.nozomi`, `n/index-${val}.nozomi`];
			} else if (ns === 'type') {
				paths = [`${val}-all.nozomi`, `n/${val}-all.nozomi`];
			} else {
				paths = [`tag/${ns}:${val}-all.nozomi`, `n/tag/${ns}:${val}-all.nozomi`];
			}
		} else {
			// Text teks biasa → pakai filter lang/type
			paths = this.buildNozomiPath(lang, type);
		}

		// Selalu tambahkan fallback
		paths.push('index-all.nozomi');
		paths = [...new Set(paths)];

		const per = this.PER_PAGE;
		const start = (page - 1) * per * 4;
		const end = start + per * 4 - 1;

		let buf: ArrayBuffer | null = null;
		let usedPath = '';

		for (const path of paths) {
			try {
				buf = await this.getBuf(`${this.ltn}/${path}`, `bytes=${start}-${end}`);
				usedPath = path;
				console.log(`[Hitomi] search using nozomi: ${path}`);
				break;
			} catch {
				continue;
			}
		}

		if (!buf) {
			console.error('[Hitomi] search: semua path nozomi gagal');
			return [];
		}

		const ids = this.parseNozomi(buf);
		const out: Manga[] = [];

		for (let i = 0; i < ids.length && out.length < per; i += this.CONCURRENCY) {
			const chunk = ids.slice(i, i + this.CONCURRENCY);
			const rows = await Promise.all(chunk.map((id) => this.loadBrief(id)));
			for (const m of rows) {
				if (!m) continue;
				if (q.includes(':') || m.title.toLowerCase().includes(q.replace(/_/g, ' '))) {
					out.push(m);
				}
				if (out.length >= per) break;
			}
		}

		return out.slice(0, per);
	} catch (e) {
		console.error('[Hitomi] searchManga', e);
		return [];
	}
}

	// ── Details ──────────────────────────────────────────────────────────────
async getMangaDetails(mangaId: string): Promise<MangaDetails> {
	const gid = this.extractGid(mangaId);
	if (!gid) throw new Error(`Invalid Hitomi id: ${mangaId}`);

	const js = await this.getText(`${this.ltn}/galleries/${gid}.js`);
	const info = this.parseGalleryInfo(js);
	await this.ensureGg().catch(() => undefined);

	const title = String(info.title || info.japanese_title || `Gallery ${gid}`).trim();
	const hash = info.files?.[0]?.hash || '';
	const cover = hash ? this.thumbFromHash(hash) : '';

	const artists = (info.artists || []).map((a: any) => a.artist).filter(Boolean);
	const groups = (info.groups || []).map((g: any) => g.group).filter(Boolean);
	const tags = (info.tags || []).map((t: any) => this.mapTag(t)).filter(Boolean);

	const type = this.normalizeType(String(info.type || '')) || 'manga';
	const id = this.toId(gid);
	const pageCount = info.files?.length || 0;

	return {
		id,
		sourceId: this.id,
		title,
		cover,
		type,
		status: 'Completed',
		description: [
			info.japanese_title && `AltTitle: ${info.japanese_title}`,
			type && `Type: ${type}`,
			(info.language_localname || info.language) &&
				`Language: ${info.language_localname || info.language}`,
			artists.length && `Artists: ${artists.join(', ')}`,
			groups.length && `Groups: ${groups.join(', ')}`,
			pageCount && `Pages: ${pageCount}`
		]
			.filter(Boolean)
			.join('\n'),
		authors: artists.length ? artists : groups,
		genres: tags,
		chapters: [
			{
				id,
				title: 'Read',
				number: 1,
				date: info.date || '',
				cover 
			}
		]
	};
}

	// ── Pages ────────────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
		const gid = this.extractGid(chapterId);
		if (!gid) return [];

		const js = await this.getText(`${this.ltn}/galleries/${gid}.js`);
		const info = this.parseGalleryInfo(js);
		await this.ensureGg();

		return (info.files || [])
			.map((f: any) => {
				if (!f?.hash) return '';
				if (f.haswebp !== 0) return this.imageUrl(f.hash, 'webp');
				if (f.hasavif) return this.imageUrl(f.hash, 'avif');
				return this.imageUrl(f.hash, 'webp');
			})
			.filter(Boolean);
	}
}