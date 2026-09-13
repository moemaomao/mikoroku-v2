<script lang="ts">
	let { isDarkMode = true }: { isDarkMode?: boolean } = $props();
</script>

<footer
	class="border-t py-8 text-center
		{isDarkMode ? 'border-zinc-800/50 bg-zinc-950/50 text-zinc-400' : 'border-zinc-200 bg-white/50 text-zinc-600'}"
>
	<div class="mx-auto max-w-3xl space-y-4 px-4">
		<p class="text-sm leading-relaxed">
			<strong class="text-[var(--color-primary)]">Rokuyomu</strong> is a Manga Source Base designed to
			collect, organize, and provide manga data from multiple sources in one unified platform.
		</p>
		<p class="text-sm leading-relaxed">
			It serves as a central foundation for manga sources, allowing different manga websites and
			source adapters to be connected through a consistent system. Rokuyomu focuses on source
			management, manga metadata, chapter information, and scalable integration with various manga
			providers.
		</p>

		<div class="pt-2">
			<p class="text-base font-semibold {isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}">
				Rokuyomu — Manga Source Base
			</p>
			<p class="mt-1 text-xs {isDarkMode ? 'text-zinc-500' : 'text-zinc-500'}">
				A unified foundation for manga sources.
			</p>
		</div>
	</div>
</footer>