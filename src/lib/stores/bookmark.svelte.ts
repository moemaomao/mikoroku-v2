import { browser } from '$app/environment';

export interface BookmarkEntry {
	mangaId: string;
	mangaSlug: string;
	mangaTitle: string;
	cover: string;
	sourceId: string;
	timestamp: number;
}

const STORAGE_KEY = 'mikoroku_bookmarks';
const MAX = 100;

// Reaktif state menggunakan Runes Svelte 5
let bookmarks = $state<BookmarkEntry[]>([]);

if (browser) {
	// Sync data awal saat aplikasi dimuat
	bookmarks = loadBookmarks();

	// Dengarkan event perubahan bookmark
	window.addEventListener('bookmarks-changed', () => {
		bookmarks = loadBookmarks();
	});
}

function loadBookmarks(): BookmarkEntry[] {
	if (!browser) return [];
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		return data ? JSON.parse(data) : [];
	} catch {
		return [];
	}
}

export function getBookmarks(): BookmarkEntry[] {
	return bookmarks;
}

export function isBookmarked(mangaId: string, sourceId?: string): boolean {
	return bookmarks.some(
		(b) => b.mangaId === mangaId && (!sourceId || b.sourceId === sourceId)
	);
}

export function addBookmark(entry: Omit<BookmarkEntry, 'timestamp'>): void {
	if (!browser) return;
	try {
		const list = loadBookmarks().filter((b) => b.mangaId !== entry.mangaId);
		list.unshift({ ...entry, timestamp: Date.now() });
		localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX)));
		window.dispatchEvent(new CustomEvent('bookmarks-changed'));
	} catch {
		/* silent */
	}
}

export function removeBookmark(mangaId: string): void {
	if (!browser) return;
	const list = loadBookmarks().filter((b) => b.mangaId !== mangaId);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
	window.dispatchEvent(new CustomEvent('bookmarks-changed'));
}

export function toggleBookmark(entry: Omit<BookmarkEntry, 'timestamp'>): boolean {
	if (isBookmarked(entry.mangaId, entry.sourceId)) {
		removeBookmark(entry.mangaId);
		return false;
	}
	addBookmark(entry);
	return true;
}

export function clearBookmarks(): void {
	if (!browser) return;
	localStorage.removeItem(STORAGE_KEY);
	window.dispatchEvent(new CustomEvent('bookmarks-changed'));
}
