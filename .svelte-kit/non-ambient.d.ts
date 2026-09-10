
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/proxy" | "/bookmark" | "/history" | "/manga" | "/manga/[source]" | "/manga/[source]/[...id]" | "/read" | "/read/[source]" | "/read/[source]/[...id]" | "/sources";
		RouteParams(): {
			"/manga/[source]": { source: string };
			"/manga/[source]/[...id]": { source: string; id: string };
			"/read/[source]": { source: string };
			"/read/[source]/[...id]": { source: string; id: string }
		};
		LayoutParams(): {
			"/": { source?: string; id?: string };
			"/api": Record<string, never>;
			"/api/proxy": Record<string, never>;
			"/bookmark": Record<string, never>;
			"/history": Record<string, never>;
			"/manga": { source?: string; id?: string };
			"/manga/[source]": { source: string; id?: string };
			"/manga/[source]/[...id]": { source: string; id: string };
			"/read": { source?: string; id?: string };
			"/read/[source]": { source: string; id?: string };
			"/read/[source]/[...id]": { source: string; id: string };
			"/sources": Record<string, never>
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/proxy" | "/api/proxy/" | "/bookmark" | "/bookmark/" | "/history" | "/history/" | "/manga" | "/manga/" | `/manga/${string}` & {} | `/manga/${string}/` & {} | `/manga/${string}/${string}` & {} | `/manga/${string}/${string}/` & {} | "/read" | "/read/" | `/read/${string}` & {} | `/read/${string}/` & {} | `/read/${string}/${string}` & {} | `/read/${string}/${string}/` & {} | "/sources" | "/sources/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/assetsignore.txt" | "/robots.txt" | string & {};
	}
}