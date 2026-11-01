import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "../../../lib/kv-cache";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const cacheKey = "leaderboard:top-comments:v1";
const cacheTtlSeconds = 2 * 60 * 60;

type LeaderboardUser = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
  commentCount: number;
  hidden: false;
};

type LeaderboardPayload = {
  users: LeaderboardUser[];
  updatedAt: number;
};

function isUser(value: unknown): value is LeaderboardUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<LeaderboardUser>;
  return typeof user.uid === "string" &&
    typeof user.name === "string" &&
    typeof user.username === "string" &&
    typeof user.avatar === "string" &&
    typeof user.commentCount === "number" &&
    user.hidden === false;
}

function parsePayload(value: unknown): LeaderboardPayload | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Partial<LeaderboardPayload>;
  if (typeof payload.updatedAt !== "number" || !Array.isArray(payload.users)) return null;
  const users = payload.users.filter(isUser);
  return users.length ? { users, updatedAt: payload.updatedAt } : null;
}

export async function GET() {
  const cached = parsePayload(await kvGet<unknown>(cacheKey));
  if (!cached) return NextResponse.json({ users: [], cached: false }, { status: 404 });

  return NextResponse.json(cached, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Cache": "HIT",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = parsePayload(await request.json());
    if (!payload) {
      return NextResponse.json({ error: "Invalid leaderboard payload." }, { status: 400 });
    }

    await kvSet(cacheKey, { ...payload, updatedAt: Date.now() }, cacheTtlSeconds);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("[api/leaderboard] Cache write failed.", error);
    return NextResponse.json({ error: "Failed to cache leaderboard." }, { status: 500 });
  }
}
