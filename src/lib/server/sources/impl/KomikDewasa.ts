import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';

/**
 * komikdewasa.art adapter (WordPress REST API + CF cookie)
 *
 * List   : /wp-json/wp/v2/posts?per_page=N&orderby=date  → group by series slug
 * Search : /wp-json/wp/v2/categories?search=QUERY
 * Detail : /wp-json/wp/v2/categories?slug=SLUG + posts?categories=ID
 * Chapter: /wp-json/wp/v2/posts?slug=SLUG  → content.rendered imgs
 *
 * ID format:
 *   manga   : "/komik/{slug}"
 *   chapter : "/{post-slug}"
 *
 * CATATAN: Isi CF_COOKIE dari DevTools (header Cookie). Jangan commit ke git.
 */
export class KomikDewasaSource extends BaseSource {
	id = 'komikdewasa';
	name = 'KomikDewasa';
	baseUrl = 'https://komikdewasa.art';

	private readonly PER_PAGE = 20;
	private readonly API = '/wp-json/wp/v2';

	private readonly CF_COOKIE =
		'HstCfa4967663=1789352838650; HstCmu4967663=1789352838650; HstCnv4967663=1; HstCns4967663=1; HstCla4967663=1789352839077; HstPn4967663=8; HstPt4967663=8; cf_clearance=_LeMcjK1SjWL2UZ57F..e9W_Uq6WcjJmYHjc_A_15Ic-1789352839-1.2.1.1-nrIervQpztnrGxoPsq7JmkbsCzvdAPmiw9_YMEaSwarC1kiW7FdTl6ykj7ESbEHWqQv3sarokasHXjWyxKI7W5yXQYgmcNXyo6zsWC9__eSePplNyJ4msNAen8s_IwMS22TTExyQ.WGncF5z_EqQZfKidGANI8clWQod6THm8GvxopUBR5hDfZDaG9Nshvsq..5IEoUTFqnf77FuYm5.kUh1ChBkkeccPNsQAGlflX0fQgN2be8d6wjgrJNWNg.KBR7HTueovMEMtmwyGlkQD7ThMlm..Yvd.6VG43wfEVilKL8QZgWgSapmZKHueP.k.PlNb6cSEddx2vhwlCeXnPmdm5.g_Qm0TGwZbu2oxNA; _ga_97T652HB1T=GS2.1.s1789352839$o1$g0$t1789352839$j60$l0$h0; _ga=GA1.2.1625272733.1789352839; _gid=GA1.2.1064764655.1789352839; __nuvt=8-ff74c672fec8f8748459cdaa6b8ff883; _ym_uid=1789352840198937680; _ym_d=1789352840; __suvt=8-48dfdca3cf98f9e80d2bcbefcdec0656; _ym_isad=2; __dtsu=51A01786504725CF6F41F2D39CC899CC; _pubcid=69f3815a-9745-40ce-b4dd-946992a1603e; _cc_id=f9d7db77cfb91b2d98057afe1d5c5d87; panoramaId_expiry=1789439245235; panoramaId=5339edae91cc93f3457db313a6bca9fb927a0884566302bd696811a645e5cf26; panoramaIdType=panoDevice; mdd=0';

	private readonly UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

	// ── HTTP ─────────────────────────────────────────────────────────────────

	private async apiGet<T = unknown>(path: string): Promise<T> {
	const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
	const res = await fetch(url, {
		headers: {
			'User-Agent': this.UA,
			Accept: 'application/json, text/plain, */*',
			'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8,zh-CN;q=0.7,zh;q=0.6,id;q=0.5',
			'Accept-Encoding': 'gzip, deflate, br, zstd',
			Referer: this.baseUrl + '/',
			Origin: this.baseUrl,
			Cookie: this.CF_COOKIE,
			'sec-ch-ua': '"Chromium";v="152", "Not:A-Brand";v="24", "Google Chrome";v="152"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'Sec-Fetch-Dest': 'empty',
			'Sec-Fetch-Mode': 'cors',
			'Sec-Fetch-Site': 'same-origin',
			'Cache-Control': 'no-cache',
			Pragma: 'no-cache'
		}
	});
	const text = await res.text();
	console.log('[komikdewasa] status', res.status, 'len', text.length, 'head', text.slice(0, 80));
	if (text.trimStart().startsWith('<!')) {
		throw new Error(
			'Cloudflare blocked (HTML challenge). Refresh cf_clearance cookie from browser.'
		);
	}
	if (!res.ok) throw new Error(`API ${res.status} ${path}`);
	return JSON.parse(text) as T;
}

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

	private stripHtml(s: string): string {
		return String(s || '')
			.replace(/<[^>]+>/g, '')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'")
			.replace(/\s+/g, ' ')
			.trim();
	}

	private parseChapterNumber(text: string): number {
		const m = String(text).match(
			/(?:chapter|chap|ch\.?|episode|ep\.?)\s*(\d+(?:\.\d+)?)/i
		);
		if (m) return parseFloat(m[1]);
		const n = String(text).match(/(\d+(?:\.\d+)?)/);
		return n ? parseFloat(n[1]) : NaN;
	}

	/** post slug "foo-chapter-12" → series slug "foo" */
	private seriesSlugFromPost(slug: string): string {
		return String(slug || '')
			.replace(/-chapter-[\d.]+(?:-end)?$/i, '')
			.replace(/-end$/i, '');
	}

	private mangaIdFromSlug(slug: string): string {
		return `/komik/${slug}`;
	}

	private chapterIdFromSlug(slug: string): string {
		return `/${slug}`;
	}

	// ── Public API ───────────────────────────────────────────────────────────

	async getLatestManga(
		page: number,
		_opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			const per = 40;
			const path = `${this.API}/posts?per_page=${per}&page=${p}&orderby=date&order=desc&_fields=id,slug,title,link,categories,date`;
			console.log('[komikdewasa] fetching', path);
			const posts = await this.apiGet<any[]>(path);
			if (!Array.isArray(posts)) {
				console.log('[komikdewasa] posts not array', typeof posts);
				return [];
			}

			const seen = new Set<string>();
			const list: Manga[] = [];

			for (const post of posts) {
				const slug = this.seriesSlugFromPost(post.slug || '');
				if (!slug || seen.has(slug)) continue;
				seen.add(slug);

				const fullTitle = this.stripHtml(post.title?.rendered || post.slug || '');
				const title = fullTitle
					.replace(/\s*Chapter\s*\d+.*$/i, '')
					.replace(/\s+/g, ' ')
					.trim();
				if (!title) continue;

				const chNum = this.parseChapterNumber(fullTitle);
				list.push({
					id: this.mangaIdFromSlug(slug),
					sourceId: this.id,
					title,
					cover: '',
					type: 'manga',
					status: 'Ongoing',
					latestChapter: Number.isFinite(chNum) ? chNum : undefined
				});

				if (list.length >= this.PER_PAGE) break;
			}

			console.log(`[komikdewasa] latest page=${p} → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[komikdewasa] getLatestManga', e);
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
			const path = `${this.API}/categories?search=${encodeURIComponent(q)}&per_page=${this.PER_PAGE}&page=${page}`;
			const cats = await this.apiGet<any[]>(path);
			const list: Manga[] = [];
			const seen = new Set<string>();

			if (Array.isArray(cats)) {
				for (const c of cats) {
					const slug = c.slug || '';
					if (!slug || seen.has(slug)) continue;
					if ((c.count ?? 0) < 1) continue;
					seen.add(slug);
					list.push({
						id: this.mangaIdFromSlug(slug),
						sourceId: this.id,
						title: this.stripHtml(c.name || slug),
						cover: '',
						type: 'manga',
						status: 'Ongoing',
						latestChapter: c.count || undefined
					});
				}
			}

			if (!list.length) {
				const posts = await this.apiGet<any[]>(
					`${this.API}/posts?search=${encodeURIComponent(q)}&per_page=40&page=${page}&_fields=id,slug,title`
				);
				if (Array.isArray(posts)) {
					for (const post of posts) {
						const slug = this.seriesSlugFromPost(post.slug || '');
						if (!slug || seen.has(slug)) continue;
						seen.add(slug);
						const fullTitle = this.stripHtml(post.title?.rendered || '');
						list.push({
							id: this.mangaIdFromSlug(slug),
							sourceId: this.id,
							title: fullTitle.replace(/\s*Chapter\s*\d+.*$/i, '').trim(),
							cover: '',
							type: 'manga',
							status: 'Ongoing'
						});
						if (list.length >= this.PER_PAGE) break;
					}
				}
			}

			console.log(`[komikdewasa] search "${q}" → ${list.length}`);
			return list.slice(0, this.PER_PAGE);
		} catch (e) {
			console.error('[komikdewasa] searchManga', e);
			return [];
		}
	}

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		let path = this.cleanId(mangaId);

		if (/-chapter-[\d.]+/i.test(path) && !path.startsWith('/komik/')) {
			const slug = path.replace(/^\//, '').replace(/-chapter-[\d.]+.*$/i, '');
			if (slug) path = `/komik/${slug}`;
		}
		if (!path.startsWith('/komik/')) {
			path = `/komik/${path.replace(/^\//, '')}`;
		}

		const slug = path.replace(/^\/komik\//, '').split('/')[0];
		if (!slug) throw new Error(`Invalid komikdewasa id: ${mangaId}`);

		const cats = await this.apiGet<any[]>(
			`${this.API}/categories?slug=${encodeURIComponent(slug)}`
		);
		const cat = Array.isArray(cats) ? cats[0] : null;
		const catId = cat?.id;

		const title = this.stripHtml(cat?.name || slug);
		let cover = '';

		const chapters: Chapter[] = [];
		const seen = new Set<string>();

		if (catId) {
			for (let page = 1; page <= 5; page++) {
				const posts = await this.apiGet<any[]>(
					`${this.API}/posts?categories=${catId}&per_page=100&page=${page}&orderby=date&order=asc&_fields=id,slug,title,date,link`
				);
				if (!Array.isArray(posts) || !posts.length) break;

				for (const post of posts) {
					const pslug = post.slug || '';
					if (!pslug || seen.has(pslug)) continue;
					seen.add(pslug);

					const chTitle = this.stripHtml(post.title?.rendered || pslug);
					const number =
						this.parseChapterNumber(chTitle) ||
						this.parseChapterNumber(pslug) ||
						chapters.length + 1;
					const date = post.date ? String(post.date).slice(0, 10) : '';

					chapters.push({
						id: this.chapterIdFromSlug(pslug),
						title: /chapter/i.test(chTitle) ? chTitle : `Chapter ${number}`,
						number,
						date
					});
				}

				if (posts.length < 100) break;
			}
		}

		chapters.sort((a, b) => (b.number || 0) - (a.number || 0));

		if (catId && chapters.length) {
			try {
				const latestSlug = chapters[0].id.replace(/^\//, '');
				const latestPosts = await this.apiGet<any[]>(
					`${this.API}/posts?slug=${encodeURIComponent(latestSlug)}&_fields=featured_media,content`
				);
				const lp = Array.isArray(latestPosts) ? latestPosts[0] : null;
				if (lp?.featured_media) {
					const media = await this.apiGet<any>(
						`${this.API}/media/${lp.featured_media}`
					);
					cover = media?.source_url || media?.guid?.rendered || '';
				}
				if (!cover && lp?.content?.rendered) {
					const m = String(lp.content.rendered).match(
						/src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp))/i
					);
					if (m) cover = m[1];
				}
			} catch {
				/* ignore cover errors */
			}
		}

		const latestChapter = chapters[0]?.number;
		const description = [
			cat?.description && this.stripHtml(cat.description),
			latestChapter != null && `Latest chapter: ${latestChapter}`,
			`Chapters: ${chapters.length}`
		]
			.filter(Boolean)
			.join('\n\n');

		console.log(`[komikdewasa] details ${slug} → ch=${chapters.length}`);

		return {
			id: this.mangaIdFromSlug(slug),
			sourceId: this.id,
			title,
			cover: this.absUrl(cover),
			type: 'manga',
			status: 'Ongoing',
			description,
			authors: [],
			genres: [],
			chapters,
			latestChapter
		};
	}

	async getChapterPages(chapterId: string): Promise<string[]> {
		const path = this.cleanId(chapterId);
		const slug = path.replace(/^\//, '').replace(/\/+$/, '') || '';
		if (!slug) {
			console.error('[komikdewasa] getChapterPages invalid id', chapterId);
			return [];
		}

		try {
			const posts = await this.apiGet<any[]>(
				`${this.API}/posts?slug=${encodeURIComponent(slug)}&_fields=content`
			);
			const post = Array.isArray(posts) ? posts[0] : null;
			const html = post?.content?.rendered || '';
			if (!html) {
				console.error('[komikdewasa] no content for', slug);
				return [];
			}

			const urls: string[] = [];
			const seen = new Set<string>();
			const re =
				/(?:src|data-src|data-lazy-src)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/gi;
			let m: RegExpExecArray | null;
			while ((m = re.exec(html)) !== null) {
				const src = m[1].split('?')[0];
				if (!src || seen.has(src)) continue;
				if (/logo|icon|avatar|ads|banner|emoji|gravatar/i.test(src)) continue;
				seen.add(src);
				urls.push(src);
			}

			console.log(`[komikdewasa] ${urls.length} pages → ${slug}`);
			return urls;
		} catch (e) {
			console.error('[komikdewasa] getChapterPages', slug, e);
			return [];
		}
	}
}
