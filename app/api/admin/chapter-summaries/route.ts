import { revalidatePath } from "next/cache";
import { firebaseConfig } from "../../../../lib/firebase-config";
import { CacheKeys, kvSet } from "../../../../lib/kv-cache";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type ChapterSummary = {
  id?: string;
  chapterId?: string;
  num: string | number;
  title?: string;
  url?: string;
  slug?: string;
  date?: string;
  thumbnail?: string;
  source?: "blogger" | "blogger2" | "firestore";
  order?: number;
};

const ADMIN_EMAILS = new Set(["mikorokuscan@gmail.com", "moemaomao@gmail.com"]);

async function isAdminToken(token: string): Promise<boolean> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    },
  );
  if (!response.ok) return false;
  const result = await response.json() as { users?: Array<{ email?: string }> };
  return Boolean(result.users?.some((user) =>
    ADMIN_EMAILS.has((user.email || "").toLowerCase()),
  ));
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isChapterUrl(value: unknown): value is string {
  return isHttpUrl(value) ||
    (typeof value === "string" &&
      /^\/(?:manga|novel)\/[^/?#]+\/[^/?#]+$/.test(value));
}

function parseSummaries(value: unknown): ChapterSummary[] | null {
  if (!Array.isArray(value) || value.length > 1000) return null;
  const summaries: ChapterSummary[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    if (
      (typeof record.num !== "string" && typeof record.num !== "number") ||
      !String(record.num).trim() ||
      (record.url != null && !isChapterUrl(record.url)) ||
      (record.thumbnail != null && record.thumbnail !== "" && !isHttpUrl(record.thumbnail)) ||
      (record.source != null &&
        record.source !== "blogger" &&
        record.source !== "blogger2" &&
        record.source !== "firestore")
    ) {
      return null;
    }
    summaries.push({
      id: typeof record.id === "string" ? record.id : undefined,
      chapterId: typeof record.chapterId === "string" ? record.chapterId : undefined,
      num: record.num,
      title: typeof record.title === "string" ? record.title : undefined,
      url: typeof record.url === "string" ? record.url : undefined,
      slug: typeof record.slug === "string" ? record.slug : undefined,
      date: typeof record.date === "string" ? record.date : undefined,
      thumbnail: typeof record.thumbnail === "string" ? record.thumbnail : undefined,
      source: record.source === "blogger" || record.source === "blogger2"
        ? record.source
        : "firestore",
      order: typeof record.order === "number" && Number.isFinite(record.order)
        ? record.order
        : summaries.length,
    });
  }
  return summaries;
}

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !(await isAdminToken(token))) {
    return Response.json({ error: "Admin authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON request body." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const slug = typeof record.slug === "string" ? record.slug.trim() : "";
  const chapters = parseSummaries(record.chapters);
  if (!/^[a-zA-Z0-9._-]{1,180}$/.test(slug) || !chapters) {
    return Response.json({ error: "Invalid manga slug or chapter summaries." }, { status: 400 });
  }

  try {
    await kvSet(CacheKeys.chapterSummary(slug), chapters, 60 * 60 * 24 * 30);
    revalidatePath(`/series/${encodeURIComponent(slug)}`);
    return Response.json({ ok: true, count: chapters.length });
  } catch (error) {
    console.error(`[api/admin/chapter-summaries] Failed for ${slug}.`, error);
    return Response.json({ error: "Could not update the chapter summary cache." }, { status: 500 });
  }
}
