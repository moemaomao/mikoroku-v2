import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';

/**
 * MangaPanda.onl adapter (MangaHub GraphQL API)
 *
 * Site     : https://mangapanda.onl
 * API      : https://api.mghcdn.com/graphql
 * Auth     : Cookie/header x-mhub-access from mangapanda.onl
 * Thumbs   : https://thumb.mghcdn.com/{path}
 * Pages    : https://imgx.mghcdn.com/{prefix}{file}
 *
 * ID format:
 *   manga   : "/manga/{slug}"
 *   chapter : "/manga/{slug}/chapter-{number}"
 */
export class MangaPandaSource extends BaseSource {
	id = 'mangapanda';
	name = 'MangaPanda';
	baseUrl = 'https://mangapanda.onl';

	private readonly API = 'https://api.mghcdn.com/graphql';
	private readonly THUMB = 'https://thumb.mghcdn.com';
	private readonly IMG = 'https://imgx.mghcdn.com';
	private readonly PER_PAGE = 30;
	private readonly DEFAULT_LANG = 'en';

	private accessToken: string | null = null;
	private accessFetchedAt = 0;

	// ── HTTP / GraphQL ───────────────────────────────────────────────────────

	private browserHeaders(): Record<string, string> {
		return {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
			Accept: 'application/json, text/plain, */*',
			'Accept-Language': 'en-US,en;q=0.9',
			Origin: this.baseUrl,
			Referer: `${this.baseUrl}/`
		};
	}

	/** Obtain mhub_access token from site cookie */
	private async ensureAccess(): Promise<string> {
		const now = Date.now();
		if (this.accessToken && now - this.accessFetchedAt < 6 * 60 * 60 * 1000) {
			return this.accessToken;
		}
		const res = await fetch(this.baseUrl + '/', {
			headers: {
				...this.browserHeaders(),
				Accept: 'text/html'
			},
			redirect: 'follow'
		});
		const setCookie =
			typeof res.headers.getSetCookie === 'function'
				? res.headers.getSetCookie().join(';')
				: res.headers.get('set-cookie') || '';
		const m = setCookie.match(/mhub_access=([^;,\s]+)/i);
		if (m) {
			this.accessToken = m[1];
			this.accessFetchedAt = now;
			return this.accessToken;
		}
		// fallback: parse body script if cookie not exposed (Workers)
		const html = await res.text();
		const m2 = html.match(/mhub_access=([a-f0-9]+)/i);
		if (m2) {
			this.accessToken = m2[1];
			this.accessFetchedAt = now;
			return this.accessToken;
		}
		// last resort: random-looking token sometimes still works briefly
		this.accessToken = this.accessToken || '0';
		this.accessFetchedAt = now;
		return this.accessToken;
	}

	private async gql<T = any>(query: string): Promise<T> {
		const token = await this.ensureAccess();
		// Replace _X_ placeholder with a simple client stamp (site uses this)
		const q = query.replace(/x:_X_/g, 'x:1');
		const res = await fetch(this.API, {
			method: 'POST',
			headers: {
				...this.browserHeaders(),
				'Content-Type': 'application/json',
				'x-mhub-access': token
			},
			body: JSON.stringify({ query: q })
		});
		if (!res.ok) {
			const body = await res.text().catch(() => '');
			throw new Error(
				`MangaPanda GraphQL HTTP ${res.status}: ${body.slice(0, 120)}`
			);
		}
		const json: any = await res.json();
		if (json.errors?.length) {
			throw new Error(
				`MangaPanda GraphQL: ${json.errors[0]?.message || 'unknown error'}`
			);
		}
		return json.data as T;
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private thumbUrl(image?: string | null): string {
		if (!image) return '';
		if (image.startsWith('http')) return image;
		return `${this.THUMB}/${image.replace(/^\//, '')}`;
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

	private extractChapter(
		chapterId: string
	): { slug: string; number: number } {
		const parts = String(chapterId)
			.replace(/^\/+/, '')
			.split('/')
			.filter(Boolean);
		// /manga/{slug}/chapter-{n}  or /manga/{slug}/{n}
		let slug = '';
		let numStr = '';
		if (parts[0] === 'manga') {
			slug = parts[1] || '';
			numStr = parts[2] || '';
		} else {
			slug = parts[0] || '';
			numStr = parts[1] || '';
		}
		numStr = numStr.replace(/^chapter-/i, '');
		const number = parseFloat(numStr) || 0;
		return { slug, number };
	}

	private toChapterId(slug: string, number: number | string): string {
		return `/manga/${slug}/chapter-${number}`;
	}

	private mapStatus(raw?: string | number | null): string {
		const s = String(raw ?? '').toLowerCase();
		if (s.includes('complete') || s === '2') return 'Completed';
		if (s.includes('hiatus')) return 'Hiatus';
		return 'Ongoing';
	}

	private mapRow(row: any): Manga {
		const slug = String(row.slug || '');
		const latest =
			typeof row.latestChapter === 'number' && row.latestChapter >= 0
				? String(row.latestChapter)
				: undefined;
		return {
			id: this.toMangaId(slug),
			title: String(row.title || slug),
			cover: this.thumbUrl(row.image),
			sourceId: this.id,
			type: 'manga',
			status: this.mapStatus(row.status),
			latestChapter: latest,
			lang: this.DEFAULT_LANG
		};
	}

	private escapeGql(s: string): string {
		return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

	async getLatestManga(
		page: number,
		_opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			const offset = (p - 1) * this.PER_PAGE;
			// Directory "Updates" uses search with mod:LATEST
			const data: any = await this.gql(
				`{search(x:1,q:"",mod:LATEST,genre:"all",hideNSFW:true,hideYaoi:true,count:true,offset:${offset}){rows{id,rank,title,slug,status,author,genres,image,latestChapter,isLicensed,createdDate},count}}`
			);
			const rows: any[] = data?.search?.rows || [];
			const list = rows
				.filter((r) => r && r.slug && !r.isLicensed)
				.map((r) => this.mapRow(r))
				.slice(0, this.PER_PAGE);
			console.log(`[mangapanda] latest page=${p} → ${list.length}`);
			return list;
		} catch (e) {
			console.error('[mangapanda] getLatestManga', e);
			// Fallback: latestPopular (homepage carousel, no offset)
			if ((Number(page) || 1) === 1) {
				try {
					const data: any = await this.gql(
						`{latestPopular(x:1,hideNSFW:true,hideYaoi:true){id,title,slug,image,latestChapter,isLicensed}}`
					);
					const rows: any[] = data?.latestPopular || [];
					return rows
						.filter((r) => r && r.slug && !r.isLicensed)
						.map((r) => this.mapRow(r));
				} catch (e2) {
					console.error('[mangapanda] latestPopular fallback', e2);
				}
			}
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
			const offset = (page - 1) * this.PER_PAGE;
			const data: any = await this.gql(
				`{search(x:1,q:"${this.escapeGql(q)}",mod:POPULAR,genre:"all",hideNSFW:false,hideYaoi:false,count:true,offset:${offset}){rows{id,rank,title,slug,status,author,genres,image,latestChapter,isLicensed,createdDate},count}}`
			);
			const rows: any[] = data?.search?.rows || [];
			const list = rows
				.filter((r) => r && r.slug)
				.map((r) => this.mapRow(r))
				.slice(0, this.PER_PAGE);
			console.log(`[mangapanda] search "${q}" → ${list.length}`);
			return list;
		} catch (e) {
			console.error('[mangapanda] searchManga', e);
			return [];
		}
	}

	async getMangaDetails(
		mangaId: string,
		_opts?: { lang?: string }
	): Promise<MangaDetails> {
		const slug = this.extractSlug(mangaId);
		if (!slug) throw new Error(`MangaPanda: invalid mangaId ${mangaId}`);

		const data: any = await this.gql(
			`{manga(x:1,slug:"${this.escapeGql(slug)}"){id,rank,title,slug,status,image,latestChapter,author,artist,genres,description,alternativeTitle,mainSlug,isYaoi,isPorn,isSoftPorn,isLicensed,createdDate,updatedDate,chapters{id,number,title,slug,date}}}`
		);
		const m = data?.manga;
		if (!m || !m.slug) {
			throw new Error(`MangaPanda: manga not found ${slug}`);
		}

		const chapters: Chapter[] = [];
		const seen = new Set<string>();
		const rawChapters: any[] = Array.isArray(m.chapters) ? m.chapters : [];

		for (const ch of rawChapters) {
			const num =
				typeof ch.number === 'number' ? ch.number : parseFloat(ch.number);
			if (Number.isNaN(num)) continue;
			const key = String(num);
			if (seen.has(key)) continue;
			seen.add(key);
			chapters.push({
				id: this.toChapterId(m.slug, num),
				title: String(ch.title || `Chapter ${num}`),
				number: num,
				date: ch.date
					? String(ch.date).slice(0, 10)
					: undefined
			});
		}

		// If embedded chapters empty, use chaptersByManga
		if (chapters.length === 0 && m.id) {
			try {
				const d2: any = await this.gql(
					`{chaptersByManga(mangaID:${Number(m.id)}){number,title}}`
				);
				for (const ch of d2?.chaptersByManga || []) {
					const num =
						typeof ch.number === 'number'
							? ch.number
							: parseFloat(ch.number);
					if (Number.isNaN(num)) continue;
					const key = String(num);
					if (seen.has(key)) continue;
					seen.add(key);
					chapters.push({
						id: this.toChapterId(m.slug, num),
						title: String(ch.title || `Chapter ${num}`),
						number: num
					});
				}
			} catch (e) {
				console.error('[mangapanda] chaptersByManga', e);
			}
		}

		chapters.sort((a, b) => (b.number || 0) - (a.number || 0));

		const genres: string[] = [];
		if (Array.isArray(m.genres)) {
			for (const g of m.genres) {
				const t = typeof g === 'string' ? g : g?.title || g?.name;
				if (t) genres.push(String(t));
			}
		}

		const authors: string[] = [];
		if (m.author) authors.push(String(m.author));
		if (m.artist && m.artist !== m.author) authors.push(String(m.artist));

		const latestChapter =
			chapters.length > 0
				? String(chapters[0].number)
				: m.latestChapter != null
					? String(m.latestChapter)
					: undefined;

		return {
			id: this.toMangaId(m.slug),
			sourceId: this.id,
			title: String(m.title || slug),
			cover: this.thumbUrl(m.image),
			type: 'manga',
			status: this.mapStatus(m.status),
			latestChapter,
			lang: this.DEFAULT_LANG,
			description: String(m.description || '').replace(/<[^>]+>/g, ''),
			authors: [...new Set(authors)],
			genres: [...new Set(genres)],
			chapters
		};
	}

	async getChapterPages(chapterId: string): Promise<string[]> {
		try {
			const { slug, number } = this.extractChapter(chapterId);
			if (!slug || number == null || Number.isNaN(number)) return [];

			const data: any = await this.gql(
				`{chapter(x:1,slug:"${this.escapeGql(slug)}",number:${number}){id,title,mangaID,number,slug,date,pages,noAd,s}}`
			);
			const ch = data?.chapter;
			if (!ch?.pages) {
				console.error('[mangapanda] no pages field for', slug, number);
				return [];
			}

			let parsed: any;
			try {
				parsed =
					typeof ch.pages === 'string' ? JSON.parse(ch.pages) : ch.pages;
			} catch {
				console.error('[mangapanda] pages JSON parse failed');
				return [];
			}

			const prefix = parsed?.p ? String(parsed.p) : '';
			const files: string[] = Array.isArray(parsed?.i)
				? parsed.i.map(String)
				: Object.values(parsed || {})
						.filter((v) => typeof v === 'string')
						.map(String);

			const pages: string[] = [];
			const seen = new Set<string>();
			for (const f of files) {
				if (!f || f === prefix) continue;
				const path = f.startsWith('http')
					? f
					: `${this.IMG}/${prefix}${f}`.replace(
							/([^:]\/)\/+/g,
							'$1'
						);
				// Prefer clean URL; optional ?x= token sometimes required — try without first
				const url = path.startsWith('http')
					? path
					: `${this.IMG}/${String(f).replace(/^\//, '')}`;
				const finalUrl = f.startsWith('http')
					? f
					: `${this.IMG}/${(prefix + f).replace(/^\//, '')}`;
				if (seen.has(finalUrl)) continue;
				seen.add(finalUrl);
				pages.push(finalUrl);
			}

			console.log(
				`[mangapanda] getChapterPages ${slug}/${number} → ${pages.length}`
			);
			return pages;
		} catch (e) {
			console.error('[mangapanda] getChapterPages', e);
			return [];
		}
	}
}
