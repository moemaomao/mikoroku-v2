import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';
import * as cheerio from 'cheerio';

/**
 * crotpedia.net adapter (HTML scrape)
 *
 * List   : /  |  /page/{n}/   → .flexbox4-item / article
 * Search : /?s=QUERY
 * Detail : /baca/series/{slug}/
 * Chapter: /baca/{slug}-chapter-{n}-bahasa-indonesia/
 * Pages  : .entry-content img, .reader-area img
 */
export class CrotpediaSource extends BaseSource {
    id = 'crotpedia';
    name = 'CrotPedia';
    baseUrl = 'https://crotpedia.net';
    badge = 'Indo';

    private readonly PER_PAGE = 24;

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

    private seriesIdFromChapterPath(path: string): string | null {
        const p = this.cleanId(path);
        const m = p.match(/^\/baca\/(.+?)-chapter-[\d.]+/i);
        if (m?.[1]) return `/baca/series/${m[1]}`;
        return null;
    }

    private detectType(text: string): 'manga' | 'manhwa' | 'manhua' {
        const t = (text || '').toLowerCase();
        if (/\bmanhwa\b/.test(t)) return 'manhwa';
        if (/\bmanhua\b/.test(t)) return 'manhua';
        return 'manga';
    }

    private parseCards($: cheerio.CheerioAPI): Manga[] {
        const out: Manga[] = [];
        const seen = new Set<string>();

        const push = (
            href: string,
            title: string,
            cover: string,
            typeText = '',
            chText = ''
        ) => {
            const id = this.cleanId(href);
            if (!id.includes('/baca/series/')) return;
            if (seen.has(id)) return;
            seen.add(id);

            title = (title || '').replace(/\s+/g, ' ').trim();
            if (!title) return;

            out.push({
                id,
                sourceId: this.id,
                title,
                cover: this.absUrl((cover || '').split('?')[0]),
                type: this.detectType(typeText),
                status: 'Ongoing',
                latestChapter: this.parseChapterNumber(chText) || undefined
            });
        };

        // General selectors for WordPress manga themes
        $('.flexbox4-item, .bs, .listupd .bs, article, .utao').each((_, el) => {
            const $el = $(el);
            const a = $el.find('a[href*="/baca/series/"]').first();
            if (!a.length) return;

            const href = a.attr('href') || '';
            const title =
                a.attr('title') ||
                a.text() ||
                $el.find('.tt h4, .title, h3, h4').text() ||
                $el.find('img').attr('alt') ||
                '';
            const cover =
                $el.find('img').attr('src') ||
                $el.find('img').attr('data-src') ||
                '';
            const typeText = $el.find('.type, .mtype').text() || '';
            const chText = $el.find('ul.chapter, .epxs, .chapter').first().text() || '';

            push(href, title, cover, typeText, chText);
        });

        // Fallback broad selector if structured layout fails
        if (!out.length) {
            $('a[href*="/baca/series/"]').each((_, el) => {
                const $a = $(el);
                const href = $a.attr('href') || '';
                const title = ($a.attr('title') || $a.text() || '')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (!title || title.length < 2) return;
                const $parent = $a.closest('article, li, div');
                const cover =
                    $parent.find('img').attr('src') ||
                    $parent.find('img').attr('data-src') ||
                    $a.find('img').attr('src') ||
                    '';
                push(href, title, cover);
            });
        }

        return out;
    }

    private async fetchListPage(path: string): Promise<Manga[]> {
        try {
            const html = await this.fetchHtml(path);
            if (!html || html.length < 500) {
                console.warn('[crotpedia] empty html', path);
                return [];
            }
            const $ = cheerio.load(html);
            const list = this.parseCards($);
            console.log(`[crotpedia] ${path} → ${list.length} items`);
            return list;
        } catch (e) {
            console.warn('[crotpedia] fetchListPage failed', path, e);
            return [];
        }
    }

    async getLatestManga(
        page: number,
        _opts?: { lang?: string; type?: string }
    ): Promise<Manga[]> {
        try {
            const p = Math.max(1, Number(page) || 1);
            const path = p <= 1 ? `/` : `/page/${p}/`;
            return await this.fetchListPage(path);
        } catch (e) {
            console.error('[crotpedia] getLatestManga', e);
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
            const list = await this.fetchListPage(path);
            console.log(`[crotpedia] search "${q}" → ${list.length}`);
            return list;
        } catch (e) {
            console.error('[crotpedia] searchManga', e);
            return [];
        }
    }

    async getMangaDetails(mangaId: string): Promise<MangaDetails> {
        let path = this.cleanId(mangaId);

        if (!path.includes('/baca/series/')) {
            const series = this.seriesIdFromChapterPath(path);
            if (series) path = series;
        }

        const html = await this.fetchHtml(path + '/');
        const $ = cheerio.load(html);

        let title =
            $('.series-title, .entry-title, h1.title, h1').first().text().trim() ||
            $('meta[property="og:title"]').attr('content') ||
            path;
        title = title
            .replace(/\s*[-|].*CrotPedia.*$/i, '')
            .replace(/\s+/g, ' ')
            .trim();

        let cover =
            $('.series-thumb img, .thumb img, .infox img').first().attr('src') ||
            $('meta[property="og:image"]').attr('content') ||
            '';
        cover = this.absUrl((cover || '').split('?')[0]);

        const meta: Record<string, string> = {};
        $('li, .infox tr, .spe span').each((_, el) => {
            const $el = $(el);
            const text = $el.text().replace(/\s+/g, ' ').trim();
            const parts = text.split(':');
            if (parts.length >= 2) {
                const label = parts[0].trim().toLowerCase();
                const value = parts.slice(1).join(':').trim();
                if (label && value) meta[label] = value;
            }
        });

        const alt = meta['alternative'] || meta['alternatives'] || '';
        const authors: string[] = [];
        const authorRaw = meta['author'] || meta['authors'] || meta['artist'] || '';
        authorRaw
            .split(/,|\//)
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((n) => {
                if (!authors.includes(n)) authors.push(n);
            });

        let status = 'Ongoing';
        const statusHint = $('body').text().slice(0, 2000);
        if (/complete|finished|end/i.test(statusHint)) status = 'Completed';

        let rating = $('.rating, .score, [itemprop="ratingValue"]')
            .first()
            .text()
            .replace(/[^\d.]/g, '')
            .trim();

        const genres: string[] = [];
        $('a[href*="/genre/"], .genrex a, .genre-info a').each((_, a) => {
            const g = $(a).text().replace(/\s+/g, ' ').trim();
            if (g && g.length < 40 && !genres.includes(g)) genres.push(g);
        });

        let synopsis = '';
        $('.entry-content p, .desc p, .synopsis p, [itemprop="description"]').each((_, el) => {
            const t = $(el).text().replace(/\s+/g, ' ').trim();
            if (t.length > 20 && !synopsis) synopsis = t;
        });

        const chapters: Chapter[] = [];
        const seen = new Set<string>();
        $('a[href*="/baca/"]').each((_, a) => {
            const $a = $(a);
            const href = $a.attr('href') || '';
            if (!/chapter/i.test(href) || href.includes('/series/')) return;

            const id = this.cleanId(href);
            if (seen.has(id)) return;
            seen.add(id);

            const text = $a.text().replace(/\s+/g, ' ').trim();
            const number = this.parseChapterNumber(href) || this.parseChapterNumber(text);

            chapters.push({
                id,
                title: text || `Chapter ${number}`,
                number: number || 0,
                date: $a.find('.date').text().trim()
            });
        });

        chapters.sort((a, b) => (a.number || 0) - (b.number || 0));
        const latestChapter = chapters[chapters.length - 1]?.number;

        const description = [
            alt && `Alternative: ${alt}`,
            authors.length && `Author(s): ${authors.join(', ')}`,
            rating && `Rating: ${rating}`,
            synopsis
        ]
            .filter(Boolean)
            .join('\n\n');

        return {
            id: path,
            sourceId: this.id,
            title,
            cover,
            type: this.detectType($('.type').text()),
            status,
            description,
            authors,
            genres,
            chapters,
            latestChapter
        };
    }

    async getChapterPages(chapterId: string): Promise<string[]> {
        const path = this.cleanId(chapterId);
        if (!path.includes('/baca/') || path.includes('/series/')) return [];

        try {
            const html = await this.fetchHtml(path + '/');
            const $ = cheerio.load(html);
            const urls: string[] = [];
            const seen = new Set<string>();

            $('.entry-content img, #readerarea img, .reader-area img, article img').each(
                (_, img) => {
                    const $img = $(img);
                    let src = $img.attr('src') || $img.attr('data-src') || '';
                    if (!src || src.startsWith('data:')) return;
                    src = this.absUrl(src.split('?')[0]);
                    if (!/^https?:\/\//i.test(src) || seen.has(src)) return;
                    if (/logo|icon|avatar|banner/i.test(src)) return;
                    seen.add(src);
                    urls.push(src);
                }
            );

            return urls;
        } catch (e) {
            console.error('[crotpedia] getChapterPages failed', path, e);
            return [];
        }
    }
}