<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import {
		ArrowLeft,
		ChevronLeft,
		ChevronRight,
		ChevronsUp,
		Download,
		Flag,
		Settings,
		CloudDownload
	} from 'lucide-svelte';
	import { saveReading } from '$lib/stores/history';

	const { data }: { data: PageData } = $props();
	let {
		pages,
		source,
		chapterId,
		mangaInfo,
		chapters,
		currentChapter,
		prevChapter,
		nextChapter
	} = $derived(data);

	let currentPageIndex = $state(0);
	let currentMode = $state<'webtoon' | 'page'>('webtoon');
	let showControls = $state(true);
	let lastScrollY = $state(0);

	let isMenuOpen = $state(false);
	let isReportOpen = $state(false);
	let showChapterList = $state(false);
	let dataSaver = $state(false);
	let imageQuality = $state(600);
	let imgEpoch = $state(0);

	let isDownloading = $state(false);
	let downloadBannerActive = $state(false);
	let downloadText = $state('Menyiapkan unduhan...');
	let downloadCount = $state('0/0');
	let downloadPercent = $state(0);

	let selectedReportType = $state('');
	let reportReason = $state('');
	const reportTags = [
		'Chapter Tidak Muncul',
		'Chapter Acak',
		'Chapter Double',
		'Typo',
		'Gambar Rusak',
		'Gambar Tidak Lengkap',
		'Urutan Salah',
		'Terjemahan Salah',
		'Lainnya'
	];

	function proxyImage(url: string, forDownload = false): string {
		if (!url) return '';
		let u = url.trim();
		if (u.startsWith('//')) u = `https:${u}`;
		else if (u.startsWith('/')) u = `https://weloma.net${u}`;

		let proxy = `/api/proxy?url=${encodeURIComponent(u)}&source=${source}`;
		if (forDownload) return proxy;

		if (dataSaver && !/ihlv1\.xyz/i.test(u)) {
			proxy += `&w=${imageQuality}`;
		}
		return proxy;
	}

	function handleScroll() {
		const y = window.scrollY;
		if (y > lastScrollY && y > 80) {
			showControls = false;
			isMenuOpen = false;
			showChapterList = false;
		} else {
			showControls = true;
		}
		lastScrollY = y;
	}

	function handleMouseMove() {
		showControls = true;
	}

	function prevPage() {
		if (currentPageIndex > 0) currentPageIndex--;
	}
	function nextPage() {
		if (currentPageIndex < pages.length - 1) currentPageIndex++;
	}

	function goToPage(index: number) {
		if (index < 0 || index >= pages.length) return;
		currentPageIndex = index;
		if (currentMode === 'webtoon') {
			const imgs = document.querySelectorAll('#reader img');
			imgs[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	function onPageSelect(e: Event) {
		const val = parseInt((e.target as HTMLSelectElement).value, 10);
		goToPage(val);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			isMenuOpen = false;
			showChapterList = false;
			isReportOpen = false;
		}
		if (currentMode === 'page') {
			if (e.key === 'ArrowLeft') prevPage();
			if (e.key === 'ArrowRight') nextPage();
		}
	}

	function toggleMode() {
		currentMode = currentMode === 'webtoon' ? 'page' : 'webtoon';
		localStorage.setItem('readerMode', currentMode);
		currentPageIndex = 0;
	}

	function toggleDataSaver() {
		dataSaver = !dataSaver;
		localStorage.setItem('dataSaver', String(dataSaver));
		imgEpoch++;
		currentPageIndex = 0;
		if (currentMode === 'webtoon') window.scrollTo(0, 0);
	}

	function updateQuality(e: Event) {
		imageQuality = parseInt((e.target as HTMLInputElement).value, 10);
		localStorage.setItem('imageQuality', String(imageQuality));
		if (dataSaver) {
			imgEpoch++;
			currentPageIndex = 0;
			if (currentMode === 'webtoon') window.scrollTo(0, 0);
		}
	}

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function goToChapter(target: unknown) {
		showChapterList = false;
		isMenuOpen = false;
		if (!target) return;
		let rawId =
			typeof target === 'object' && target !== null
				? (target as { id?: string; slug?: string }).id ||
					(target as { slug?: string }).slug
				: target;
		if (!rawId) return;
		const cleanId = String(rawId).replace(/^\/+/, '');
		currentPageIndex = 0;
		await goto(`/read/${source}/${cleanId}`);
		await invalidateAll();
		window.scrollTo(0, 0);
	}

	function goBack() {
		if (mangaInfo?.id) {
			goto(`/manga/${source}/${String(mangaInfo.id).replace(/^\/+/, '')}`);
		} else if (mangaInfo?.slug) {
			goto(`/manga/${source}/${mangaInfo.slug}`);
		} else {
			goto('/');
		}
	}

	function submitReport() {
		if (!selectedReportType) {
			alert('Pilih jenis laporan terlebih dahulu');
			return;
		}
		alert(`Laporan terkirim: ${selectedReportType}`);
		isReportOpen = false;
		selectedReportType = '';
		reportReason = '';
	}

	let jszipReady: Promise<any> | null = null;
	function loadJSZip(): Promise<any> {
		if ((window as any).JSZip) return Promise.resolve((window as any).JSZip);
		if (jszipReady) return jszipReady;
		jszipReady = new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
			s.onload = () => resolve((window as any).JSZip);
			s.onerror = () => reject(new Error('Gagal memuat JSZip'));
			document.head.appendChild(s);
		});
		return jszipReady;
	}

	async function handleDownload() {
		if (isDownloading || !pages?.length) return;
		isDownloading = true;
		downloadBannerActive = true;
		downloadPercent = 0;
		downloadCount = `0/${pages.length}`;
		downloadText = 'Memuat JSZip...';

		try {
			const JSZip = await loadJSZip();
			const zip = new JSZip();
			const folderName = (
				`${mangaInfo?.title || 'manga'}_${currentChapter?.title || chapterId}`
			)
				.replace(/[^\w\s.-]/g, '')
				.replace(/\s+/g, '_')
				.slice(0, 80);

			downloadText = 'Mengunduh gambar...';
			for (let i = 0; i < pages.length; i++) {
				try {
					const res = await fetch(proxyImage(pages[i], true));
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					const blob = await res.blob();
					const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
					zip.file(`${folderName}/${String(i + 1).padStart(3, '0')}.${ext}`, blob);
				} catch (err) {
					console.warn('Gagal unduh page', i + 1, err);
				}
				downloadPercent = Math.round(((i + 1) / pages.length) * 100);
				downloadCount = `${i + 1}/${pages.length}`;
				downloadText = `Mengunduh gambar ${i + 1} dari ${pages.length}...`;
			}

			downloadText = 'Membuat file ZIP...';
			const content = await zip.generateAsync({ type: 'blob' });
			const a = document.createElement('a');
			a.href = URL.createObjectURL(content);
			a.download = `${folderName}.zip`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(a.href);
			downloadText = 'Selesai!';
			downloadPercent = 100;
		} catch (err: any) {
			downloadText = 'Gagal: ' + (err?.message || 'unknown');
		}

		setTimeout(() => {
			downloadBannerActive = false;
			isDownloading = false;
		}, 1500);
	}

	onMount(() => {
		const savedMode = localStorage.getItem('readerMode');
		if (savedMode === 'page' || savedMode === 'webtoon') currentMode = savedMode;
		dataSaver = localStorage.getItem('dataSaver') === 'true';
		imageQuality = parseInt(localStorage.getItem('imageQuality') || '600', 10);

		if (mangaInfo?.id) {
			saveReading({
				mangaId: mangaInfo.id,
				mangaSlug: mangaInfo.slug || '',
				mangaTitle: mangaInfo.title || '',
				cover: mangaInfo.cover || '',
				chapterId: chapterId,
				chapterTitle: currentChapter?.title || `Chapter ${currentChapter?.number || 0}`,
				chapterNumber: currentChapter?.number || 0,
				sourceId: source
			});
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} onscroll={handleScroll} />

<svelte:head>
	<title
		>{mangaInfo?.title || 'Reader'} - {currentChapter?.title || 'Chapter'} | Mikoroku</title
	>
</svelte:head>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative flex min-h-screen flex-col bg-black font-['Kodchasan',sans-serif] text-zinc-100"
	onmousemove={handleMouseMove}
>
	<!-- Title bar (reader.html style) -->
	<div class="relative z-10 px-4 py-3 text-center">
		<p class="m-0 text-[1.02em] font-medium text-zinc-200 opacity-85">
			{#if mangaInfo?.title}{mangaInfo.title}{/if}
			{#if currentChapter?.title}
				{' '}{currentChapter.title}
			{:else}
				Loading chapter...
			{/if}
		</p>
	</div>

	<!-- Download banner -->
	{#if downloadBannerActive}
		<div class="sticky top-0 z-[90] mx-auto mb-1.5 w-full max-w-[900px] px-3">
			<div
				class="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-black/50 px-3 py-2 backdrop-blur-md"
			>
				<div class="text-emerald-400 {isDownloading ? 'animate-spin' : ''}">
					<CloudDownload class="h-4 w-4" />
				</div>
				<div class="min-w-0 flex-1">
					<p class="mb-1 truncate text-[0.76rem] font-medium text-zinc-200">{downloadText}</p>
					<div class="h-1 w-full overflow-hidden rounded-full bg-white/10">
						<div
							class="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all"
							style="width: {downloadPercent}%"
						></div>
					</div>
				</div>
				<span class="min-w-[40px] text-right text-[0.72rem] font-semibold text-zinc-400"
					>{downloadCount}</span
				>
			</div>
		</div>
	{/if}

	<!-- Reader -->
	<main id="reader" class="mx-auto w-full max-w-[900px] flex-1 pb-20">
		{#if !pages?.length}
			<div class="py-16 text-center text-zinc-500">Gambar tidak tersedia</div>
		{:else if currentMode === 'webtoon'}
			{#each pages as pageUrl, i (imgEpoch + '-' + i)}
				<div class="w-full leading-none">
					<img
						src={proxyImage(pageUrl)}
						alt="Page {i + 1}"
						class="block w-full"
						loading={i < 4 ? 'eager' : 'lazy'}
						decoding="async"
						referrerpolicy="no-referrer"
					/>
				</div>
			{/each}
		{:else}
			<div class="flex h-[calc(100vh-140px)] w-full items-center justify-center">
				{#key imgEpoch + '-' + currentPageIndex}
					<img
						src={proxyImage(pages[currentPageIndex])}
						alt="Page {currentPageIndex + 1}"
						class="max-h-full max-w-full object-contain"
						referrerpolicy="no-referrer"
					/>
				{/key}
			</div>
			<!-- Page arrows (page mode) -->
			<button
				onclick={prevPage}
				disabled={currentPageIndex === 0}
				class="fixed top-1/2 left-2 z-[200] -translate-y-1/2 border-0 bg-transparent text-[34px] text-white/80 disabled:opacity-20"
				style="display: {currentMode === 'page' ? 'block' : 'none'}"
			>
				‹
			</button>
			<button
				onclick={nextPage}
				disabled={currentPageIndex >= pages.length - 1}
				class="fixed top-1/2 right-2 z-[200] -translate-y-1/2 border-0 bg-transparent text-[34px] text-white/80 disabled:opacity-20"
				style="display: {currentMode === 'page' ? 'block' : 'none'}"
			>
				›
			</button>
		{/if}
	</main>

	<!-- Bottom nav: << >>  (reader.html style) -->
	<div
		class="fixed right-0 bottom-0 left-0 z-[100] flex justify-center gap-[18px] border-t border-white/5 px-5 py-3 transition-opacity duration-300 {showControls
			? 'opacity-100'
			: 'pointer-events-none opacity-0'}"
	>
		<button
	onclick={() => prevChapter && goToChapter(prevChapter)}
	disabled={!prevChapter}
	aria-label="Chapter sebelumnya"
	title="Chapter sebelumnya"
	class="flex min-w-[90px] items-center justify-center gap-1 rounded-[15px] border border-white/15 bg-red-600/50 px-[15px] py-[5px] text-[0.92em] text-white/85 backdrop-blur-md transition hover:bg-red-600/70 disabled:cursor-not-allowed disabled:opacity-30"
>
	<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
		<path d="M13 5l-7 7 7 7" />
		<path d="M19 5l-7 7 7 7" opacity="0.6" />
	</svg>
</button>

<button
	onclick={() => nextChapter && goToChapter(nextChapter)}
	disabled={!nextChapter}
	aria-label="Chapter selanjutnya"
	title="Chapter selanjutnya"
	class="flex min-w-[90px] items-center justify-center gap-1 rounded-[15px] border border-white/15 bg-red-600/50 px-[15px] py-[5px] text-[0.92em] text-white/85 backdrop-blur-md transition hover:bg-red-600/70 disabled:cursor-not-allowed disabled:opacity-30"
>
	<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
		<path d="M11 5l7 7-7 7" />
		<path d="M5 5l7 7-7 7" opacity="0.6" />
	</svg>
</button>
	</div>

	<!-- ========== Settings overlay (kanan bawah) — urutan sama SS ========== -->
	<div
		class="fixed right-[15px] bottom-[78px] z-[300] flex flex-col items-center gap-2.5"
	>
		<!-- Scroll top -->
		<button
			onclick={scrollToTop}
			class="flex h-10 w-10 items-center justify-center rounded-full border-0 bg-[rgba(0,150,255,0.15)] text-[18px] text-[#4da6ff] backdrop-blur-md transition hover:scale-108 hover:bg-[rgba(0,150,255,0.25)]"
			title="Ke atas"
		>
			<ChevronsUp class="h-5 w-5" />
		</button>

		<!-- Download -->
		<button
			onclick={handleDownload}
			disabled={isDownloading || !pages?.length}
			class="flex h-10 w-10 items-center justify-center rounded-full border-0 bg-[rgba(0,200,120,0.15)] text-[18px] text-[#35d98a] backdrop-blur-md transition hover:scale-108 hover:bg-[rgba(0,200,120,0.25)] disabled:opacity-50"
			title="Download ZIP"
		>
			<Download class="h-5 w-5" />
		</button>

		<!-- Report -->
		<button
			onclick={() => (isReportOpen = true)}
			class="flex h-10 w-10 items-center justify-center rounded-full border-0 bg-[rgba(255,0,0,0.15)] text-[18px] text-[#ff4444] backdrop-blur-md transition hover:scale-108 hover:bg-[rgba(255,0,0,0.25)]"
			title="Lapor"
		>
			<Flag class="h-5 w-5" />
		</button>

		<!-- Gear + dropdown -->
		<div class="relative">
			<button
				onclick={() => {
					isMenuOpen = !isMenuOpen;
					if (!isMenuOpen) showChapterList = false;
				}}
				class="flex h-[42px] w-[42px] items-center justify-center rounded-full border-0 bg-transparent text-[21px] text-red-500 transition hover:rotate-90"
				title="Settings"
			>
				<Settings class="h-6 w-6" strokeWidth={2} />
			</button>

			{#if isMenuOpen}
				<!-- Menu: urutan persis reader.html / SS -->
				<div
					class="absolute right-0 bottom-[52px] z-[310] flex max-h-[65vh] w-[210px] flex-col gap-2 overflow-y-auto rounded-xl bg-black/80 px-3.5 py-3 shadow-[0_6px_25px_rgba(0,0,0,0.75)]"
				>
					<!-- 1. Mode -->
					<button
						onclick={toggleMode}
						class="w-full rounded-lg border-0 bg-red-800 px-3 py-2.5 text-left text-[0.87em] font-medium text-white transition hover:bg-red-700"
					>
						Mode: {currentMode === 'webtoon' ? 'Webtoon' : 'Page'}
					</button>

					<!-- 2. Page select -->
					<select
						class="w-full cursor-pointer rounded-lg border-0 bg-red-800 px-3 py-2.5 text-[0.87em] text-white outline-none"
						value={currentPageIndex}
						onchange={onPageSelect}
					>
						{#each pages as _, i}
							<option value={i} class="bg-zinc-900 text-white">
								Page {i + 1} / {pages.length}
							</option>
						{/each}
					</select>

					<!-- 3. Chapter List toggle -->
					<button
						onclick={() => (showChapterList = !showChapterList)}
						class="w-full rounded-lg border-0 bg-red-800 px-3 py-2.5 text-left text-[0.87em] font-medium text-white transition hover:bg-red-700"
					>
						Chapter List
					</button>

					<!-- 4. Chapter list (expand) -->
					{#if showChapterList}
						<div
							class="max-h-[280px] overflow-y-auto rounded-lg bg-[rgba(25,25,25,0.8)] py-1"
						>
							{#each chapters as chapter}
								<button
									onclick={() => goToChapter(chapter)}
									class="w-full border-b border-zinc-600/80 px-3 py-2 text-left text-[0.84em] text-white transition last:border-b-0 hover:bg-white/10 {chapter.id ===
										chapterId || chapter.id === currentChapter?.id
										? 'bg-red-500/25 font-medium'
										: ''}"
								>
									{chapter.title}
								</button>
							{/each}
							{#if !chapters?.length}
								<p class="px-3 py-2 text-center text-[0.84em] text-zinc-500">Kosong</p>
							{/if}
						</div>
					{/if}

					<!-- 5. Data Saver -->
					<div class="flex items-center justify-between px-0.5 py-1 text-[0.87em] text-white">
						<span>Data Saver</span>
						<input
							type="checkbox"
							checked={dataSaver}
							onchange={toggleDataSaver}
							class="h-4 w-4 cursor-pointer accent-red-600"
						/>
					</div>

					<!-- 6. Quality (saat data saver on) -->
					{#if dataSaver}
	<div class="flex flex-col gap-1.5 text-white">
		<label for="image-quality" class="text-[0.8em]">
			Quality: <span class="font-semibold text-emerald-400">{imageQuality}</span>px
		</label>
		<input
			id="image-quality"
			type="range"
			min="600"
			max="1200"
			step="100"
			value={imageQuality}
			oninput={updateQuality}
			class="w-full cursor-pointer accent-red-600"
		/>
	                 </div>
                   {/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Back (pojok kiri atas, minimal) -->
	<button
		onclick={goBack}
		class="fixed top-3 left-3 z-[200] flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs text-zinc-300 backdrop-blur-md transition hover:bg-black/70"
	>
		<ArrowLeft class="h-3.5 w-3.5" />
		<span class="hidden sm:inline">Back</span>
	</button>

	<!-- Report modal -->
	{#if isReportOpen}
		<div
			class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-5 backdrop-blur-md"
		>
			<div
				class="w-full max-w-[450px] rounded-3xl border border-white/10 bg-[rgba(20,20,20,0.95)] p-[22px] shadow-2xl"
			>
				<h3 class="m-0 text-[1.15rem] text-white">Laporkan Chapter</h3>
				<p class="mt-1.5 mb-4 text-[0.9rem] text-zinc-400">
					Bantu kami memperbaiki masalah chapter ini.
				</p>
				<div class="mb-4 flex flex-wrap gap-2">
					{#each reportTags as tag}
						<button
							onclick={() => (selectedReportType = tag)}
							class="cursor-pointer rounded-full border-0 px-3.5 py-2 text-[0.82rem] transition {selectedReportType ===
							tag
								? 'bg-red-600 text-white'
								: 'bg-white/5 text-zinc-300 hover:bg-white/10'}"
						>
							{tag}
						</button>
					{/each}
				</div>
				<textarea
					bind:value={reportReason}
					placeholder="Detail (opsional)..."
					class="box-border h-[110px] w-full resize-none rounded-2xl border-0 bg-white/5 p-3.5 font-inherit text-white outline-none placeholder:text-zinc-500"
				></textarea>
				<div class="mt-4 flex gap-2.5">
					<button
						onclick={() => (isReportOpen = false)}
						class="h-[46px] flex-1 cursor-pointer rounded-[14px] border-0 bg-white/5 font-semibold text-zinc-300"
					>
						Batal
					</button>
					<button
						onclick={submitReport}
						class="h-[46px] flex-1 cursor-pointer rounded-[14px] border-0 bg-gradient-to-br from-red-600 to-red-900 font-semibold text-white"
					>
						Kirim
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
