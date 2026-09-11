/**
 * Image Proxy
 * - Non-Hitomi + non-ihlv1 + non-nhentai + non-hentairead + w → redirect weserv (0 CPU Worker)
 * - Hitomi / ihlv1 / nhentai / hentairead → fetch langsung (butuh referer yang benar)
 */

import type { RequestHandler } from './$types';

const USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 12000;

export const GET: RequestHandler = async ({ url }) => {
	const targetUrl = url.searchParams.get('url');
	const sourceId = url.searchParams.get('source') || '';
	const w = url.searchParams.get('w');
	const h = url.searchParams.get('h');

	if (!targetUrl) {
		return new Response('Missing URL parameter', { status: 400 });
	}

	try {
		let decodedUrl = decodeURIComponent(targetUrl);
		if (decodedUrl.startsWith('//')) decodedUrl = 'https:' + decodedUrl;

		const isHitomi = /hitomi\.la|gold-usergeneratedcontent\.net/i.test(decodedUrl);
		const isBlockedWeserv = /ihlv1\.xyz/i.test(decodedUrl);
		const isNhentai = /nhentai\.net/i.test(decodedUrl);
		const isHentairead =
			sourceId === 'hentairead' ||
			/hentairead\.com|hencover|henread/i.test(decodedUrl);

		// ===== Hemat CPU: redirect ke weserv =====
		if (
			w &&
			!isHitomi &&
			!isBlockedWeserv &&
			!isNhentai &&
			!isHentairead &&
			/^https?:\/\//i.test(decodedUrl)
		) {
			const weserv =
				'https://images.weserv.nl/?url=' +
				encodeURIComponent(decodedUrl) +
				`&w=${encodeURIComponent(w)}` +
				(h ? `&h=${encodeURIComponent(h)}&fit=cover` : '') +
				'&q=70&output=webp&n=-1';
			return Response.redirect(weserv, 302);
		}

		// ===== Tentukan Referer =====
		let referer = 'https://nhentai.net/';

		try {
			referer = new URL(decodedUrl).origin + '/';
		} catch {
			/* keep default */
		}

		if (sourceId === 'hitomi' || isHitomi) {
			referer = 'https://hitomi.la/';
		} else if (sourceId === 'asura') {
			referer = 'https://asuracomic.net/';
		} else if (sourceId === 'weloma') {
			referer = 'https://weloma.net/';
		} else if (sourceId === 'nhentai' || isNhentai) {
			referer = 'https://nhentai.net/';
		} else if (isHentairead) {
			referer = 'https://hentairead.com/';
		}

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		try {
			const imageResponse = await fetch(decodedUrl, {
				headers: {
					'User-Agent': USER_AGENT,
					Referer: referer,
					Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.9'
				},
				signal: controller.signal
			});

			if (!imageResponse.ok) {
				return new Response(`Failed to fetch image: ${imageResponse.status}`, {
					status: imageResponse.status
				});
			}

			const contentType =
				imageResponse.headers.get('content-type') || 'image/jpeg';

			return new Response(imageResponse.body, {
				headers: {
					'Content-Type': contentType,
					'Cache-Control': 'public, max-age=31536000, immutable',
					'Access-Control-Allow-Origin': '*'
				}
			});
		} finally {
			clearTimeout(timer);
		}
	} catch (error) {
		console.error('Proxy error:', error);
		return new Response('Failed to proxy image', { status: 500 });
	}
};
