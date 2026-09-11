import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * bacakomik.pics adapter (HTML + postCards JS array)
 *
 * List   : /series/ | /series/page/{n}/   (~18/page → merge utk 24)
 * Search : /?s=QUERY
 * Detail : /series/{slug}/
 * Chapter: /chapter/{slug}-chapter-{n}/
 * Pages  : img warungkomikcdn.icu di entry-content
 *
 * ID format:
 *   manga   : "/series/{slug}"
 *   chapter : "/chapter/{slug}-chapter-{n}"
 */
export class BacaKomikSource extends BaseSource {
	id = 'bacakomik';
	name = 'BacaKomik';
	baseUrl = 'https://bacakomik.pics';

	private readonly PER_PAGE = 24;

	// ── Helpers ──────────────────────────────────────────────────────────────

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

	private parseChapterNumber(text: string): number {
		const s = String(text || '');
		const m =
			s.match(/chapter[\s_-]*(\d+(?:\.\d+)?)/i) ||
			s.match(/\bch\.?\s*(\d+(?:\.\d+)?)/i) ||
			s.match(/(\d+(?:\.\d+)?)/);
		return m ? parseFloat(m[1]) : 0;
	}

	private detectType(text: string): 'manga' | 'manhwa' | 'manhua' {
		const t = (text || '').toLowerCase();
		if (/\bmanhwa\b/.test(t)) return 'manhwa';
		if (/\bmanhua\b/.test(t)) return 'manhua';
		if (/\btoon\b/.test(t)) return 'manhwa';
		return 'manga';
	}

	/** /chapter/foo-chapter-12 → /series/foo */
	private seriesIdFromChapter(path: string): string | null {
		const p = this.cleanId(path);
		const m = p.match(/^\/chapter\/(.+?)-chapter-[\d.]+/i);
		if (m?.[1]) return `/series/${m[1]}`;
		// fallback: strip trailing -chapter-N
		const m2 = p.match(/^\/chapter\/(.+)$/i);
		if (m2?.[1]) {
			const slug = m2[1].replace(/-chapter-[\d.]+.*$/i, '');
			if (slug) return `/series/${slug}`;
		}
		return null;
	}

	// ── List ─────────────────────────────────────────────────────────────────

	/** Cards disisipkan di: const postCards = ["<a class=\"card...\">...", ...] */
	private extractPostCardsHtml(html: string): string[] {
		const m = html.match(/const\s+postCards\s*=\s*(\[[\s\S]*?\]);/);
		if (!m) return [];
		try {
			// String JSON-like dengan escaped quotes
			const arr = JSON.parse(m[1].replace(/\\'/g, "'")) as string[];
			return Array.isArray(arr) ? arr : [];
		} catch {
			// Fallback regex per fragment
			const parts: string[] = [];
			const re = /<a class=\\"card[^"]*\\"[\s\S]*?<\\\/a>/g;
			let x: RegExpExecArray | null;
			while ((x = re.exec(m[1])) !== null) {
				parts.push(x[0].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, ''));
			}
			return parts;
		}
	}

	private parseCardHtml(fragment: string): Manga | null {
		const html = fragment
			.replace(/\\"/g, '"')
			.replace(/\\\//g, '/')
			.replace(/\\n/g, '\n')
			.replace(/\\r/g, '');
		const $ = cheerio.load(html);
		const a = $('a.card, a[href*="/series/"]').first();
		const href = a.attr('href') || '';
		const id = this.cleanId(href);
		if (!/^\/series\/[^/]+$/.test(id)) return null;

		const title = (
			a.find('.card-title').text() ||
			a.find('img').attr('alt') ||
			a.attr('title') ||
			''
		)
			.replace(/\s+/g, ' ')
			.trim();
		if (!title) return null;

		const cover =
			a.find('img').attr('src') ||
			a.find('img').attr('data-src') ||
			'';
		const typeText =
			a.find('.cpt-label').text() ||
			(a.attr('class') || '');
		const statusText = a.find('.status-label').text() || '';
		const status = /complete|finished|end/i.test(statusText)
			? 'Completed'
			: 'Ongoing';

		return {
			id,
			sourceId: this.id,
			title,
			cover: this.absUrl((cover || '').split('?')[0]),
			type: this.detectType(typeText),
			status
		};
	}

	private parseListHtml(html: string): Manga[] {
		const out: Manga[] = [];
		const seen = new Set<string>();

		// Primary: postCards JS array
		for (const frag of this.extractPostCardsHtml(html)) {
			const m = this.parseCardHtml(frag);
			if (!m || seen.has(m.id)) continue;
			seen.add(m.id);
			out.push(m);
		}

		// Fallback: DOM cards (kalau pernah di-SSR)
		if (!out.length) {
			const $ = cheerio.load(html);
			$('#komik-grid a.card, a.card[href*="/series/"]').each((_, el) => {
				const $a = $(el);
				const id = this.cleanId($a.attr('href') || '');
				if (!/^\/series\/[^/]+$/.test(id) || seen.has(id)) return;
				seen.add(id);
				const title = (
					$a.find('.card-title').text() ||
					$a.find('img').attr('alt') ||
					''
				)
					.replace(/\s+/g, ' ')
					.trim();
				if (!title) return;
				const cover =
					$a.find('img').attr('src') ||
					$a.find('img').attr('data-src') ||
					'';
				const typeText = $a.find('.cpt-label').text() || $a.attr('class') || '';
				const statusText = $a.find('.status-label').text() || '';
				out.push({
					id,
					sourceId: this.id,
					title,
					cover: this.absUrl(cover.split('?')[0]),
					type: this.detectType(typeText),
					status: /complete/i.test(statusText) ? 'Completed' : 'Ongoing'
				});
			});
		}

		return out;
	}

	private async fetchListPage(path: string): Promise<Manga[]> {
		try {
			const html = await this.fetchHtml(path);
			if (!html || html.length < 500) return [];
			const list = this.parseListHtml(html);
			console.log(`[bacakomik] ${path} → ${list.length} items`);
			return list;
		} catch (e) {
			console.warn('[bacakomik] fetchListPage', path, e);
			return [];
		}
	}

	async getLatestManga(
		page: number,
		_opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			// Situs ~18/page → ambil 2 page situs per app-page agar dapat 24
			const siteStart = (p - 1) * 2 + 1;
			const paths = [
				siteStart <= 1 ? `/series/` : `/series/page/${siteStart}/`,
				`/series/page/${siteStart + 1}/`
			];

			const seen = new Set<string>();
			const merged: Manga[] = [];

			for (const path of paths) {
				if (merged.length >= this.PER_PAGE) break;
				const batch = await this.fetchListPage(path);
				for (const m of batch) {
					if (seen.has(m.id)) continue;
					seen.add(m.id);
					merged.push(m);
					if (merged.length >= this.PER_PAGE) break;
				}
			}

			console.log(`[bacakomik] latest page=${p} → ${merged.length}`);
			return merged.slice(0, this.PER_PAGE);
		} catch (e) {
			console.error('[bacakomik] getLatestManga', e);
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
			const path =
				page <= 1
					? `/?s=${encodeURIComponent(q)}`
					: `/page/${page}/?s=${encodeURIComponent(q)}`;
			let list = await this.fetchListPage(path);

			// Search kadang tidak pakai postCards — fallback link series
			if (!list.length) {
				const html = await this.fetchHtml(path);
				const $ = cheerio.load(html);
				const seen = new Set<string>();
				$('a[href*="/series/"]').each((_, el) => {
					const href = $(el).attr('href') || '';
					const id = this.cleanId(href);
					if (!/^\/series\/[^/]+$/.test(id) || seen.has(id)) return;
					seen.add(id);
					const title = ($(el).attr('title') || $(el).text() || '')
						.replace(/\s+/g, ' ')
						.trim();
					if (!title || title.length < 2) return;
					const cover =
						$(el).find('img').attr('src') ||
						$(el).closest('article, div').find('img').attr('src') ||
						'';
					list.push({
						id,
						sourceId: this.id,
						title,
						cover: this.absUrl(cover.split('?')[0]),
						type: 'manga',
						status: 'Ongoing'
					});
				});
			}

			console.log(`[bacakomik] search "${q}" → ${list.length}`);
			return list.slice(0, this.PER_PAGE);
		} catch (e) {
			console.error('[bacakomik] searchManga', e);
			return [];
		}
	}

	// ── Details ──────────────────────────────────────────────────────────────

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
	let path = this.cleanId(mangaId);

	if (/^\/chapter\//i.test(path)) {
		const series = this.seriesIdFromChapter(path);
		if (series) path = series;
	}

	if (!/^\/series\/[^/]+$/i.test(path)) {
		throw new Error(`Invalid bacakomik id: ${mangaId}`);
	}

	const html = await this.fetchHtml(path + '/');
	const $ = cheerio.load(html);

	// ── Title ──────────────────────────────────────────────────────────────
	let title =
		$('h1').first().text().trim() ||
		$('meta[property="og:title"]').attr('content') ||
		path;
	title = title
		.replace(/\s*[-–|].*BacaKomik.*$/i, '')
		.replace(/\s+/g, ' ')
		.trim();

	// ── Cover (fix) ──────────────────────────────────────────────────────
	// Prioritas: img.thumb / .series-thumb img
	let cover =
		$('img.thumb').attr('src') ||
		$('.series-thumb img').attr('src') ||
		$('meta[property="og:image"]').attr('content') ||
		$('.thumbnail-wrapper img, .thumb img, article img').first().attr('src') ||
		'';
	cover = this.absUrl((cover || '').split('?')[0]);

	const bodyText = $('body').text().replace(/\s+/g, ' ');

	// ── Alt / Author / Status (tetap pakai regex body) ─────────────────────
	let alt = '';
	const altM = bodyText.match(/Alternatif\s*:\s*(.+?)(?:Author|Status|Sinopsis|$)/i);
	if (altM) alt = altM[1].replace(/\s+/g, ' ').trim().replace(/,$/, '');

	const authors: string[] = [];
	const authM = bodyText.match(/Author\s*:\s*(.+?)(?:Status|Sinopsis|Genre|$)/i);
	if (authM) {
		authM[1]
			.split(/,|\//)
			.map((s) => s.trim())
			.filter((n) => n && n.length < 60)
			.forEach((n) => {
				if (!authors.includes(n)) authors.push(n);
			});
	}

	let status = 'Ongoing';
	const stM = bodyText.match(/Status\s*:\s*(Ongoing|Completed|Hiatus)/i);
	if (stM) {
		status = /complete/i.test(stM[1]) ? 'Completed' : stM[1];
	}

	// ── Genres ─────────────────────────────────────────────────────────────
	const genres: string[] = [];
	$('a.genre-link, a[href*="/genre/"]').each((_, a) => {
		const g = $(a).text().replace(/\s+/g, ' ').trim();
		if (g && g.length < 40 && !/^genre$/i.test(g) && !genres.includes(g)) {
			genres.push(g);
		}
	});

	// ── Synopsis ───────────────────────────────────────────────────────────
	let synopsis = '';
	const sinM = bodyText.match(/Sinopsis\s*:\s*(.+?)(?:Dae Ho|Chapter|Favorit|$)/i);
	$('p').each((_, el) => {
		const t = $(el).text().replace(/\s+/g, ' ').trim();
		if (t.length > 80 && !synopsis && !/genre|author|status|alternatif/i.test(t)) {
			synopsis = t;
		}
	});
	if (!synopsis && sinM) synopsis = sinM[1].trim();

	const typeHint = $('.cpt-label, .card').first().text() || genres.join(' ');

	// ── Chapters (FIX utama) ───────────────────────────────────────────────
	// Situs sekarang inject chapter lewat: const chapterData = [...]
	const chapters: Chapter[] = [];
	const seen = new Set<string>();

	const chapterDataMatch = html.match(/const\s+chapterData\s*=\s*(\[[\s\S]*?\]);/);
	if (chapterDataMatch) {
		try {
			const data = JSON.parse(chapterDataMatch[1]) as Array<{ title?: string; url?: string }>;
			for (const item of data) {
				if (!item?.url) continue;
				const id = this.cleanId(item.url);
				if (!/^\/chapter\//i.test(id) || seen.has(id)) continue;
				seen.add(id);

				const text = (item.title || '').replace(/\s+/g, ' ').trim();
				const number =
					this.parseChapterNumber(id) || this.parseChapterNumber(text) || 0;

				chapters.push({
					id,
					title: text || `Chapter ${number}`,
					number
				});
			}
		} catch (e) {
			console.warn('[bacakomik] failed to parse chapterData', e);
		}
	}

	// Fallback lama (kalau suatu saat mereka SSR lagi)
	if (!chapters.length) {
		$('a[href*="/chapter/"]').each((_, a) => {
			const href = $(a).attr('href') || '';
			const id = this.cleanId(href);
			if (!/^\/chapter\//i.test(id) || seen.has(id)) return;
			seen.add(id);

			const text = $(a).text().replace(/\s+/g, ' ').trim();
			const number =
				this.parseChapterNumber(id) || this.parseChapterNumber(text) || 0;

			chapters.push({
				id,
				title: text || `Chapter ${number}`,
				number
			});
		});
	}

	chapters.sort((a, b) => (a.number || 0) - (b.number || 0));

	const latestChapter = chapters[chapters.length - 1]?.number;

	const description = [
		alt && `Alternative: ${alt}`,
		authors.length && `Author(s): ${authors.join(', ')}`,
		latestChapter != null && `Latest chapter: ${latestChapter}`,
		synopsis
	]
		.filter(Boolean)
		.join('\n\n');

	console.log(
		`[bacakomik] details ${path} → ch=${chapters.length}, genres=${genres.length}, cover=${!!cover}`
	);

	return {
		id: path,
		sourceId: this.id,
		title,
		cover,
		type: this.detectType(typeHint),
		status,
		description,
		authors,
		genres,
		chapters,
		latestChapter
	};
}

	// ── Pages ────────────────────────────────────────────────────────────────

	async getChapterPages(chapterId: string): Promise<string[]> {
	const path = this.cleanId(chapterId);
	if (!/^\/chapter\//i.test(path)) {
		console.error('[bacakomik] not a chapter path:', chapterId);
		return [];
	}

	try {
		const html = await this.fetchHtml(path + '/');
		const $ = cheerio.load(html);
		const urls: string[] = [];
		const seen = new Set<string>();

		const pick = (src: string) => {
			if (!src || src.startsWith('data:')) return;
			src = this.absUrl(src.split('?')[0]);
			if (!/^https?:\/\//i.test(src)) return;

			// skip ads / logo / gif
			if (
				/logo|icon|avatar|emoji|banner|\.gif$|ads|wp-content\/uploads\/2025\/10\/bacakomik|histats|yandex/i.test(
					src
				)
			)
				return;

			// skip pure ad CDN (r2 ads), tapi izinkan gudangkomik / warungkomik
			if (
				/r2\.dev\//i.test(src) &&
				!/warungkomik|gudangkomik/i.test(src)
			)
				return;

			if (seen.has(src)) return;
			seen.add(src);
			urls.push(src);
		};

		// Selector baru (utama) + fallback lama
		$(
			'.viewer-komik img, .img-wrapper img, .entry-content img, #readerarea img, .reader-area img, article img'
		).each((_, img) => {
			const $img = $(img);
			pick(
				$img.attr('src') ||
					$img.attr('data-src') ||
					$img.attr('data-lazy-src') ||
					$img.attr('data-original') ||
					''
			);
		});

		// Prefer CDN komik yang valid
		const preferred = urls.filter((u) =>
			/gudangkomik|warungkomikcdn|warungkomik/i.test(u)
		);
		const finalUrls = preferred.length ? preferred : urls;

		console.log(`[bacakomik] ${finalUrls.length} pages → ${path}`);
		return finalUrls;
	} catch (e) {
		console.error('[bacakomik] getChapterPages', path, e);
		return [];
	}
  }
}
