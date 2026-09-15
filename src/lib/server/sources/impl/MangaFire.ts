import { BaseSource } from '../BaseSource';
import type { Chapter, Manga, MangaDetails } from '../types';

/**
 * MangaFire adapter (https://mangafire.to)
 *
 * API membutuhkan VRF token (HMAC-like multi-stage table encrypt).
 *
 * List/Latest : GET /api/titles?order[chapter_updated_at]=desc&page=&limit=
 * Search      : GET /api/titles?keyword=&page=&limit=
 * Detail      : GET /api/titles/{hid}
 * Chapters    : GET /api/titles/{hid}/chapters?language=&page=&limit=
 * Pages       : GET /api/chapters/{chapterId} → data.pages[].url
 *
 * Language filter (sama pola MangaDex):
 *   opts.lang → normalize → language[] pada /api/titles
 *   chapters  → ?language=en|es|es-la|fr|ja|pt|pt-br
 *
 * ID format:
 *   manga   : "/title/{hid}"
 *   chapter : "/title/{hid}/chapter/{chapterId}"
 */
export class MangaFireSource extends BaseSource {
    id = 'mangafire';
    name = 'MangaFire';
    baseUrl = 'https://mangafire.to';

    private readonly PER_PAGE = 24;
    private readonly DEFAULT_LANG = 'en';

    private readonly SUPPORTED_LANGS = new Set([
        'en',
        'es',
        'es-la',
        'fr',
        'ja',
        'pt',
        'pt-br'
    ]);


    private vrfStages: Array<{ table: Uint8Array; key: Uint8Array; iv: number }> | null =
        null;

    private getVrfStages() {
        if (this.vrfStages) return this.vrfStages;
        const b64 = (s: string): Uint8Array => {
            const bin = atob(s);
            const out = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
            return out;
        };
        this.vrfStages = [
            {
                table: b64(
                    'yINlmUNho8VYJT+ibTIP+9ESiULpVEtMOoD6U6lRE0R/xwXo/Xp9NrUgC4cw/Lmo33vUyjUE40kUoEWIr/fxfNNcq2s79ShQ5NhNrFnJ4hXPwOu/SuXzIbuTQKGFvfm08E9jvCfqAtoDqvQq3dVWPQFmJjgvkISBeXY3BgANR+yVnjGbcxZ47d6kLNfZPIayTq3/YGySb1KuVZodWp/WGNAO5pfMcpaK53Hhs0allBszaMaxuouOwdxbwgxIw6YunSsXjI05Yi0j9j4eHKfSXR8Ifo/Od+8iamRfCXTyvm7NGRGYdcQ0ywcK/u6RXhrbcCm4t2eCtrDgQVecJGkQ+A=='
                ),
                key: b64('0Ec58JOY3uBzJK9m3zqIOpdlF7UFiax9DmA='),
                iv: 0x5a
            },
            {
                table: b64(
                    'IUFltCxD3Oc2cwCgkJffthaOg9cgPUb0LgW6H/VtfcF0kc5F25t+aWj6JH9VOhOaY0rAFdUxlDnl5BLNvwEJvQtP5qcw7vdb/K+chnbwnspSHT8mz5lqwz41TezG0hkO06FTjJZhsyNuFLDpD2ZZxQj/QIRcF90zpmQ7Byu483WsQqUE0C342HL+JXngRB6fRzxRyVTaKu83h7UYTJ0QMt6ixFh6S3F8gqkKwrGTL3jHNBsD45UnifK8+RGtishQV2K3rujLKEkiZxpr2dYcudFW4oFsDKhad3CLBvuyTqsCo4B7mL5IKQ1vXo/MOOvq1I1d8ar9X6Ttu5KF4fZgiA=='
                ),
                key: b64('AAdjb1iPY8CiDmq9H34tKTBF8a3oDQ=='),
                iv: 0x35
            },
            {
                table: b64(
                    'NQHlu1/wVO5EmkwQymF810qqY2xG1k2obcas4Z9mCsPEIFl9pRIjFxbJ7ybMHbBckT5Ton85E0FOeHezbh/mjlEYpmpnlXOS8dgrqeq2KfxImTh1YK9y0PeMNhzA1OQzSY9brYOJq/l2QnE/hwOeZIhPixVSKIUlDb5vLcH6RWKxkIEMuP0bDwIqQ71AJJaEaMJL7A6YtyIwoRT+L5v4aZzodN/0+3nOGsfblFjgxSfPzVDjNFeNl5P26+kEC/8AHgdrpAbt3hHz3HrRN1Y6e+JHgF7ncFWnoF0y3THL1S71WgWGCa6KtSzTCCG58n68nTyj2T3Sshk7utqCtMi/ZQ=='
                ),
                key: b64('DELOJgPsVaCcblDtTGMdHzM='),
                iv: 0xba
            }
        ];
        return this.vrfStages;
    }

    private encryptStage(
        data: Uint8Array,
        table: Uint8Array,
        key: Uint8Array,
        iv: number
    ): Uint8Array {
        const out = new Uint8Array(data.length);
        let prev = iv;
        const keySize = key.length;
        for (let i = 0; i < data.length; i++) {
            prev = table[(data[i]! ^ key[i % keySize]! ^ prev) & 0xff]! & 0xff;
            out[i] = prev;
        }
        return out;
    }

    private signVrf(path: string): string {
        let data: Uint8Array = new TextEncoder().encode(path);
        for (const stage of this.getVrfStages()) {
            data = this.encryptStage(data, stage.table, stage.key, stage.iv);
        }
        let bin = '';
        for (let i = 0; i < data.length; i++) bin += String.fromCharCode(data[i]!);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    private buildSignedUrl(
        apiPath: string,
        params: Array<[string, string | number]> = []
    ): string {
        const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
        const sorted = [...params].sort((a, b) => a[0].localeCompare(b[0]));

        let lastKey = '';
        let index = 0;
        const signedParts = sorted.map(([key, value]) => {
            let newKey = key;
            if (key.endsWith('[]')) {
                if (lastKey !== key) index = 0;
                lastKey = key;
                newKey = key.replace('[]', `[${index++}]`);
            }
            return `${newKey}=${value}`;
        });

        const toSign =
            path + (signedParts.length ? `?${signedParts.join('&')}` : '');
        const vrf = this.signVrf(toSign);

        const url = new URL(`${this.baseUrl}/api${path}`);
        for (const [k, v] of params) {
            url.searchParams.append(k, String(v));
        }
        url.searchParams.set('vrf', vrf);
        return url.toString();
    }

    // ── HTTP ─────────────────────────────────────────────────────────────────

    private reqHeaders(): Record<string, string> {
        return {
            ...this.headers,
            Accept: 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            Origin: this.baseUrl,
            Referer: `${this.baseUrl}/`
        };
    }

    private async apiGet<T = any>(
        apiPath: string,
        params: Array<[string, string | number]> = []
    ): Promise<T> {
        const url = this.buildSignedUrl(apiPath, params);
        const maxAttempts = 3;
        let lastErr: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const res = await fetch(url, { headers: this.reqHeaders() });
                const text = await res.text();
                if (!res.ok) {
                    console.error(
                        `[mangafire] HTTP ${res.status} ${apiPath}`,
                        text.slice(0, 200)
                    );
                    if (res.status === 429 || res.status === 503) {
                        lastErr = new Error(`MangaFire HTTP ${res.status}`);
                        await new Promise((r) => setTimeout(r, 400 * attempt));
                        continue;
                    }
                    throw new Error(`MangaFire HTTP ${res.status}: ${text.slice(0, 120)}`);
                }
                return JSON.parse(text) as T;
            } catch (e) {
                lastErr = e;
                if (attempt < maxAttempts) {
                    await new Promise((r) => setTimeout(r, 300 * attempt));
                    continue;
                }
            }
        }

        throw lastErr instanceof Error
            ? lastErr
            : new Error('MangaFire request failed');
    }

    // ── Language (pola MangaDex) ─────────────────────────────────────────────

    private normalizeLang(lang?: string): string | null {
        const raw = String(lang || '')
            .trim()
            .toLowerCase();
        if (!raw || raw === 'all' || raw === 'any' || raw === '*') return null;

        const aliases: Record<string, string> = {
            english: 'en',
            indonesian: 'id',
            indonesia: 'id',
            bahasa: 'id',
            japanese: 'ja',
            japan: 'ja',
            korean: 'ko',
            korea: 'ko',
            chinese: 'zh',
            french: 'fr',
            spanish: 'es',
            'latin american spanish': 'es-la',
            'es-419': 'es-la',
            portuguese: 'pt',
            'brazilian portuguese': 'pt-br',
            'pt-br': 'pt-br',
            russian: 'ru',
            vietnamese: 'vi',
            thai: 'th',
            arabic: 'ar',
            german: 'de',
            italian: 'it'
        };
        if (aliases[raw]) return aliases[raw];
        if (/^[a-z]{2}(-[a-z]{2,4})?$/.test(raw)) return raw;
        return null;
    }

    private toApiLang(lang?: string | null): string {
        const n = this.normalizeLang(lang ?? undefined);
        if (!n) return this.DEFAULT_LANG;
        if (this.SUPPORTED_LANGS.has(n)) return n;
        if (n === 'id') return this.DEFAULT_LANG;
        return this.DEFAULT_LANG;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private toMangaId(hid: string): string {
        return `/title/${String(hid).replace(/^\/+|\/+$/g, '')}`;
    }

    private extractHid(mangaId: string): string {
        const parts = String(mangaId)
            .replace(/^\/+/, '')
            .split('/')
            .filter(Boolean);
        if (parts[0]?.toLowerCase() === 'title' && parts[1]) {
            return parts[1].split('-')[0] || parts[1];
        }
        return (parts[0] || '').split('-')[0] || '';
    }

    private toChapterId(hid: string, chapterId: string | number): string {
        return `/title/${hid}/chapter/${chapterId}`;
    }

    private extractChapterParts(chapterId: string): {
        hid: string;
        chapterId: string;
    } {
        const s = String(chapterId).replace(/^\/+/, '');
        const m = s.match(/^title\/([^/]+)\/chapter\/(.+)$/i);
        if (m) {
            return {
                hid: m[1].split('-')[0] || m[1],
                chapterId: m[2]
            };
        }
        const parts = s.split('/').filter(Boolean);
        return {
            hid: parts[0] === 'title' ? (parts[1] || '').split('-')[0] : parts[0] || '',
            chapterId: parts[parts.length - 1] || ''
        };
    }

    private mapStatus(status?: string | null): string {
        const s = String(status || '').toLowerCase();
        if (s === 'finished' || s === 'completed') return 'Completed';
        if (s === 'on_hiatus' || s === 'hiatus') return 'Hiatus';
        if (s === 'discontinued' || s === 'cancelled') return 'Cancelled';
        return 'Ongoing';
    }

    private mapType(type?: string | null): string {
        const t = String(type || '').toLowerCase();
        if (t === 'manhwa') return 'manhwa';
        if (t === 'manhua') return 'manhua';
        if (t === 'manga') return 'manga';
        return t || 'manga';
    }

    private formatDate(unix?: number | null): string {
        if (unix == null || !Number.isFinite(Number(unix))) return '';
        try {
            const ms = Number(unix) > 1e12 ? Number(unix) : Number(unix) * 1000;
            return new Date(ms).toISOString().slice(0, 10);
        } catch {
            return '';
        }
    }

    private stripHtml(html?: string | null): string {
        if (!html) return '';
        return String(html)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private mapListItem(item: any, lang?: string | null): Manga | null {
        const hid = item?.hid;
        const title = String(item?.title || '').trim();
        if (!hid || !title) return null;

        const cover =
            item?.poster?.large ||
            item?.poster?.medium ||
            item?.poster?.small ||
            '';

        const latest =
            item?.latestChapter != null && item.latestChapter !== ''
                ? String(item.latestChapter)
                : undefined;

        const langCode = this.toApiLang(lang);

        return {
            id: this.toMangaId(hid),
            sourceId: this.id,
            title,
            cover,
            type: this.mapType(item?.type),
            status: this.mapStatus(item?.status),
            latestChapter: latest,
            lang: langCode
        } as Manga & { lang?: string };
    }

    // ── Catalog ──────────────────────────────────────────────────────────────

    async getLatestManga(
        page: number,
        opts?: { lang?: string; type?: string }
    ): Promise<Manga[]> {
        const p = Math.max(1, Number(page) || 1);
        const lang = this.normalizeLang(opts?.lang);
        const apiLang = lang ? this.toApiLang(lang) : null;

        try {
            const params: Array<[string, string | number]> = [
                ['order[chapter_updated_at]', 'desc'],
                ['page', p],
                ['limit', this.PER_PAGE]
            ];
            if (apiLang) params.push(['language[]', apiLang]);
            if (opts?.type) {
                const t = this.mapType(opts.type);
                if (t) params.push(['types[]', t]);
            }

            const data = await this.apiGet<{ items?: any[] }>('/titles', params);
            const list = (data?.items || [])
                .map((it) => this.mapListItem(it, apiLang))
                .filter(Boolean) as Manga[];

            console.log(
                `[mangafire] latest page=${p} lang=${apiLang ?? 'all'} → ${list.length}`
            );
            return list;
        } catch (e) {
            console.error('[mangafire] getLatestManga', e);
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

        const lang = this.normalizeLang(opts?.lang);
        const apiLang = lang ? this.toApiLang(lang) : null;

        try {
            const params: Array<[string, string | number]> = [
                ['keyword', q],
                ['page', page],
                ['limit', this.PER_PAGE]
            ];
            if (apiLang) params.push(['language[]', apiLang]);
            if (opts?.type) {
                const t = this.mapType(opts.type);
                if (t) params.push(['types[]', t]);
            }

            const data = await this.apiGet<{ items?: any[] }>('/titles', params);
            const list = (data?.items || [])
                .map((it) => this.mapListItem(it, apiLang))
                .filter(Boolean) as Manga[];

            console.log(
                `[mangafire] search "${q}" page=${page} lang=${apiLang ?? 'all'} → ${list.length}`
            );
            return list;
        } catch (e) {
            console.error('[mangafire] searchManga', e);
            return [];
        }
    }

    // ── Details ──────────────────────────────────────────────────────────────

    async getMangaDetails(
        mangaId: string,
        opts?: { lang?: string }
    ): Promise<MangaDetails> {
        const hid = this.extractHid(mangaId);
        if (!hid) throw new Error(`Invalid mangafire id: ${mangaId}`);

        const apiLang = this.toApiLang(opts?.lang);

        const detail = await this.apiGet<{ data?: any }>(`/titles/${encodeURIComponent(hid)}`);
        const data = detail?.data ?? detail;
        if (!data?.hid && !data?.title) {
            throw new Error(`Manga not found: ${hid}`);
        }

        const title = String(data.title || hid).trim();
        const cover =
            data?.poster?.large ||
            data?.poster?.medium ||
            data?.poster?.small ||
            '';
        const status = this.mapStatus(data.status);
        const type = this.mapType(data.type);
        const synopsis = this.stripHtml(data.synopsisHtml || data.synopsis || '');

        const authors: string[] = [];
        for (const list of [data.authors, data.artists]) {
            if (!Array.isArray(list)) continue;
            for (const a of list) {
                const n = String(a?.title || a?.name || a || '').trim();
                if (n && !authors.includes(n)) authors.push(n);
            }
        }

        const genres: string[] = [];
        for (const list of [data.genres, data.themes]) {
            if (!Array.isArray(list)) continue;
            for (const g of list) {
                const n = String(g?.title || g?.name || g || '').trim();
                if (n && n.length < 40 && !genres.includes(n)) genres.push(n);
            }
        }
        if (type && !genres.includes(type)) genres.unshift(type);

        const chapters: Chapter[] = [];
        const seen = new Set<string>();
        let page = 1;
        let lastPage = 1;
        const LIMIT = 200;

        do {
            const chData = await this.apiGet<{
                items?: any[];
                meta?: { lastPage?: number; hasNext?: boolean };
            }>(`/titles/${encodeURIComponent(hid)}/chapters`, [
                ['language', apiLang],
                ['sort', 'number'],
                ['order', 'desc'],
                ['page', page],
                ['limit', LIMIT]
            ]);

            lastPage = chData?.meta?.lastPage ?? page;
            const items = Array.isArray(chData?.items) ? chData.items : [];

            for (const u of items) {
                const cid = String(u?.id ?? '').trim();
                if (!cid || seen.has(cid)) continue;
                seen.add(cid);

                const num = parseFloat(String(u?.number ?? ''));
                const number = Number.isFinite(num) ? num : chapters.length + 1;
                const extra = String(u?.name || '').trim();
                const chTitle = extra
                    ? `Chapter ${String(u?.number ?? number).replace(/\.0$/, '')} - ${extra}`
                    : `Chapter ${String(u?.number ?? number).replace(/\.0$/, '')}`;

                chapters.push({
                    id: this.toChapterId(hid, cid),
                    title: chTitle,
                    number,
                    date: this.formatDate(u?.createdAt),
                    lang: String(u?.language || apiLang).toLowerCase() || undefined
                } as Chapter & { lang?: string });
            }

            page++;
        } while (page <= lastPage && page <= 20); // safety cap

        chapters.sort((a, b) => (b.number || 0) - (a.number || 0));
        const latestChapter =
            chapters[0]?.number != null ? String(chapters[0].number) : undefined;

        const publication =
            data.year != null && String(data.year).trim()
                ? String(data.year).trim()
                : '';

        const metaLines = [
            publication && `Publication: ${publication}`,
            authors[0] && `Author: ${authors.join(', ')}`,
            authors[0] && `Artist: ${authors.join(', ')}`,
            `Language: ${apiLang}`,
            `Type: ${type}`
        ].filter(Boolean);

        const description = [...metaLines, synopsis].filter(Boolean).join('\n');

        console.log(
            `[mangafire] details ${hid} lang=${apiLang} → ch=${chapters.length}`
        );

        return {
            id: this.toMangaId(hid),
            sourceId: this.id,
            title,
            cover,
            type,
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
        const { chapterId: cid } = this.extractChapterParts(chapterId);
        if (!cid) {
            console.error('[mangafire] getChapterPages bad id:', chapterId);
            return [];
        }

        try {
            const data = await this.apiGet<{
                data?: { pages?: Array<{ url?: string }> };
            }>(`/chapters/${encodeURIComponent(cid)}`);

            const pages = Array.isArray(data?.data?.pages) ? data.data.pages : [];
            const urls = pages
                .map((p) => String(p?.url || '').trim())
                .filter((u) => /^https?:\/\//i.test(u));

            console.log(`[mangafire] ${urls.length} pages → chapter ${cid}`);
            return urls;
        } catch (e) {
            console.error('[mangafire] getChapterPages failed', cid, e);
            return [];
        }
    }
}
