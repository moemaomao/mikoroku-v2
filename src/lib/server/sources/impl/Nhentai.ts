import { BaseSource } from '../BaseSource';
import type { Manga, MangaDetails } from '../types';

/**
 * nhentai.net adapter (API v2)
 *
 * List / Search : /api/v2/galleries  +  /api/v2/search
 * Detail        : /api/v2/galleries/{id}
 * Config        : /api/v2/config  (image / thumb servers)
 *
 * ID format: "/{numericId}"
 */
export class NhentaiSource extends BaseSource {
	id = 'nhentai';
	name = 'nhentai.net';
	baseUrl = 'https://nhentai.net';

	private readonly api = 'https://nhentai.net/api/v2';

	// Fallback servers (akan di-update dari /config)
	private imgServers = [
		'https://i1.nhentai.net',
		'https://i2.nhentai.net',
		'https://i3.nhentai.net',
		'https://i4.nhentai.net'
	];
	private thumbServers = [
		'https://t1.nhentai.net',
		'https://t2.nhentai.net',
		'https://t3.nhentai.net',
		'https://t4.nhentai.net'
	];

	private configLoaded = false;

	// ── HTTP ─────────────────────────────────────────────────────────────────

	private h(): Record<string, string> {
		return {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Accept: 'application/json, text/plain, */*',
			'Accept-Language': 'en-US,en;q=0.9',
			Referer: 'https://nhentai.net/',
			Origin: 'https://nhentai.net'
		};
	}

	private async getJson<T = any>(url: string): Promise<T> {
		const res = await fetch(url, { headers: this.h() });
		if (!res.ok) {
			throw new Error(`HTTP ${res.status} → ${url}`);
		}
		return res.json() as Promise<T>;
	}

	/** Load image/thumb server list dari /api/v2/config (sekali saja) */
	private async ensureConfig() {
		if (this.configLoaded) return;
		try {
			const cfg = await this.getJson<{
				image_servers?: string[];
				thumb_servers?: string[];
			}>(`${this.api}/config`);

			if (cfg.image_servers?.length) this.imgServers = cfg.image_servers;
			if (cfg.thumb_servers?.length) this.thumbServers = cfg.thumb_servers;
		} catch (e) {
			console.warn('[nhentai] failed to load config, using fallback servers', e);
		}
		this.configLoaded = true;
	}

	private pickImgServer(mediaId: string | number): string {
		const n = Number(String(mediaId).replace(/\D/g, '')) || 0;
		return this.imgServers[n % this.imgServers.length];
	}

	private pickThumbServer(mediaId: string | number): string {
		const n = Number(String(mediaId).replace(/\D/g, '')) || 0;
		return this.thumbServers[n % this.thumbServers.length];
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private toId(id: number | string): string {
		return `/${String(id).replace(/\D/g, '')}`;
	}

	private extractId(mangaId: string): string {
		return String(mangaId).replace(/\D/g, '');
	}

	/**
	 * Bangun full URL dari path yang dikasih API.
	 * Path contoh: "galleries/4172679/1.webp" atau "galleries/4172679/cover.webp.webp"
	 */
	private fullUrl(path: string, mediaId: string | number, isThumb = false): string {
		if (!path) return '';

		let clean = path.trim();

		// Buang double extension aneh (cover.webp.webp → cover.webp)
		clean = clean.replace(/(\.(?:jpg|jpeg|png|gif|webp))\.\w+$/i, '$1');

		const base = isThumb
			? this.pickThumbServer(mediaId)
			: this.pickImgServer(mediaId);

		return `${base}/${clean}`;
	}

	private mapTags(tags: any[] = []): string[] {
		const out: string[] = [];
		for (const t of tags) {
			const name = String(t?.name || '').trim();
			if (!name) continue;

			const type = String(t?.type || '').toLowerCase();
			if (
				type === 'artist' ||
				type === 'group' ||
				type === 'parody' ||
				type === 'character' ||
				type === 'category' ||
				type === 'language'
			) {
				continue;
			}
			out.push(name);
		}
		return out;
	}

	private pickLanguage(tags: any[] = []): string {
		const lang = tags.find(
			(t) => t?.type === 'language' && t.name !== 'translated'
		);
		return lang?.name || '';
	}

	private pickCategory(tags: any[] = []): string {
		const cat = tags.find((t) => t?.type === 'category');
		return cat?.name || 'doujinshi';
	}

	private pickArtists(tags: any[] = []): string[] {
		return tags
			.filter((t) => t?.type === 'artist')
			.map((t) => t.name)
			.filter(Boolean);
	}

	private pickGroups(tags: any[] = []): string[] {
		return tags
			.filter((t) => t?.type === 'group')
			.map((t) => t.name)
			.filter(Boolean);
	}

	/** Untuk list / search response (struktur ringkas) */
	private toMangaFromList(g: any): Manga | null {
		if (!g?.id) return null;

		const mediaId = g.media_id;
		const title =
			g.english_title ||
			g.japanese_title ||
			g.title?.pretty ||
			g.title?.english ||
			g.title?.japanese ||
			`Gallery ${g.id}`;

		const thumbPath =
			typeof g.thumbnail === 'string' ? g.thumbnail : g.thumbnail?.path;

		const cover =
			mediaId && thumbPath ? this.fullUrl(thumbPath, mediaId, true) : '';

		return {
			id: this.toId(g.id),
			sourceId: this.id,
			title,
			cover,
			type: 'doujinshi',
			status: 'Completed'
		};
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

	async getLatestManga(
		page: number,
		opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			await this.ensureConfig();

			const p = Math.max(1, Number(page) || 1);
			const lang = (opts?.lang || 'all').toLowerCase();
			const type = (opts?.type || 'all').toLowerCase();

			const parts: string[] = [];
			if (lang && lang !== 'all') parts.push(`language:${lang}`);
			if (type && type !== 'all') parts.push(`category:${type}`);

			let data: any;
			if (parts.length) {
				const q = encodeURIComponent(parts.join(' '));
				data = await this.getJson(`${this.api}/search?query=${q}&page=${p}`);
			} else {
				data = await this.getJson(`${this.api}/galleries?page=${p}`);
			}

			const list = data?.result || data?.galleries || [];
			return list
				.map((g: any) => this.toMangaFromList(g))
				.filter(Boolean) as Manga[];
		} catch (e) {
			console.error('[nhentai] getLatestManga', e);
			return [];
		}
	}

	async searchManga(
		query: string,
		opts?: { page?: number; lang?: string; type?: string }
	): Promise<Manga[]> {
		const q = (query || '').trim();
		const page = Math.max(1, opts?.page || 1);
		const lang = (opts?.lang || 'all').toLowerCase();
		const type = (opts?.type || 'all').toLowerCase();

		if (!q) return this.getLatestManga(page, { lang, type });

		try {
			await this.ensureConfig();

			const parts = [q];
			if (lang && lang !== 'all') parts.push(`language:${lang}`);
			if (type && type !== 'all') parts.push(`category:${type}`);

			const searchQ = encodeURIComponent(parts.join(' '));
			const data = await this.getJson(
				`${this.api}/search?query=${searchQ}&page=${page}`
			);
			const list = data?.result || data?.galleries || [];
			return list
				.map((g: any) => this.toMangaFromList(g))
				.filter(Boolean) as Manga[];
		} catch (e) {
			console.error('[nhentai] searchManga', e);
			return [];
		}
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const id = this.extractId(mangaId);
		if (!id) throw new Error(`Invalid nhentai id: ${mangaId}`);

		await this.ensureConfig();

		const g = await this.getJson(`${this.api}/galleries/${id}`);

		const mediaId = g.media_id;
		const coverPath = g.cover?.path || g.thumbnail?.path;
		const cover =
			mediaId && coverPath ? this.fullUrl(coverPath, mediaId, true) : '';

		const artists = this.pickArtists(g.tags);
		const groups = this.pickGroups(g.tags);
		const language = this.pickLanguage(g.tags);
		const category = this.pickCategory(g.tags);
		const tags = this.mapTags(g.tags);
		const pageCount = g.num_pages || g.pages?.length || 0;

		const title =
			g.title?.pretty ||
			g.title?.english ||
			g.title?.japanese ||
			`Gallery ${id}`;

		const uploadDate = g.upload_date
			? new Date(g.upload_date * 1000).toISOString().slice(0, 10)
			: '';

		return {
			id: this.toId(id),
			sourceId: this.id,
			title,
			cover,
			type: category,
			status: 'Completed',
			description: [
				g.title?.english &&
					g.title.english !== title &&
					`AltTitle: ${g.title.english}`,
				g.title?.japanese && `AltTitle: ${g.title.japanese}`,
				category && `Type: ${category}`,
				language && `Language: ${language}`,
				artists.length && `Artists: ${artists.join(', ')}`,
				groups.length && `Groups: ${groups.join(', ')}`,
				pageCount && `Pages: ${pageCount}`
			]
				.filter(Boolean)
				.join('\n'),
			authors: artists.length ? artists : groups,
			genres: tags,
			chapters:
				pageCount > 0
					? [
							{
								id: this.toId(id),
								title: 'Read',
								number: 1,
								date: uploadDate
							}
					  ]
					: []
		};
	}

	// ── Pages ────────────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
		const id = this.extractId(chapterId);
		if (!id) {
			console.error('[nhentai] getChapterPages → empty id from:', chapterId);
			return [];
		}

		try {
			await this.ensureConfig();

			const g = await this.getJson(`${this.api}/galleries/${id}`);

			if (!g?.media_id) {
				console.error('[nhentai] getChapterPages → no media_id for', id);
				return [];
			}

			// API v2: g.pages[] (bukan g.images.pages)
			const pages = g.pages || g.images?.pages || [];
			if (!pages.length) {
				console.error('[nhentai] getChapterPages → 0 pages for', id);
				return [];
			}

			const urls = pages.map((p: any) => {
				if (p.path) {
					return this.fullUrl(p.path, g.media_id, false);
				}

				// Fallback format lama
				const t = p.t || 'j';
				const ext =
					t === 'p' ? 'png' : t === 'g' ? 'gif' : t === 'w' ? 'webp' : 'jpg';
				const base = this.pickImgServer(g.media_id);
				return `${base}/galleries/${g.media_id}/${p.number || 1}.${ext}`;
			});

			console.log(`[nhentai] loaded ${urls.length} pages for gallery ${id}`);
			return urls;
		} catch (e) {
			console.error('[nhentai] getChapterPages failed for', id, e);
			return [];
		}
	}
}