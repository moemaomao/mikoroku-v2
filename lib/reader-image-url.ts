export function originalReaderImageUrl(url: string): string {
  try {
    const imageUrl = new URL(url);
    if (!/(^|\.)googleusercontent\.com$/i.test(imageUrl.hostname)) return url;

    imageUrl.pathname = imageUrl.pathname
      .replace(/\/s\d+(?:-c)?\//i, "/s0/")
      .replace(/\/w\d+-h\d+(?:-[a-z0-9-]+)?\//i, "/s0/");
    imageUrl.href = imageUrl.href
      .replace(/=s\d+(?:-c)?(?:-[a-z0-9-]+)?(?=$|[?#])/i, "=s0")
      .replace(/=w\d+-h\d+(?:-[a-z0-9-]+)?(?=$|[&#])/i, "=s0");
    return imageUrl.href;
  } catch {
    return url;
  }
}

export function readerImageUrlWithQuality(url: string, quality: number): string {
  try {
    const originalUrl = originalReaderImageUrl(url);
    if (!/(^|\.)googleusercontent\.com$/i.test(new URL(originalUrl).hostname)) {
      return originalUrl;
    }
    return originalUrl
      .replace(/\/s\d+(?:-c)?\//i, `/s${quality}/`)
      .replace(/\/w\d+-h\d+(?:-[a-z0-9-]+)?\//i, `/s${quality}/`)
      .replace(/=s\d+(?:-c)?(?:-[a-z0-9-]+)?(?=$|[?#])/i, `=s${quality}`)
      .replace(/=w\d+-h\d+(?:-[a-z0-9-]+)?(?=$|[&#])/i, `=s${quality}`);
  } catch {
    return url;
  }
}
