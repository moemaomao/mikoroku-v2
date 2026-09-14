/**
 * Home Page - Server Load
 * Support single source (?source=) atau multi preferred sources (dari cookie)
 */

import { getAllSources, getSource } from '$lib/server/sources';
import { parsePreferredFromCookie } from '$lib/stores/preferredSources';
import type { PageServerLoad } from './$types';
import type { Manga } from '$lib/server/sources/types';

const LOAD_TIMEOUT_MS = 10000;
const MAX_MANGAS = 48;
const PER_SOURCE_LIMIT = 12; // ambil top N per source biar seimbang

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
	const raw = String(lang || '').trim().toLowerCase();
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

/** Interleave results from multiple sources (round-robin) supaya terasa "realtime newest" */
function interleaveManga(lists: Manga[][]): Manga[] {
	const result: Manga[] = [];
	const maxLen = Math.max(0, ...lists.map((l) => l.length));
	for (let i = 0; i < maxLen; i++) {
		for (const list of lists) {
			if (list[i]) result.push(list[i]);
		}
	}
	return result;
}

export const load: PageServerLoad = async ({ url, request, setHeaders, depends }) => {
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

	// ── Multi mode (tidak ada ?source=) ──────────────────────────────────────
	if (!sourceParam) {
		preferredSources = parsePreferredFromCookie(request.headers.get('cookie'));
		const validIds = new Set(sources.map((s) => s.id));
		preferredSources = preferredSources.filter((id) => validIds.has(id));

		if (preferredSources.length === 0) {
			preferredSources = ['asura']; // fallback
		}

		isMulti = true;
		depends('browse:multi');

		try {
			const fetchPromises = preferredSources.map(async (id) => {
				try {
					const adapter = getSource(id);
					const result = await withTimeout(
						query
							? adapter.searchManga(query, { page: pageNum, lang, type })
							: adapter.getLatestManga(pageNum, { lang, type }),
						LOAD_TIMEOUT_MS
					);
					const list = Array.isArray(result) ? result : [];
					return list.slice(0, PER_SOURCE_LIMIT).map((m) => ({
						...m,
						sourceId: m.sourceId || id
					}));
				} catch (e) {
					console.error(`[Browse multi] ${id} failed:`, e);
					return [] as Manga[];
				}
			});

			const lists = await Promise.all(fetchPromises);
			mangas = interleaveManga(lists).slice(0, MAX_MANGAS);
		} catch (e) {
			console.error('[Browse multi] load failed:', e);
			mangas = [];
		}
	}
	// ── Single source mode ───────────────────────────────────────────────────
	else {
		depends(`browse:${sourceParam}`);
		try {
			const adapter = getSource(sourceParam);
			const result = await withTimeout(
				query
					? adapter.searchManga(query, { page: pageNum, lang, type })
					: adapter.getLatestManga(pageNum, { lang, type }),
				LOAD_TIMEOUT_MS
			);
			const list = Array.isArray(result) ? result : [];
			mangas = list.slice(0, MAX_MANGAS).map((m) => ({
				...m,
				sourceId: m.sourceId || sourceParam
			}));
		} catch (e) {
			console.error('[Browse] load failed:', e);
			mangas = [];
		}
	}

	setHeaders({
		'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
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