import { BaseSource } from '../BaseSource';
import type { Manga, MangaDetails, Chapter } from '../types';
import * as cheerio from 'cheerio';

/**
 * KingComix Adapter
 * https://kingcomix.com
 *
 * WordPress theme: ultimatecomix
 * - Catalog: /  |  /page/{n}/
 * - Search:  /?s={query}
 * - Detail:  /{slug}/
 * - One-shot: semua page image ada di .entry-content
 */
export class KingcomixSource extends BaseSource {
	id = 'kingcomix';
	name = 'KingComix';
	baseUrl = 'https://kingcomix.com';

	private absUrl(href: string): string {
		if (!href) return '';
		if (href.startsWith('http')) return href;
		if (href.startsWith('//')) return `https:${href}`;
		return `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
	}

	/** Normalize id → path bersih, contoh: /monica-the-tsundere-mewtwo-gammainks/ */
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
		// buang query/hash
		id = id.split('?')[0].split('#')[0];
		// pastikan trailing slash konsisten
		if (!id.endsWith('/')) id += '/';
		return id;
	}

	private isJunkPath(path: string): boolean {
		const p = path.toLowerCase();
		return (
			p.includes('/page/') ||
			p.includes('/category/') ||
			p.includes('/tag/') ||
			p.includes('/wp-') ||
			p.includes('/login') ||
			p.includes('/register') ||
			p.includes('/contact') ||
			p.includes('/cookie') ||
			p.includes('/dmca') ||
			p.includes('/legal') ||
			p.includes('/categories/') ||
			p.includes('/tags/') ||
			p === '/' ||
			p === '/#'
		);
	}

	private parseList($: cheerio.CheerioAPI): Manga[] {
		const res: Manga[] = [];
		const seen = new Set<string>();

		// Homepage pakai .entry, search pakai article.post
		const cards = $('.entry, article.post, article.type-post');

		cards.each((_, el) => {
			const $card = $(el);

			// Link utama ke komik
			const $a = $card
				.find('a[href*="kingcomix.com/"], a[href^="/"]')
				.filter((_, a) => {
					const href = $(a).attr('href') || '';
					const path = this.cleanId(href);
					return !this.isJunkPath(path) && path.split('/').filter(Boolean).length === 1;
				})
				.first();

			let href = $a.attr('href') || '';
			if (!href) {
				// fallback: ambil anchor pertama yang valid di card
				$card.find('a[href]').each((_, a) => {
					const h = $(a).attr('href') || '';
					const path = this.cleanId(h);
					if (!this.isJunkPath(path) && path.split('/').filter(Boolean).length === 1) {
						href = h;
						return false;
					}
				});
			}
			if (!href) return;

			const id = this.cleanId(href);
			if (this.isJunkPath(id) || seen.has(id)) return;
			seen.add(id);

			// Title
			let title =
				$card.find('h2, h3, .entry-title').first().text().replace(/\s+/g, ' ').trim() ||
				$a.text().replace(/\s+/g, ' ').trim() ||
				id.replace(/\//g, '').replace(/-/g, ' ');

			// Cover — prefer full size, fallback thumbnail
			const $img = $card.find('img').first();
			let cover =
				$img.attr('data-src') ||
				$img.attr('data-lazy-src') ||
				$img.attr('src') ||
				'';
			// srcset: ambil url terbesar / pertama
			const srcset = $img.attr('srcset') || '';
			if (!cover && srcset) {
				cover = srcset.split(',')[0].trim().split(/\s+/)[0];
			}
			// upgrade thumbnail -263x365.webp → full .webp bila memungkinkan
			cover = cover.replace(/-\d+x\d+(\.(webp|jpe?g|png))$/i, '$1');
			cover = this.absUrl(cover);

			res.push({
				id,
				title,
				cover,
				sourceId: this.id,
				type: 'comic',
				status: 'Completed'
			});
		});

		// Fallback kalau selector card kosong: scan semua link valid
		if (res.length === 0) {
			$('a[href]').each((_, el) => {
				const href = $(el).attr('href') || '';
				const id = this.cleanId(href);
				if (this.isJunkPath(id) || seen.has(id)) return;
				if (id.split('/').filter(Boolean).length !== 1) return;

				const title = $(el).text().replace(/\s+/g, ' ').trim();
				if (!title || title.length < 3) return;

				seen.add(id);
				const $img = $(el).find('img').first().length
					? $(el).find('img').first()
					: $(el).parent().find('img').first();
				let cover = $img.attr('src') || $img.attr('data-src') || '';
				cover = cover.replace(/-\d+x\d+(\.(webp|jpe?g|png))$/i, '$1');
				cover = this.absUrl(cover);

				res.push({
					id,
					title,
					cover,
					sourceId: this.id,
					type: 'comic',
					status: 'Completed'
				});
			});
		}

		return res;
	}

	async getLatestManga(
		page: number,
		_opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			const path = p <= 1 ? '/' : `/page/${p}/`;
			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			return this.parseList($);
		} catch (e) {
			console.error('[kingcomix] getLatestManga', e);
			return [];
		}
	}

	async searchManga(
		query: string,
		opts?: { page?: number; lang?: string; type?: string }
	): Promise<Manga[]> {
		const q = (query || '').trim();
		const page = Math.max(1, opts?.page || 1);

		if (!q) return this.getLatestManga(page);

		try {
			// WordPress search; page 2+ jarang dipakai, tapi sediakan
			const params = new URLSearchParams();
			params.set('s', q);
			if (page > 1) params.set('paged', String(page));

			const html = await this.fetchHtml(`/?${params.toString()}`);
			const $ = cheerio.load(html);
			return this.parseList($);
		} catch (e) {
			console.error('[kingcomix] searchManga', e);
			return [];
		}
	}

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const path = this.cleanId(mangaId);
		if (!path || path === '/') throw new Error(`Invalid KingComix id: ${mangaId}`);

		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);

		// Title
		let title =
			$('h1.entry-title, h1').first().text().replace(/\s+/g, ' ').trim() ||
			$('title')
				.text()
				.replace(/\s*-\s*KingComiX.*$/i, '')
				.trim() ||
			path.replace(/\//g, '').replace(/-/g, ' ');

		// Cover: gambar pertama di content / thumbnail
		let cover =
			$('.entry-content img, article img')
				.filter((_, img) => {
					const src = $(img).attr('src') || '';
					return src.includes('/wp-content/uploads/') && !/banner|logo|discord|twitter/i.test(src);
				})
				.first()
				.attr('src') ||
			$('meta[property="og:image"]').attr('content') ||
			'';
		cover = this.absUrl(cover);

		// Authors: sering ada di title setelah " – " (contoh: Title – Artist)
		const authors: string[] = [];
		const dashSplit = title.split(/\s+[–—-]\s+/);
		if (dashSplit.length >= 2) {
			const artist = dashSplit[dashSplit.length - 1].trim();
			if (artist && artist.length < 40) authors.push(artist);
		}

		// Genres dari category + tag di halaman
		const genres: string[] = [];
		$('a[href*="/category/"], a[href*="/tag/"]').each((_, el) => {
			const t = $(el).text().replace(/\s+/g, ' ').trim();
			// skip menu noise
			if (
				t &&
				!genres.includes(t) &&
				!/exclusive|best porn|categories|tags/i.test(t) &&
				t.length < 40
			) {
				genres.push(t);
			}
		});

		// Description
		let synopsis =
			$('meta[name="description"]').attr('content')?.trim() ||
			$('.entry-content p').first().text().replace(/\s+/g, ' ').trim() ||
			'';

		// Hitung jumlah page image (untuk info)
		const pageCount = this.extractPageImages($).length;

		// Meta untuk UI (parseMeta)
		const metaLines: string[] = [
			`Status: Completed`,
			`Type: comic`,
			pageCount > 0 ? `Pages: ${pageCount}` : ''
		].filter(Boolean);

		const description = [...metaLines, synopsis].filter(Boolean).join('\n');

		// One-shot → 1 chapter (id = path yang sama)
		const chapters: Chapter[] = [
			{
				id: path,
				title: 'Read',
				number: 1,
				date: ''
			}
		];

		return {
			id: path,
			sourceId: this.id,
			title,
			cover,
			type: 'comic',
			status: 'Completed',
			description,
			authors,
			genres,
			chapters
		};
	}

	async getChapterPages(chapterId: string): Promise<string[]> {
		const path = this.cleanId(chapterId);
		const html = await this.fetchHtml(path);
		const $ = cheerio.load(html);
		return this.extractPageImages($);
	}

private extractPageImages($: cheerio.CheerioAPI): string[] {
	const pages: string[] = [];
	const seen = new Set<string>();

	// Ambil scope yang pasti Element (hindari $.root() yang bertipe Document)
	let $scope = $('.entry-content').first();
	if (!$scope.length) $scope = $('article .post-content').first();
	if (!$scope.length) $scope = $('article').first();
	// fallback terakhir: seluruh body
	if (!$scope.length) $scope = $('body');

	$scope.find('img').each((_, img) => {
		const $img = $(img);
		let src =
			$img.attr('data-src') ||
			$img.attr('data-lazy-src') ||
			$img.attr('src') ||
			'';

		// srcset fallback
		if ((!src || src.startsWith('data:')) && $img.attr('srcset')) {
			src = ($img.attr('srcset') || '').split(',')[0].trim().split(/\s+/)[0];
		}

		src = src.replace(/\s+/g, '').trim();
		if (!src || src.startsWith('data:')) return;

		const low = src.toLowerCase();
		if (
			!low.includes('/wp-content/uploads/') ||
			/banner|logo|discord|twitter|gravatar|emoji|smiley|icon|avatar/i.test(low)
		) {
			return;
		}

		// Upgrade thumbnail -WWxHH.ext → full size
		src = src.replace(/-\d+x\d+(\.(webp|jpe?g|png))(\?.*)?$/i, '$1');
		src = this.absUrl(src);

		if (!seen.has(src)) {
			seen.add(src);
			pages.push(src);
		}
	});

	// Sort by trailing number di filename
	pages.sort((a, b) => {
		const numA = parseInt(a.match(/(\d+)\.(webp|jpe?g|png)/i)?.[1] || '0', 10);
		const numB = parseInt(b.match(/(\d+)\.(webp|jpe?g|png)/i)?.[1] || '0', 10);
		return numA - numB;
	});

	return pages;
  }
}