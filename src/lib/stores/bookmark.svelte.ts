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

export interface BookmarkEntry {
	mangaId: string;
	mangaSlug: string;
	mangaTitle: string;
	cover: string;
	sourceId: string;
	timestamp: number;
}

const STORAGE_KEY = 'mikoroku_bookmarks';
const MAX = 60;

let bookmarks = $state<BookmarkEntry[]>([]);

if (browser) {
	bookmarks = loadLocal();
	window.addEventListener('bookmarks-changed', () => {
		bookmarks = loadLocal();
	});
}

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

function lightEntry(entry: BookmarkEntry): BookmarkEntry {
	return {
		mangaId: entry.mangaId,
		mangaSlug: entry.mangaSlug || '',
		mangaTitle: (entry.mangaTitle || '').slice(0, 120),
		cover: lightCover(entry.cover),
		sourceId: entry.sourceId,
		timestamp: entry.timestamp
	};
}

function loadLocal(): BookmarkEntry[] {
	if (!browser) return [];
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		if (!data) return [];
		const parsed = JSON.parse(data) as BookmarkEntry[];
		return parsed.map(lightEntry);
	} catch {
		return [];
	}
}

function saveLocal(list: BookmarkEntry[]) {
	if (!browser) return;
	const light = list.slice(0, MAX).map(lightEntry);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
	window.dispatchEvent(new CustomEvent('bookmarks-changed'));
}

export function getBookmarks(): BookmarkEntry[] {
	return bookmarks;
}

export function isBookmarked(mangaId: string, sourceId?: string): boolean {
	return bookmarks.some(
		(b) => b.mangaId === mangaId && (!sourceId || b.sourceId === sourceId)
	);
}

export async function addBookmark(entry: Omit<BookmarkEntry, 'timestamp'>) {
	if (!browser) return;

	const full: BookmarkEntry = lightEntry({
		...entry,
		timestamp: Date.now()
	});

	const list = loadLocal().filter((b) => b.mangaId !== entry.mangaId);
	list.unshift(full);
	saveLocal(list);

	const user = getUser();
	if (user && db) {
		try {
			await setDoc(doc(db, 'users', user.uid, 'bookmarks', entry.mangaId), full);
		} catch (e) {
			console.error('Failed to sync bookmark to cloud', e);
		}
	}
}

export async function removeBookmark(mangaId: string) {
	if (!browser) return;

	const list = loadLocal().filter((b) => b.mangaId !== mangaId);
	saveLocal(list);

	const user = getUser();
	if (user && db) {
		try {
			await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', mangaId));
		} catch (e) {
			console.error('Failed to remove bookmark from cloud', e);
		}
	}
}

export async function toggleBookmark(entry: Omit<BookmarkEntry, 'timestamp'>): Promise<boolean> {
	if (isBookmarked(entry.mangaId, entry.sourceId)) {
		await removeBookmark(entry.mangaId);
		return false;
	}
	await addBookmark(entry);
	return true;
}

export function clearBookmarks() {
	if (!browser) return;
	localStorage.removeItem(STORAGE_KEY);
	window.dispatchEvent(new CustomEvent('bookmarks-changed'));
}

export async function syncBookmarksOnLogin() {
	if (!browser || !db) return;

	const user = getUser();
	if (!user) return;

	const firestore = db;

	try {
		const local = loadLocal();
		const snap = await getDocs(collection(firestore, 'users', user.uid, 'bookmarks'));
		const cloud: BookmarkEntry[] = [];
		snap.forEach((d) => cloud.push(d.data() as BookmarkEntry));

		const map = new Map<string, BookmarkEntry>();
		[...cloud, ...local].forEach((b) => {
			const light = lightEntry(b);
			const existing = map.get(light.mangaId);
			if (!existing || light.timestamp > existing.timestamp) {
				map.set(light.mangaId, light);
			}
		});

		const merged = Array.from(map.values())
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, MAX);

		saveLocal(merged);

		const batch = writeBatch(firestore);
		merged.forEach((b) => {
			batch.set(doc(firestore, 'users', user.uid, 'bookmarks', b.mangaId), b);
		});
		await batch.commit();
	} catch (e) {
		console.error('Failed to sync bookmarks on login', e);
	}
}