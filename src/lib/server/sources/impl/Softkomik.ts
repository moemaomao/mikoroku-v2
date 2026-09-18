import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

export class SoftkomikSource extends BaseSource {
	id = 'softkomik';
	name = 'Softkomik';
	baseUrl = 'https://softkomik.co';

	private readonly coverBase = 'https://cover.softdevices.my.id/softkomik-cover/';
	private readonly PER_PAGE = 24;

	private absUrl(url: string): string {
		if (!url) return '';
		if (url.startsWith('http')) return url;
		if (url.startsWith('//')) return `https:${url}`;
		if (url.startsWith('/_next/image')) {
			try {
				const u = new URL(url, this.baseUrl);
				const real = u.searchParams.get('url');
				if (real) return decodeURIComponent(real);
			} catch {
				/* ignore */
			}
		}
		if (url.includes('cover') || url.includes('image-') || url.includes('members/') || url.includes('uploads-')) {
			return `${this.coverBase}${url.replace(/^\//, '')}`;
		}
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
		return id.replace(/\/+$/, '').split('?')[0] || '/';
	}

	private normalizeTitle(raw: string): string {
		if (!raw) return '';
		return raw
			.trim()
			.replace(/\s+/g, ' ')
			.replace(/\s*[-|]\s*Softkomik.*$/i, '')
			.replace(/\s*Bahasa Indonesia.*$/i, '')
			.trim();
	}

	private parseChapterNumber(text: string, path = ''): number {
		const fromPath = path.match(/\/chapter\/(\d+)(?:[.-](\d+))?/i);
		if (fromPath) {
			const major = parseInt(fromPath[1], 10);
			if (fromPath[2] != null) return parseFloat(`${major}.${fromPath[2]}`);
			return major;
		}
		const m = String(text).match(/(?:chapter|chap|ch\.?)\s*(\d+)(?:[.,](\d+))?/i);
		if (m) {
			if (m[2] != null) return parseFloat(`${m[1]}.${m[2]}`);
			return parseInt(m[1], 10);
		}
		const n = String(text).match(/\b(\d+(?:\.\d+)?)\b/);
		return n ? parseFloat(n[1]) : 0;
	}

	private extractNextData(html: string): any {
		const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
		if (!m) return null;
		try {
			return JSON.parse(m[1]);
		} catch {
			return null;
		}
	}

	private mapItem(item: any): Manga | null {
		if (!item || !item.title_slug) return null;
		const id = `/${item.title_slug}`;
		const title = this.normalizeTitle(item.title || '');
		if (!title) return null;

		let cover = item.gambar || '';
		if (cover && !cover.startsWith('http')) {
			cover = this.absUrl(cover);
		}

		let type: 'manga' | 'manhwa' | 'manhua' = 'manga';
		const t = (item.type || '').toLowerCase();
		if (t === 'manhwa') type = 'manhwa';
		else if (t === 'manhua') type = 'manhua';

		let status = 'Ongoing';
		const s = (item.status || '').toLowerCase();
		if (/tamat|complete|end|finish/.test(s)) status = 'Completed';

		const latestChapter =
			item.latestChapter ??
			(item.latest_chapter ? this.parseChapterNumber(String(item.latest_chapter)) : undefined);

		return {
			id,
			title,
			cover,
			sourceId: this.id,
			status,
			type,
			latestChapter: latestChapter && latestChapter > 0 ? latestChapter : undefined
		};
	}

	async getLatestManga(page: number): Promise<Manga[]> {
		const path =
			page <= 1
				? `${this.baseUrl}/komik/update`
				: `${this.baseUrl}/komik/update?page=${page}`;
		const html = await this.fetchHtml(path);
		const next = this.extractNextData(html);
		const list =
			next?.props?.pageProps?.initialData?.data ||
			next?.props?.pageProps?.data ||
			[];

		const mangas: Manga[] = [];
		const seen = new Set<string>();
		for (const item of list) {
			const m = this.mapItem(item);
			if (m && !seen.has(m.id)) {
				seen.add(m.id);
				mangas.push(m);
			}
		}
		return mangas.slice(0, this.PER_PAGE);
	}

	async searchManga(query: string): Promise<Manga[]> {
		const q = (query || '').trim();
		if (!q) return [];

		const path = `${this.baseUrl}/komik/list?name=${encodeURIComponent(q)}`;
		const html = await this.fetchHtml(path);
		const next = this.extractNextData(html);
		const list =
			next?.props?.pageProps?.initialData?.data ||
			next?.props?.pageProps?.data ||
			[];

		const mangas: Manga[] = [];
		const seen = new Set<string>();
		for (const item of list) {
			const m = this.mapItem(item);
			if (m && !seen.has(m.id)) {
				seen.add(m.id);
				mangas.push(m);
			}
		}

		if (mangas.length === 0) {
			const path2 = `${this.baseUrl}/komik/list`;
			const html2 = await this.fetchHtml(path2);
			const next2 = this.extractNextData(html2);
			const list2 = next2?.props?.pageProps?.initialData?.data || [];
			for (const item of list2) {
				const title = (item.title || '').toLowerCase();
				if (title.includes(q.toLowerCase())) {
					const m = this.mapItem(item);
					if (m && !seen.has(m.id)) {
						seen.add(m.id);
						mangas.push(m);
					}
				}
			}
		}

		return mangas.slice(0, this.PER_PAGE);
	}

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
	const path = this.cleanId(
		mangaId.startsWith('/') ? mangaId : `/${mangaId.replace(/^\//, '')}`
	);
	const html = await this.fetchHtml(path);
	const next = this.extractNextData(html);
	const data = next?.props?.pageProps?.data || {};

	const title = this.normalizeTitle(data.title || path);
	let cover = data.gambar || '';
	if (cover && !cover.startsWith('http')) cover = this.absUrl(cover);
	if (!cover) {
		const $ = cheerio.load(html);
		cover = this.absUrl(
			$('meta[property="og:image"]').attr('content') ||
				$('img').first().attr('src') ||
				''
		);
	}

	let description = (data.sinopsis || '').replace(/\s+/g, ' ').trim();
	if (!description) {
		const $ = cheerio.load(html);
		description =
			$('meta[name="description"]').attr('content') ||
			$('[class*="sinopsis"], [class*="info"]').text().replace(/\s+/g, ' ').trim() ||
			'';
	}

	let status = 'Ongoing';
	const s = (data.status || '').toLowerCase();
	if (/tamat|complete|end|finish/.test(s)) status = 'Completed';

	const authors: string[] = [];
	if (data.author) {
		String(data.author)
			.split(/,|\//)
			.forEach((a: string) => {
				const t = a.trim();
				if (t) authors.push(t);
			});
	}

	const genres: string[] = Array.isArray(data.Genre) ? data.Genre : [];

	let type: 'manga' | 'manhwa' | 'manhua' = 'manga';
	const t = (data.type || '').toLowerCase();
	if (t === 'manhwa') type = 'manhwa';
	else if (t === 'manhua') type = 'manhua';

	const chapters: Chapter[] = [];
	const seen = new Set<string>();

	// 1) Coba ambil dari HTML dulu (kalau ada)
	const $ = cheerio.load(html);
	$('a[href*="/chapter/"]').each((_, a) => {
		const href = $(a).attr('href') || '';
		const id = this.cleanId(href);
		if (seen.has(id) || !id.includes('/chapter/')) return;
		seen.add(id);
		const chapterTitle =
			$(a).text().replace(/\s+/g, ' ').trim() || `Chapter ${chapters.length + 1}`;
		const number = this.parseChapterNumber(chapterTitle, id) || chapters.length + 1;
		chapters.push({ id, title: chapterTitle, number, date: '' });
	});

	// 2) Kalau cuma sedikit / kosong → generate dari latest_chapter
	const latestRaw = data.latest_chapter || data.latestChapter;
	const latestNum = this.parseChapterNumber(String(latestRaw || '0'));

	if (chapters.length < 2 && latestNum > 0) {
		chapters.length = 0;
		seen.clear();

		// Generate chapter 1 .. latest (integer)
		// Softkomik pakai zero-pad 3 digit untuk chapter bulat: 001, 041, 124
		for (let i = 1; i <= Math.floor(latestNum); i++) {
			const padded = String(i).padStart(3, '0');
			const id = `${path}/chapter/${padded}`;
			if (seen.has(id)) continue;
			seen.add(id);
			chapters.push({
				id,
				title: `Chapter ${i}`,
				number: i,
				date: ''
			});
		}

		// Kalau latest ada desimal (mis. 10.3) tambahkan juga
		if (latestNum % 1 !== 0) {
			const major = Math.floor(latestNum);
			const minor = String(latestNum).split('.')[1];
			const padded = `${String(major).padStart(3, '0')}.${minor}`;
			const id = `${path}/chapter/${padded}`;
			if (!seen.has(id)) {
				chapters.push({
					id,
					title: `Chapter ${latestNum}`,
					number: latestNum,
					date: ''
				});
			}
		}
	}

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
		type,
		latestChapter: chapters.length
			? chapters[chapters.length - 1].number
			: latestNum || undefined
	};
}

	/**
 * Replace SoftkomikSource.getChapterPages with this full method.
 * Captures Set-Cookie from site visit, then session → imgs API.
 */

async getChapterPages(chapterId: string): Promise<string[]> {
	const UA =
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

	const collectCookies = (res: Response, jar: Map<string, string>) => {
		const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] };
		const lines: string[] = [];
		if (typeof anyHeaders.getSetCookie === 'function') {
			lines.push(...anyHeaders.getSetCookie());
		}
		res.headers.forEach((value, key) => {
			if (key.toLowerCase() === 'set-cookie') lines.push(value);
		});
		const single = res.headers.get('set-cookie');
		if (single && !lines.includes(single)) lines.push(single);

		for (const line of lines) {
			const m = String(line).match(/^([^=]+)=([^;]*)/);
			if (m) jar.set(m[1].trim(), m[2].trim());
		}
	};

	const cookieHeader = (jar: Map<string, string>) =>
		[...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

	try {
		const path = this.cleanId(chapterId.startsWith('/') ? chapterId : `/${chapterId}`);
		const jar = new Map<string, string>();

		// 1) Visit chapter page (sets anti-bot cookies) + parse __NEXT_DATA__
		const pageRes = await fetch(`${this.baseUrl}${path}`, {
			headers: {
				'User-Agent': UA,
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9',
				Referer: `${this.baseUrl}/`
			}
		});
		collectCookies(pageRes, jar);
		const html = await pageRes.text();
		const next = this.extractNextData(html);
		const pageData = next?.props?.pageProps?.data || {};

		const slug =
			pageData?.komik?.title_slug ||
			path.split('/').filter(Boolean)[0] ||
			'';
		const chapter =
			pageData?.chapter ||
			path.split('/').filter(Boolean).pop() ||
			'';
		const chapterDataId = pageData?.data?._id || '';

		if (!slug || !chapter || !chapterDataId) {
			console.warn('[softkomik] missing slug/chapter/id', { slug, chapter, chapterDataId });
			return [];
		}

		// 2) Warm homepage cookies too
		try {
			const homeRes = await fetch(`${this.baseUrl}/`, {
				headers: {
					'User-Agent': UA,
					Accept: 'text/html',
					Referer: `${this.baseUrl}/`,
					Cookie: cookieHeader(jar)
				}
			});
			collectCookies(homeRes, jar);
		} catch {
			/* ignore */
		}

		// 3) Session token (requires cookies — plain fetch without jar → 404)
		const sessRes = await fetch(`${this.baseUrl}/api/session/chapter/oaisos`, {
			headers: {
				'User-Agent': UA,
				Accept: 'application/json, text/plain, */*',
				Origin: this.baseUrl,
				Referer: `${this.baseUrl}/`,
				Cookie: cookieHeader(jar)
			}
		});
		collectCookies(sessRes, jar);

		if (!sessRes.ok) {
			console.warn('[softkomik] session failed', sessRes.status, 'cookies', jar.size);
			return [];
		}

		const sess: any = await sessRes.json();
		const token = sess?.token || '';
		let sign = String(sess?.sign || '');
		if (sign.includes('|oiq&')) sign = sign.split('|oiq&')[0];

		if (!token || !sign) {
			console.warn('[softkomik] session missing token/sign');
			return [];
		}

		// 4) Images API
		const apiUrl =
			`https://api.softkomik.org/komik/` +
			`${encodeURIComponent(slug)}/chapter/${encodeURIComponent(chapter)}/imgs/${encodeURIComponent(chapterDataId)}`;

		const res = await fetch(apiUrl, {
			headers: {
				'User-Agent': UA,
				Accept: 'application/json, text/plain, */*',
				Origin: this.baseUrl,
				Referer: `${this.baseUrl}/`,
				'X-Token': token,
				'X-Sign': sign,
				Cookie: cookieHeader(jar)
			}
		});

		if (!res.ok) {
			console.warn(`[softkomik] imgs API status ${res.status} → ${apiUrl}`);
			return [];
		}

		const json: any = await res.json();
		const list: string[] = json?.imageSrc || json?.data?.imageSrc || [];
		if (!list.length) {
			console.log(`[softkomik] pages 0 → ${path}`);
			return [];
		}

		const storageInter2 = pageData?.data?.storageInter2;
		const backBS3 = pageData?.data?.backBS3;
		const cdnBase =
			storageInter2 || !backBS3
				? 'https://image.komik.im/softkomik'
				: 'https://psy1.komik.im';

		const pages = list
			.map((src: string) => {
				if (!src) return '';
				if (src.startsWith('http')) return src;
				return `${cdnBase}/${src.replace(/^\//, '')}`;
			})
			.filter(Boolean);

		console.log(`[softkomik] ${pages.length} pages → ${path}`);
		return pages;
	} catch (e) {
		console.error('[softkomik] getChapterPages fatal:', e);
		return [];
	}
}
}