import { getAllSources, getSource } from '$lib/server/sources';
import { parsePreferredFromCookie } from '$lib/stores/preferredSources';
import { parseUpdatedAt, syntheticUpdatedAt } from '$lib/server/parseUpdatedAt';
import { getCached } from '$lib/server/cache';
import type { PageServerLoad } from './$types';
import type { Manga } from '$lib/server/sources/types';

const LOAD_TIMEOUT_MS = 4000;
const MAX_MANGAS = 40;
const PER_SOURCE_LIMIT = 8;
const MAX_PREFERRED = 3;
const LIST_CACHE_TTL = 60 * 15;

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

function ensureUpdatedAt(m: Manga, page: number, index: number): Manga {
	const fromField = parseUpdatedAt(m.updatedAt);
	if (fromField > 0) return { ...m, updatedAt: fromField };

	const any = m as Manga & { date?: string; updated?: string; upload_date?: number };
	const fromAlt =
		parseUpdatedAt(any.date) ||
		parseUpdatedAt(any.updated) ||
		parseUpdatedAt(any.upload_date);

	if (fromAlt > 0) return { ...m, updatedAt: fromAlt };

	return { ...m, updatedAt: syntheticUpdatedAt(page, index) };
}

function mergeByTime(lists: Manga[][], preferredOrder: string[]): Manga[] {
	const orderMap = new Map(preferredOrder.map((id, i) => [id, i]));

	const flat = lists.flat();
	flat.sort((a, b) => {
		const ta = a.updatedAt || 0;
		const tb = b.updatedAt || 0;
		if (tb !== ta) return tb - ta;
		const oa = orderMap.get(a.sourceId) ?? 999;
		const ob = orderMap.get(b.sourceId) ?? 999;
		return oa - ob;
	});
	return flat;
}

async function fetchSourceList(
	id: string,
	pageNum: number,
	query: string,
	lang: string,
	type: string
): Promise<Manga[]> {
	try {
		const adapter = getSource(id);
		const result = await withTimeout(
			query
				? adapter.searchManga(query, { page: pageNum, lang, type })
				: adapter.getLatestManga(pageNum, { lang, type }),
			LOAD_TIMEOUT_MS
		);
		const list = Array.isArray(result) ? result : [];
		return list.slice(0, PER_SOURCE_LIMIT).map((m, index) =>
			ensureUpdatedAt({ ...m, sourceId: m.sourceId || id }, pageNum, index)
		);
	} catch (e) {
		console.error(`[Browse multi] ${id} failed:`, e);
		return [];
	}
}

export const load: PageServerLoad = async ({ url, request, setHeaders, depends, locals }) => {
	const sourceParam = url.searchParams.get('source');
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const query = (url.searchParams.get('q') || '').trim();
	const lang = (url.searchParams.get('lang') || 'all').toLowerCase();
	const type = (url.searchParams.get('type') || 'all').toLowerCase();

	const sources = getAllSources().map((s) => ({ id: s.id, name: s.name }));
	let mangas: Manga[] = [];
	let currentSource: string | null = sourceParam;
	let isMulti = false;
	let preferredSources: string[] = [];

	// ── Multi mode ───────────────────────────────────────────────────────────
	if (!sourceParam) {
		preferredSources = parsePreferredFromCookie(request.headers.get('cookie'));
		const validIds = new Set(sources.map((s) => s.id));
		preferredSources = preferredSources
			.filter((id) => validIds.has(id))
			.slice(0, MAX_PREFERRED);

		isMulti = true;
		depends('browse:multi');

		if (preferredSources.length === 0) {
			mangas = [];
		} else {
			const cacheKey = `browse:multi:${preferredSources.join(',')}:p=${pageNum}:q=${query}:lang=${lang}:type=${type}`;

			mangas = await getCached(
				cacheKey,
				async () => {
					const lists: Manga[][] = [];

					for (const id of preferredSources) {
						const list = await fetchSourceList(id, pageNum, query, lang, type);
						lists.push(list);
					}

					return mergeByTime(lists, preferredSources).slice(0, MAX_MANGAS);
				},
				LIST_CACHE_TTL,
				locals.kv
			);
		}
	}
	// ── Single source mode ───────────────────────────────────────────────────
	else {
		depends(`browse:${sourceParam}`);

		const cacheKey = `browse:single:${sourceParam}:p=${pageNum}:q=${query}:lang=${lang}:type=${type}`;

		mangas = await getCached(
			cacheKey,
			async () => {
				try {
					const adapter = getSource(sourceParam);
					const result = await withTimeout(
						query
							? adapter.searchManga(query, { page: pageNum, lang, type })
							: adapter.getLatestManga(pageNum, { lang, type }),
						LOAD_TIMEOUT_MS
					);
					const list = Array.isArray(result) ? result : [];
					return list.slice(0, MAX_MANGAS).map((m, index) =>
						ensureUpdatedAt(
							{ ...m, sourceId: m.sourceId || sourceParam },
							pageNum,
							index
						)
					);
				} catch (e) {
					console.error('[Browse] load failed:', e);
					return [];
				}
			},
			LIST_CACHE_TTL,
			locals.kv
		);
	}

	setHeaders({
		'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
	});

	return {
		mangas,
		sources,
		currentSource,
		currentPage: pageNum,
		searchQuery: query,
		selectedLang: lang,
		selectedType: type,
		needsSource: false,
		isMulti,
		preferredSources
	};
};