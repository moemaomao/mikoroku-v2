import { BaseSource } from '../BaseSource';
import type { Manga, MangaDetails } from '../types';

export class HentaieraSource extends BaseSource {
	id = 'hentaiera';
	name = 'HentaiEra';
	baseUrl = 'https://hentaiera.com';

	private readonly pageSize = 24;

	// ── HTTP ─────────────────────────────────────────────────────────────────
	private h(extra?: Record<string, string>): Record<string, string> {
		return {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9',
			Referer: `${this.baseUrl}/`,
			Origin: this.baseUrl,
			...extra
		};
	}

	private async getHtml(url: string): Promise<string> {
		const res = await fetch(url, {
			headers: this.h(),
			redirect: 'follow'
		});
		if (!res.ok) throw new Error(`HTTP ${res.status} → ${url}`);
		return res.text();
	}

	/** Last-Modified cover → YYYY-MM-DD */
	private async fetchCoverDate(coverUrl: string): Promise<string> {
		if (!coverUrl) return '';
		try {
			const res = await fetch(coverUrl, {
				method: 'HEAD',
				headers: this.h({ Accept: 'image/*,*/*' })
			});
			const lm = res.headers.get('last-modified');
			if (!lm) return '';
			const d = new Date(lm);
			if (Number.isNaN(d.getTime())) return '';
			return d.toISOString().slice(0, 10);
		} catch {
			return '';
		}
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private decodeHtml(s: string): string {
		return s
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'")
			.replace(/&#x27;/g, "'")
			.replace(/&nbsp;/g, ' ')
			.trim();
	}

	private toId(id: string | number): string {
		return `/${String(id).replace(/\D/g, '')}`;
	}

	private extractId(mangaId: string): string {
		return String(mangaId).replace(/\D/g, '');
	}

	private inputValue(html: string, id: string): string {
		return (
			html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`, 'i'))?.[1] ||
			html.match(new RegExp(`value="([^"]*)"[^>]*id="${id}"`, 'i'))?.[1] ||
			''
		);
	}

	private extFromGth(val: string): string {
		switch ((val || 'j')[0]) {
			case 'p':
				return 'png';
			case 'g':
				return 'gif';
			case 'w':
				return 'webp';
			case 'a':
				return 'avif';
			default:
				return 'jpg';
		}
	}

	private pickInfoTags(html: string, label: string): string[] {
		const sec =
			html.match(
				new RegExp(
					`tags_text'>\\s*${label}\\s*</span>\\s*<div class='info_tags'>([\\s\\S]*?)</div>`,
					'i'
				)
			)?.[1] || '';

		const names: string[] = [];
		const hrefRe =
			/href='\/(?:tag|artist|group|parody|character|language|category)\/([^/]+)\//gi;
		let m: RegExpExecArray | null;
		while ((m = hrefRe.exec(sec)) !== null) {
			const n = this.decodeHtml(m[1].replace(/-/g, ' '));
			if (n) names.push(n);
		}
		if (names.length) return names;

		const textRe = /item_name'>(?:<div[^>]*>[\s\S]*?<\/div>\s*)?([^<]+)/gi;
		while ((m = textRe.exec(sec)) !== null) {
			const n = this.decodeHtml(m[1]);
			if (n) names.push(n);
		}
		return names;
	}

	// ── List ─────────────────────────────────────────────────────────────────

	private parseList(html: string, limit?: number): Manga[] {
		const out: Manga[] = [];
		const seen = new Set<string>();

		const re =
			/<div class="inner_thumb">[\s\S]*?<a href="\/gallery\/(\d+)\/">[\s\S]*?data-src="([^"]+)"[^>]*alt="([^"]*)"[\s\S]*?<h2 class="gallery_title"><a[^>]*>([^<]*)<\/a>/gi;

		let m: RegExpExecArray | null;
		while ((m = re.exec(html)) !== null) {
			const id = m[1];
			if (!id || seen.has(id)) continue;
			seen.add(id);

			const cover = (m[2] || '').trim();
			const title = this.decodeHtml(m[4] || m[3] || `Gallery ${id}`);

			const head = html.slice(Math.max(0, m.index - 300), m.index);
			const catM = head.match(/gallery_cat[^>]*>([^<]+)</i);
			const type = catM ? this.decodeHtml(catM[1]).toLowerCase() : 'doujinshi';

			out.push({
				id: this.toId(id),
				sourceId: this.id,
				title,
				cover,
				type,
				status: 'Completed'
			});

			if (limit && out.length >= limit) break;
		}

		return out;
	}

	// ── Catalog ──────────────────────────────────────────────────────────────

	async getLatestManga(
		page: number,
		_opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			const url =
				p === 1 ? `${this.baseUrl}/` : `${this.baseUrl}/?page=${p}`;
			const html = await this.getHtml(url);
			const list = this.parseList(html, this.pageSize);
			console.log(`[hentaiera] latest page=${p} → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[hentaiera] getLatestManga', e);
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
			const url = `${this.baseUrl}/search/?key=${encodeURIComponent(q)}&page=${page}`;
			const html = await this.getHtml(url);
			const list = this.parseList(html, this.pageSize);
			console.log(`[hentaiera] search "${q}" → ${list.length} items`);
			return list;
		} catch (e) {
			console.error('[hentaiera] searchManga', e);
			return [];
		}
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const id = this.extractId(mangaId);
		if (!id) throw new Error(`Invalid hentaiera id: ${mangaId}`);

		const html = await this.getHtml(`${this.baseUrl}/gallery/${id}/`);

		const titleM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
		const title = titleM ? this.decodeHtml(titleM[1]) : `Gallery ${id}`;

		const loadId = this.inputValue(html, 'load_id');
		const loadDir = this.inputValue(html, 'load_dir');
		const loadServer = this.inputValue(html, 'load_server') || '1';
		const loadPages = parseInt(this.inputValue(html, 'load_pages') || '0', 10);

		const cover = loadId
			? `https://m${loadServer}.hentaiera.com/${loadDir}/${loadId}/cover.jpg`
			: html.match(
					/data-src="(https?:\/\/m\d+\.hentaiera\.com\/[^"]+\/cover\.jpg)"/i
			  )?.[1] || '';

		const updated = await this.fetchCoverDate(cover);

		const artists = this.pickInfoTags(html, 'Artists');
		const groups = this.pickInfoTags(html, 'Groups');
		const languages = this.pickInfoTags(html, 'Languages');
		const categories = this.pickInfoTags(html, 'Category');
		const tags = this.pickInfoTags(html, 'Tags');
		const parodies = this.pickInfoTags(html, 'Parodies');
		const characters = this.pickInfoTags(html, 'Characters');

		const category = categories[0] || 'doujinshi';
		const language =
			languages.find((l) => l.toLowerCase() !== 'translated') ||
			languages[0] ||
			'';

		const genres = [
			...tags,
			...parodies.map((p) => `parody:${p}`),
			...characters.map((c) => `character:${c}`)
		];

		const pageCount =
			loadPages || parseInt(html.match(/(\d+)\s*Pages/i)?.[1] || '0', 10);

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
				pageCount && `Pages: ${pageCount}`,
				updated && `Updated: ${updated}`
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
								date: updated
							}
					  ]
					: []
		};
	}

	// ── Pages ────────────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
		const id = this.extractId(chapterId);
		if (!id) {
			console.error('[hentaiera] getChapterPages → empty id:', chapterId);
			return [];
		}

		try {
			const html = await this.getHtml(`${this.baseUrl}/gallery/${id}/`);

			const loadId = this.inputValue(html, 'load_id');
			const loadDir = this.inputValue(html, 'load_dir');
			const loadServer = this.inputValue(html, 'load_server') || '1';
			const loadPages = parseInt(this.inputValue(html, 'load_pages') || '0', 10);

			if (!loadId) {
				console.error('[hentaiera] no load_id for', id);
				return [];
			}

			const gthM = html.match(/g_th\s*=\s*\$\.parseJSON\('(\{.*?\})'\)/);
			let gth: Record<string, string> = {};
			if (gthM) {
				try {
					gth = JSON.parse(gthM[1]);
				} catch {
					gth = {};
				}
			}

			const total = loadPages || Object.keys(gth).length || 0;
			if (!total) {
				console.error('[hentaiera] 0 pages for', id);
				return [];
			}

			const base = `https://m${loadServer}.hentaiera.com/${loadDir}/${loadId}`;
			const urls: string[] = [];
			for (let i = 1; i <= total; i++) {
				const ext = this.extFromGth(gth[String(i)] || 'j');
				urls.push(`${base}/${i}.${ext}`);
			}

			console.log(`[hentaiera] ${urls.length} pages → gallery ${id}`);
			return urls;
		} catch (e) {
			console.error('[hentaiera] getChapterPages failed', id, e);
			return [];
		}
	}
}