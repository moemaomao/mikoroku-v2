
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
		RouteId(): "/" | "/about" | "/api" | "/api/pages" | "/api/proxy" | "/bookmark" | "/history" | "/manga" | "/manga/[source]" | "/manga/[source]/[...id]" | "/privacy" | "/reader" | "/reader/[source]" | "/reader/[source]/[...id]" | "/report" | "/settings";
		RouteParams(): {
			"/manga/[source]": { source: string };
			"/manga/[source]/[...id]": { source: string; id: string };
			"/reader/[source]": { source: string };
			"/reader/[source]/[...id]": { source: string; id: string }
		};
		LayoutParams(): {
			"/": { source?: string; id?: string };
			"/about": Record<string, never>;
			"/api": Record<string, never>;
			"/api/pages": Record<string, never>;
			"/api/proxy": Record<string, never>;
			"/bookmark": Record<string, never>;
			"/history": Record<string, never>;
			"/manga": { source?: string; id?: string };
			"/manga/[source]": { source: string; id?: string };
			"/manga/[source]/[...id]": { source: string; id: string };
			"/privacy": Record<string, never>;
			"/reader": { source?: string; id?: string };
			"/reader/[source]": { source: string; id?: string };
			"/reader/[source]/[...id]": { source: string; id: string };
			"/report": Record<string, never>;
			"/settings": Record<string, never>
		};
		Pathname(): "/" | "/about" | "/about/" | "/api" | "/api/" | "/api/pages" | "/api/pages/" | "/api/proxy" | "/api/proxy/" | "/bookmark" | "/bookmark/" | "/history" | "/history/" | "/manga" | "/manga/" | `/manga/${string}` & {} | `/manga/${string}/` & {} | `/manga/${string}/${string}` & {} | `/manga/${string}/${string}/` & {} | "/privacy" | "/privacy/" | "/reader" | "/reader/" | `/reader/${string}` & {} | `/reader/${string}/` & {} | `/reader/${string}/${string}` & {} | `/reader/${string}/${string}/` & {} | "/report" | "/report/" | "/settings" | "/settings/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/assetsignore.txt" | "/robots.txt" | "/rokuyomu.png" | string & {};
	}
}