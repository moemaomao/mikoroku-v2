/**
 * Source Registry - Central factory for all manga source adapters.
 *
 * To add a new source:
 * 1. Create a new adapter in ./impl/ that extends BaseSource
 * 2. Import and register it in the `sources` record below
 */

import { AsuraSource } from './impl/Asura';
import { WelomaSource } from './impl/weloma';
import { HitomiSource } from './impl/Hitomi';
import { NhentaiSource } from './impl/Nhentai';
import { HentaifoxSource } from './impl/Hentaifox';
import { PornhwaSource } from './impl/pornhwa';
import { KingcomixSource } from './impl/Kingkomix';
import { EhentaiSource } from './impl/Ehentai';
import { KlmangaSource } from './impl/klmanga';
import { KomikuSource } from './impl/komiku';
import { ImhentaiSource } from './impl/imhentai';
import { Hentai2readSource } from './impl/hentai2read';
import { HentaieraSource } from './impl/Hentaiera';
import { HentaireadSource } from './impl/Hentairead';
import { SimplyHentaiSource } from './impl/SImplyhentai';
import type { IMangaSource } from './types';

const sources: Record<string, IMangaSource> = {
    asura: new AsuraSource(),
    weloma: new WelomaSource(),
    hitomi: new HitomiSource(),
    nhentai: new NhentaiSource(),
    hentaifox: new HentaifoxSource(),
    pornhwa: new PornhwaSource(),
    kingcomix: new KingcomixSource(),
    ehentai: new EhentaiSource(),
    klmanga: new KlmangaSource(),
    komiku: new KomikuSource(),
    imhentai: new ImhentaiSource(),
    hentai2read: new Hentai2readSource(),
    hentaiera: new HentaieraSource(),
    hentairead: new HentaireadSource(),
    simplyhentai: new SimplyHentaiSource()
};

/**
 * Get a specific source adapter by ID.
 * @throws Error if source not found
 */
export function getSource(sourceId: string): IMangaSource {
    const source = sources[sourceId];
    if (!source) {
        throw new Error(
            `Source "${sourceId}" not found. Available sources: ${Object.keys(sources).join(', ')}`
        );
    }
    return source;
}

/**
 * Get all available source adapters.
 */
export function getAllSources(): IMangaSource[] {
    return Object.values(sources);
}

/**
 * Get source metadata for display.
 */
export function getSourceList(): Array<{ id: string; name: string }> {
    return Object.values(sources).map((s) => ({
        id: s.id,
        name: s.name
    }));
}