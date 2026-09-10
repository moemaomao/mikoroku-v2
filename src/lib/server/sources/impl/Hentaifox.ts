import { BaseSource } from '../BaseSource';
import type { Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * HentaiFox adapter
 * List   : /  |  /page/{n}/
 * Search : /search/?q=
 * Detail : /gallery/{id}/
 * Pages  : thumb → full image (webp) di i*.hentaifox.com
 * ID     : "/{numericId}"
 */
export class HentaifoxSource extends BaseSource {
	id = 'hentaifox';
	name = 'HentaiFox';
	baseUrl = 'https://hentaifox.com';

	private absUrl(href: string): string {
		if (!href) return '';
		if (href.startsWith('http')) return href;
		if (href.startsWith('//')) return `https:${href}`;
		return `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;
	}

	private toId(gid: string | number): string {
		const n = String(gid).replace(/\D/g, '');
		return `/${n}`;
	}

	private extractGid(mangaId: string): string {
		return String(mangaId).replace(/\D/g, '');
	}

	/** 1t.jpg / thumb.jpg → full image */
	private thumbToFull(url: string): string {
		if (!url) return '';
		return url
			.replace(/\/(\d+)t\.(jpg|jpeg|png|webp)$/i, '/$1.webp')
			.replace(/\/thumb\.(jpg|jpeg|png|webp)$/i, '/1.webp')
			.replace(/\/cover\.(jpg|jpeg|png|webp)$/i, '/1.webp');
	}

	private cleanTagText($: cheerio.CheerioAPI, el: any): string {
		return $(el).clone().children().remove().end().text().replace(/\s+/g, ' ').trim();
	}

	private parseList($: cheerio.CheerioAPI): Manga[] {
		const res: Manga[] = [];
		const seen = new Set<string>();

		$('div.thumb').each((_, el) => {
			const $el = $(el);

			// ID dari link gallery
			const link =
				$el.find('h2.g_title a[href*="/gallery/"]').attr('href') ||
				$el.find('a[href*="/gallery/"]').attr('href') ||
				'';
			const m = link.match(/\/gallery\/(\d+)/);
			if (!m) return;

			const id = this.toId(m[1]);
			if (seen.has(id)) return;
			seen.add(id);

			// Judul HANYA dari h2.g_title (jangan ambil link cover yang teksnya kosong)
			let title = $el.find('h2.g_title a').first().text().replace(/\s+/g, ' ').trim();
			if (!title) {
				title =
					$el.find('.caption a').first().text().replace(/\s+/g, ' ').trim() ||
					`Gallery ${m[1]}`;
			}

			// Cover
			const img = $el.find('.inner_thumb img, img.lazy, img').first();
			let cover =
				img.attr('data-src') ||
				img.attr('data-original') ||
				img.attr('src') ||
				'';
			if (cover.startsWith('data:')) {
				cover = img.attr('data-src') || img.attr('data-original') || '';
			}
			cover = this.absUrl(cover);

			// Type: buang badge angka
			let type =
				this.cleanTagText($, $el.find('.g_cat a, h3.g_cat a').get(0)) ||
				$el.find('.g_cat a, h3.g_cat a').first().text().replace(/\d+/g, '').trim() ||
				'doujinshi';
			type = type.toLowerCase() || 'doujinshi';

			res.push({
				id,
				title,
				cover,
				sourceId: this.id,
				type,
				status: 'Completed'
			});
		});

		return res;
	}

	async getLatestManga(
		page: number,
		opts?: { lang?: string; type?: string }
	): Promise<Manga[]> {
		try {
			const p = Math.max(1, Number(page) || 1);
			const lang = (opts?.lang || 'all').toLowerCase();

			let path: string;
			if (lang && lang !== 'all') {
				path = p <= 1 ? `/language/${lang}/` : `/language/${lang}/page/${p}/`;
			} else {
				path = p <= 1 ? '/' : `/page/${p}/`;
			}

			const html = await this.fetchHtml(path);
			const $ = cheerio.load(html);
			return this.parseList($);
		} catch (e) {
			console.error('[hentaifox] getLatestManga', e);
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

		if (!q) return this.getLatestManga(page, { lang, type: opts?.type });

		try {
			const params = new URLSearchParams();
			params.set('q', q);
			if (page > 1) params.set('page', String(page));

			const html = await this.fetchHtml(`/search/?${params.toString()}`);
			const $ = cheerio.load(html);
			return this.parseList($);
		} catch (e) {
			console.error('[hentaifox] searchManga', e);
			return [];
		}
	}

	async getMangaDetails(mangaId: string): Promise<MangaDetails> {
		const gid = this.extractGid(mangaId);
		if (!gid) throw new Error(`Invalid HentaiFox id: ${mangaId}`);

		const html = await this.fetchHtml(`/gallery/${gid}/`);
		const $ = cheerio.load(html);

		const title =
			$('div.info h1, .info h1, h1').first().text().replace(/\s+/g, ' ').trim() ||
			$('title')
				.text()
				.replace(/\s*-\s*HentaiFox.*$/i, '')
				.trim() ||
			`Gallery ${gid}`;

		// Cover: .cover img pakai src langsung
		let cover =
			$('div.cover img').attr('src') ||
			$('div.cover img').attr('data-src') ||
			$('meta[property="og:image"]').attr('content') ||
			$('.gallery_thumb img').first().attr('data-src') ||
			$('.gallery_thumb img').first().attr('src') ||
			'';
		cover = this.absUrl(cover);
		if (cover.startsWith('//')) cover = 'https:' + cover;

		const genres: string[] = [];
		$('ul.tags a.tag_btn, ul.tags a').each((_, el) => {
			const t = this.cleanTagText($, el);
			if (t) genres.push(t);
		});

		const authors: string[] = [];
		$('ul.artists a.tag_btn, ul.artists a').each((_, el) => {
			const t = this.cleanTagText($, el);
			if (t) authors.push(t);
		});

		const groups: string[] = [];
		$('ul.groups a.tag_btn, ul.groups a').each((_, el) => {
			const t = this.cleanTagText($, el);
			if (t) groups.push(t);
		});

		const languages: string[] = [];
		$('ul.languages a.tag_btn, ul.languages a').each((_, el) => {
			const t = this.cleanTagText($, el);
			if (t) languages.push(t);
		});

		let type =
			this.cleanTagText($, $('a[href*="/category/"]').get(0)) ||
			$('a[href*="/category/"]').first().text().replace(/\d+/g, '').trim() ||
			'doujinshi';

		let pageCount = 0;
		const pagesMatch = $.root().text().match(/Pages:\s*(\d+)/i);
		if (pagesMatch) pageCount = parseInt(pagesMatch[1], 10);
		if (!pageCount) {
			pageCount = $('div.gallery_thumb a[href*="/g/"]').length;
		}

		const id = this.toId(gid);
		const descParts = [
			languages.length && `Language: ${languages.join(', ')}`,
			type && `Type: ${type}`,
			authors.length && `Artists: ${authors.join(', ')}`,
			groups.length && `Groups: ${groups.join(', ')}`,
			pageCount && `Pages: ${pageCount}`
		].filter(Boolean);

		return {
			id,
			sourceId: this.id,
			title,
			cover,
			type: type.toLowerCase(),
			status: 'Completed',
			description: descParts.join('\n'),
			authors: authors.length ? authors : groups,
			genres,
			chapters: [
				{
					id,
					title: 'Read',
					number: 1,
					date: ''
				}
			]
		};
	}

	async getChapterPages(chapterId: string): Promise<string[]> {
		const gid = this.extractGid(chapterId);
		if (!gid) return [];

		const html = await this.fetchHtml(`/gallery/${gid}/`);
		const $ = cheerio.load(html);

		const pages: string[] = [];
		const seen = new Set<string>();

		// Dari thumbnail gallery
		$('div.gallery_thumb a img, #append_thumbs img').each((_, img) => {
			let src =
				$(img).attr('data-src') ||
				$(img).attr('data-original') ||
				$(img).attr('src') ||
				'';
			if (!src || src.startsWith('data:')) return;
			src = this.absUrl(src);
			const full = this.thumbToFull(src);
			if (full && !seen.has(full)) {
				seen.add(full);
				pages.push(full);
			}
		});

		if (pages.length) return pages;

		// Fallback: Pages: N + pattern dari sample image
		const pagesMatch = $.root().text().match(/Pages:\s*(\d+)/i);
		const count = pagesMatch ? parseInt(pagesMatch[1], 10) : 0;
		const sample =
			$('img[data-src*="hentaifox.com"]').first().attr('data-src') ||
			$('img[src*="hentaifox.com"]').first().attr('src') ||
			$('div.cover img').attr('src') ||
			'';

		const baseMatch = sample.match(
			/(https?:\/\/i\d*\.hentaifox\.com\/\d+\/\d+)\//i
		) || sample.match(
			/(\/\/i\d*\.hentaifox\.com\/\d+\/\d+)\//i
		);

		if (baseMatch && count > 0) {
			let base = baseMatch[1];
			if (base.startsWith('//')) base = 'https:' + base;
			for (let i = 1; i <= count; i++) {
				pages.push(`${base}/${i}.webp`);
			}
		}

		return pages;
	}
}