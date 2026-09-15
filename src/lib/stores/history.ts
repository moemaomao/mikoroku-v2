import { browser } from '$app/environment';
import {
	collection,
	doc,
	setDoc,
	deleteDoc,
	getDocs,
	writeBatch
} from 'firebase/firestore';
import { db } from '$lib/firebase';
import { getUser } from '$lib/stores/auth.svelte';

export interface ReadingEntry {
	mangaId: string;
	mangaSlug: string;
	mangaTitle: string;
	cover: string;
	chapterId: string;
	chapterTitle: string;
	chapterNumber: number;
	sourceId: string;
	timestamp: number;
}

const STORAGE_KEY = 'mikoroku_history';
const MAX_HISTORY = 30;

function lightCover(url: string | undefined | null): string {
	if (!url) return '';
	let u = String(url).trim();
	if (!u) return '';
	if (u.startsWith('//')) u = 'https:' + u;

	const keepQuery =
		/cvr\.voratoon\.id|X-Amz-Signature|X-Amz-Algorithm/i.test(u);

	try {
		const parsed = new URL(u);
		if (!keepQuery) {
			parsed.search = '';
			parsed.hash = '';
		}
		u = parsed.toString();
	} catch {
		// ignore
	}

	const max = keepQuery ? 600 : 180;
	return u.length > max ? u.slice(0, max) : u;
}

function lightEntry(entry: ReadingEntry): ReadingEntry {
	return {
		mangaId: entry.mangaId,
		mangaSlug: entry.mangaSlug || '',
		mangaTitle: (entry.mangaTitle || '').slice(0, 120),
		cover: lightCover(entry.cover),
		chapterId: entry.chapterId,
		chapterTitle: (entry.chapterTitle || '').slice(0, 80),
		chapterNumber: entry.chapterNumber,
		sourceId: entry.sourceId,
		timestamp: entry.timestamp
	};
}

function loadLocal(): ReadingEntry[] {
	if (!browser) return [];
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		if (!data) return [];
		const parsed = JSON.parse(data) as ReadingEntry[];
		return parsed.map(lightEntry);
	} catch {
		return [];
	}
}

function saveLocal(list: ReadingEntry[]) {
	if (!browser) return;
	const light = list.slice(0, MAX_HISTORY).map(lightEntry);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
	window.dispatchEvent(new CustomEvent('history-changed'));
}

export function getHistory(): ReadingEntry[] {
	return loadLocal();
}

export async function saveReading(entry: Omit<ReadingEntry, 'timestamp'>) {
	if (!browser) return;

	const full: ReadingEntry = lightEntry({
		...entry,
		timestamp: Date.now()
	});

	const history = loadLocal().filter((h) => h.mangaId !== entry.mangaId);
	history.unshift(full);
	saveLocal(history);

	const user = getUser();
	if (user && db) {
		try {
			await setDoc(doc(db, 'users', user.uid, 'history', entry.mangaId), full);
		} catch (e) {
			console.error('Failed to sync history to cloud', e);
		}
	}
}

export function getLastRead(mangaId: string): ReadingEntry | null {
	return loadLocal().find((h) => h.mangaId === mangaId) || null;
}

export async function removeFromHistory(mangaId: string) {
	if (!browser) return;

	const filtered = loadLocal().filter((h) => h.mangaId !== mangaId);
	saveLocal(filtered);

	const user = getUser();
	if (user && db) {
		try {
			await deleteDoc(doc(db, 'users', user.uid, 'history', mangaId));
		} catch (e) {
			console.error('Failed to remove history from cloud', e);
		}
	}
}

export function clearHistory() {
	if (!browser) return;
	localStorage.removeItem(STORAGE_KEY);
	window.dispatchEvent(new CustomEvent('history-changed'));
}

export async function syncHistoryOnLogin() {
	if (!browser || !db) return;

	const user = getUser();
	if (!user) return;

	const firestore = db;

	try {
		const local = loadLocal();
		const snap = await getDocs(collection(firestore, 'users', user.uid, 'history'));
		const cloud: ReadingEntry[] = [];
		snap.forEach((d) => cloud.push(d.data() as ReadingEntry));

		const map = new Map<string, ReadingEntry>();
		[...cloud, ...local].forEach((h) => {
			const light = lightEntry(h);
			const existing = map.get(light.mangaId);
			if (!existing || light.timestamp > existing.timestamp) {
				map.set(light.mangaId, light);
			}
		});

		const merged = Array.from(map.values())
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, MAX_HISTORY);

		saveLocal(merged);

		const batch = writeBatch(firestore);
		merged.forEach((h) => {
			batch.set(doc(firestore, 'users', user.uid, 'history', h.mangaId), h);
		});
		await batch.commit();
	} catch (e) {
		console.error('Failed to sync history on login', e);
	}
}