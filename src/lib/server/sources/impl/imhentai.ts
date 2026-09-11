import { BaseSource } from '../BaseSource';
import type { Manga, MangaDetails } from '../types';

/**
 * imhentai.to adapter (HTML scrape)
 *
 * List / Search : /  +  /?page=N  +  /search/?q=...&page=N
 * Detail        : /g/{id}/
 * Pages         : https://zrocdn.xyz/galleries/{mediaId}/{n}.webp
 *
 * ID format: "/{numericId}"
 * Homepage: 24 items per page
 */
export class ImhentaiSource extends BaseSource {
	id = 'imhentai';
	name = 'ImHentai';
	baseUrl = 'https://imhentai.to';

	private readonly cdn = 'https://zrocdn.xyz';

	// ── HTTP ─────────────────────────────────────────────────────────────────

	private h(): Record<string, string> {
		return {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9',
			Referer: 'https://imhentai.to/',
			Origin: 'https://imhentai.to'
		};
	}

	private async getHtml(url: string): Promise<string> {
		const res = await fetch(url, { headers: this.h() });
		if (!res.ok) {
			throw new Error(`HTTP ${res.status} → ${url}`);
		}
		return res.text();
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private toId(id: number | string): string {
		return `/${String(id).replace(/\D/g, '')}`;
	}

	private extractId(mangaId: string): string {
		return String(mangaId).replace(/\D/g, '');
	}

	/** Ambil mediaId dari path cover/thumb: zrocdn.xyz/galleries/{mediaId}/... */
	private extractMediaId(html: string): string {
		const m = html.match(/zrocdn\.xyz\/galleries\/(\d+)\//);
		return m?.[1] || '';
	}

	private decodeHtml(s: string): string {
		return s
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'")
			.replace(/&#x27;/g, "'")
			.trim();
	}

	/** Parse list gallery dari homepage / search (24 item) */
	private parseList(html: string): Manga[] {
		const out: Manga[] = [];
		const seen = new Set<string>();

		// Block: <div class="thumb" ...> ... <a href="/g/ID/"> ... <img data-src="..."> ... <h2 class="gallery_title">TITLE</h2>
		const re =
			/<div class="thumb"[^>]*>[\s\S]*?<a href="\/g\/(\d+)\/">[\s\S]*?<img[^>]+data-src="([^"]+)"[^>]*>[\s\S]*?<h2 class="gallery_title"><a[^>]*>([^<]+)<\/a>/gi;

		let m: RegExpExecArray | null;
		while ((m = re.exec(html)) !== null) {
			const id = m[1];
			if (seen.has(id)) continue;
			seen.add(id);

			const cover = (m[2] || '').trim();
			const title = this.decodeHtml(m[3] || `Gallery ${id}`);

			// Coba ambil category dari block (opsional)
			const blockStart = m.index;
			const blockEnd = html.indexOf('</div>', blockStart + 200);
			const block = html.slice(blockStart, blockEnd > 0 ? blockEnd : blockStart + 800);
			const catM = block.match(/class="thumb_cat"[^>]*>([^<]+)</i);
			const type = catM ? this.decodeHtml(catM[1]).toLowerCase() : 'doujinshi';

			out.push({
				id: this.toId(id),
				sourceId: this.id,
				title,
				cover,
				type,
				status: 'Completed'
			});
		}

		return out;
	}

	private pickFromInfo(html: string, label: string): string[] {
		// Contoh: Parodies: <a ...>original</a>  atau Tags: ...
		const re = new RegExp(
			`${label}:[\\s\\S]*?</(?:div|ul|li)>`,
			'i'
		);
		const section = html.match(re)?.[0] || '';
		const names: string[] = [];
		const tagRe = /href="\/(?:tag|artist|group|parody|character|language|category)\/[^"]+\/"[^>]*>([^<]+)</gi;
		let tm: RegExpExecArray | null;
		while ((tm = tagRe.exec(section)) !== null) {
			const name = this.decodeHtml(tm[1]);
			if (name) names.push(name);
		}
		return names;
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

	async getLatestManga(
		page: number,
		opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			let url = p === 1 ? `${this.baseUrl}/` : `${this.baseUrl}/?page=${p}`;

			// Filter sederhana via path jika tersedia
			const type = (opts?.type || 'all').toLowerCase();
			if (type && type !== 'all') {
				// contoh: /category/doujinshi/?page=2
				url =
					p === 1
						? `${this.baseUrl}/category/${encodeURIComponent(type)}/`
						: `${this.baseUrl}/category/${encodeURIComponent(type)}/?page=${p}`;
			}

			const html = await this.getHtml(url);
			return this.parseList(html);
		} catch (e) {
			console.error('[imhentai] getLatestManga', e);
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
			const url = `${this.baseUrl}/search/?q=${encodeURIComponent(q)}&page=${page}`;
			const html = await this.getHtml(url);
			return this.parseList(html);
		} catch (e) {
			console.error('[imhentai] searchManga', e);
			return [];
		}
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const id = this.extractId(mangaId);
		if (!id) throw new Error(`Invalid imhentai id: ${mangaId}`);

		const html = await this.getHtml(`${this.baseUrl}/g/${id}/`);

		const titleM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
		const title = titleM
			? this.decodeHtml(titleM[1])
			: `Gallery ${id}`;

		const mediaId = this.extractMediaId(html);
		const cover = mediaId
			? `${this.cdn}/galleries/${mediaId}/cover.webp`
			: '';

		const pagesM = html.match(/pages_num">(\d+)/i) || html.match(/Pages:\s*<\/span>\s*<span[^>]*>(\d+)/i);
		const pageCount = pagesM ? parseInt(pagesM[1], 10) : 0;

		const artists = this.pickFromInfo(html, 'Artists');
		const groups = this.pickFromInfo(html, 'Groups');
		const languages = this.pickFromInfo(html, 'Languages');
		const categories = this.pickFromInfo(html, 'Category');
		const tags = this.pickFromInfo(html, 'Tags');
		const parodies = this.pickFromInfo(html, 'Parodies');
		const characters = this.pickFromInfo(html, 'Characters');

		const category = categories[0] || 'doujinshi';
		const language = languages.find((l) => l.toLowerCase() !== 'translated') || languages[0] || '';

		const genres = [
			...tags,
			...parodies.map((p) => `parody:${p}`),
			...characters.map((c) => `character:${c}`)
		];

		return {
			id: this.toId(id),
			sourceId: this.id,
			title,
			cover,
			type: category,
			status: 'Completed',
			description: [
				language && `Language: ${language}`,
				category && `Type: ${category}`,
				artists.length && `Artists: ${artists.join(', ')}`,
				groups.length && `Groups: ${groups.join(', ')}`,
				pageCount && `Pages: ${pageCount}`
			]
				.filter(Boolean)
				.join('\n'),
			authors: artists.length ? artists : groups,
			genres,
			chapters:
				pageCount > 0
					? [
							{
								id: this.toId(id),
								title: 'Read',
								number: 1,
								date: ''
							}
					  ]
					: []
		};
	}

	// ── Pages ────────────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
		const id = this.extractId(chapterId);
		if (!id) {
			console.error('[imhentai] getChapterPages → empty id from:', chapterId);
			return [];
		}

		try {
			const html = await this.getHtml(`${this.baseUrl}/g/${id}/`);

			const mediaId = this.extractMediaId(html);
			if (!mediaId) {
				console.error('[imhentai] getChapterPages → no mediaId for', id);
				return [];
			}

			// Hitung jumlah halaman dari thumbs yang ada di HTML
			const thumbRe = new RegExp(
				`zrocdn\\.xyz/galleries/${mediaId}/(\\d+)t\\.webp`,
				'gi'
			);
			const nums = new Set<number>();
			let tm: RegExpExecArray | null;
			while ((tm = thumbRe.exec(html)) !== null) {
				nums.add(parseInt(tm[1], 10));
			}

			let pageCount = nums.size;

			// Fallback ke pages_num
			if (!pageCount) {
				const pagesM = html.match(/pages_num">(\d+)/i);
				pageCount = pagesM ? parseInt(pagesM[1], 10) : 0;
			}

			if (!pageCount) {
				console.error('[imhentai] getChapterPages → 0 pages for', id);
				return [];
			}

			// Prefer .webp (format utama saat ini), urut 1..N
			const urls: string[] = [];
			for (let i = 1; i <= pageCount; i++) {
				urls.push(`${this.cdn}/galleries/${mediaId}/${i}.webp`);
			}

			console.log(`[imhentai] loaded ${urls.length} pages for gallery ${id} (media ${mediaId})`);
			return urls;
		} catch (e) {
			console.error('[imhentai] getChapterPages failed for', id, e);
			return [];
		}
	}
}