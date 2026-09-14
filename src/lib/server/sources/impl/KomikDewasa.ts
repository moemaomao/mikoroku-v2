import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';

/**
 * komikdewasa.art adapter (WordPress REST API)
 *
 * List   : /wp-json/wp/v2/posts?per_page=N&orderby=date  → group by category
 * Search : /wp-json/wp/v2/categories?search=QUERY
 * Detail : /wp-json/wp/v2/categories?slug=SLUG + posts?categories=ID
 * Chapter: /wp-json/wp/v2/posts?slug=SLUG  → content.rendered imgs
 *
 * ID format:
 *   manga   : "/komik/{slug}"
 *   chapter : "/{slug}-chapter-{n}"   (path style, match site URLs)
 */
export class KomikDewasaSource extends BaseSource {
	id = 'komikdewasa';
	name = 'KomikDewasa';
	baseUrl = 'https://komikdewasa.art';

	private readonly PER_PAGE = 20;
	private readonly API = '/wp-json/wp/v2';

	// ── HTTP ─────────────────────────────────────────────────────────────────

	private readonly CF_COOKIE =
	'cf_clearance=NILAI_DARI_BROWSER; __cf_bm=NILAI_LAIN';

private async apiGet<T = unknown>(path: string): Promise<T> {
	const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
	const res = await fetch(url, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Accept: 'application/json',
			Referer: this.baseUrl + '/',
			Cookie: this.CF_COOKIE
		}
	});
	const text = await res.text();
	if (text.trimStart().startsWith('<!')) {
		throw new Error('Cloudflare blocked (HTML challenge). Refresh cookie.');
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
			// Ambil lebih banyak post biar cukup series unik setelah di-group
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
					cover: '', // diisi di details; list API tidak selalu punya cover
					type: 'manga',
					status: 'Ongoing',
					latestChapter: Number.isFinite(chNum) ? chNum : undefined
				});

				if (list.length >= this.PER_PAGE) break;
			}

			// Enrich cover dari category / featured bila memungkinkan (opsional, skip biar cepat)
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
			// Cari via categories (tiap series = 1 category)
			const path = `${this.API}/categories?search=${encodeURIComponent(q)}&per_page=${this.PER_PAGE}&page=${page}`;
			const cats = await this.apiGet<any[]>(path);
			const list: Manga[] = [];
			const seen = new Set<string>();

			if (Array.isArray(cats)) {
				for (const c of cats) {
					const slug = c.slug || '';
					if (!slug || seen.has(slug)) continue;
					// skip genre-like tiny cats? keep all with count>=1
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

			// Fallback: search posts
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

		// chapter path → series slug
		if (/-chapter-[\d.]+/i.test(path) && !path.startsWith('/komik/')) {
			const slug = path.replace(/^\//, '').replace(/-chapter-[\d.]+.*$/i, '');
			if (slug) path = `/komik/${slug}`;
		}
		if (!path.startsWith('/komik/')) {
			path = `/komik/${path.replace(/^\//, '')}`;
		}

		const slug = path.replace(/^\/komik\//, '').split('/')[0];
		if (!slug) throw new Error(`Invalid komikdewasa id: ${mangaId}`);

		// Category = series
		const cats = await this.apiGet<any[]>(
			`${this.API}/categories?slug=${encodeURIComponent(slug)}`
		);
		const cat = Array.isArray(cats) ? cats[0] : null;
		const catId = cat?.id;

		const title = this.stripHtml(cat?.name || slug);
		let cover = '';

		// Chapters dari posts di category tsb
		const chapters: Chapter[] = [];
		const seen = new Set<string>();

		if (catId) {
			// max 100 per request; paginate jika perlu
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

		// Cover: ambil dari post terbaru content / featured — coba media
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
		const slug =
			path.replace(/^\//, '').replace(/\/+$/, '') ||
			path.match(/\/([^/]+)$/)?.[1] ||
			'';
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
				let src = m[1].split('?')[0];
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