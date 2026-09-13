/**
 * Home Page - Server Load
 */

import { getAllSources, getSource } from '$lib/server/sources';
import type { PageServerLoad } from './$types';

const LOAD_TIMEOUT_MS = 12000;
const MAX_MANGAS = 40;
const CACHE_TTL = 300;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => reject(new Error('load_timeout')), ms);
		promise
			.then((v) => {
				clearTimeout(t);
				resolve(v);
			})
			.catch((e) => {
				clearTimeout(t);
				reject(e);
			});
	});
}

function normLang(lang?: string): string {
	const raw = String(lang || '')
		.trim()
		.toLowerCase();
	if (!raw || raw === 'all' || raw === 'any' || raw === '*') return '';
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
		portuguese: 'pt-br',
		russian: 'ru',
		vietnamese: 'vi',
		thai: 'th',
		arabic: 'ar',
		german: 'de',
		italian: 'it',
		polish: 'pl',
		turkish: 'tr'
	};
	return aliases[raw] || raw;
}

async function getCached<T>(
	key: string,
	fetcher: () => Promise<T>,
	ttlSeconds = CACHE_TTL
): Promise<T> {
	// @ts-ignore - caches hanya ada di Cloudflare runtime
	const cache = typeof caches !== 'undefined' ? caches.default : null;

	if (!cache) {
		return await fetcher();
	}

	const cacheKey = new Request(`https://cache.internal/${key}`);

	const cached = await cache.match(cacheKey);
	if (cached) {
		try {
			return (await cached.json()) as T;
		} catch {
		}
	}

	const data = await fetcher();

	const response = new Response(JSON.stringify(data), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': `public, max-age=${ttlSeconds}`
		}
	});

	cache.put(cacheKey, response).catch(console.error);

	return data;
}

export const load: PageServerLoad = async ({ url, setHeaders, depends }) => {
	const sourceParam = url.searchParams.get('source');
	const sourceId = sourceParam; // biarkan null kalau belum ada
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const query = (url.searchParams.get('q') || '').trim();
	const lang = (url.searchParams.get('lang') || 'all').toLowerCase();
	const type = (url.searchParams.get('type') || 'all').toLowerCase();

	const sources = getAllSources().map((s) => ({ id: s.id, name: s.name }));
	let mangas: any[] = [];

	if (sourceId) {
		depends(`browse:${sourceId}`);

		const cacheKey = `browse:${sourceId}:p${pageNum}:q=${encodeURIComponent(query)}:lang=${lang}:type=${type}`;

		try {
			mangas = await getCached(cacheKey, async () => {
				const adapter = getSource(sourceId);

				const fetchPromise = query
					? adapter.searchManga(query, { page: pageNum, lang, type })
					: adapter.getLatestManga(pageNum, { lang, type });

				const result = await withTimeout(fetchPromise, LOAD_TIMEOUT_MS);
				let list = Array.isArray(result) ? result : [];

				return list.slice(0, MAX_MANGAS);
			});
		} catch (e) {
			console.error('[Browse] load failed:', e);
			mangas = [];
		}
	}

	setHeaders({
		'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
	});

	return {
		mangas,
		sources,
		currentSource: sourceId,
		currentPage: pageNum,
		searchQuery: query,
		selectedLang: lang,
		selectedType: type,
		needsSource: !sourceId
	};
};
