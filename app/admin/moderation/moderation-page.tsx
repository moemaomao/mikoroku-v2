"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  runTransaction,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { normalizeChapterNumber } from "../../../lib/chapter-number";

const firebaseConfig = {
  apiKey: "AIzaSyCxufJubuS95zQnvctINvzj-H8WSIgsse4",
  authDomain: "widget-comment.firebaseapp.com",
  projectId: "widget-comment",
  storageBucket: "widget-comment.firebasestorage.app",
  messagingSenderId: "249700505242",
  appId: "1:249700505242:web:dab240af09caf30ad7f123",
};

const emojiFirebaseConfig = {
  apiKey: "AIzaSyAwXK4q1t_0HVA-eZN22PIlKgJ3zYXIuAs",
  projectId: "emoji-reaction-fb044",
};

const MODERATOR_EMAILS = ["mikorokuscan@gmail.com", "moemaomao@gmail.com"];
const FIREBASE_APP_NAME = "mikoroku-comment-moderation";
const EMOJI_FIREBASE_APP_NAME = "mikoroku-emoji-moderation";

type ModeratorServices = { auth: Auth; firestore: Firestore };
type EmojiServices = { firestore: Firestore };
type RecordData = Record<string, unknown>;
type ReportRow = { id: string; data: RecordData; comment: RecordData | null };
type BannedRow = { id: string; data: RecordData };
type ImportPreview = {
  sourcePostId: string;
  targetPostId: string;
  sourceCount: number;
  existingCount: number;
  sample: Array<{ id: string; text: string }>;
  result?: string;
};
type GlobalImportPreview = {
  entries: ImportPreview[];
  unmapped: Array<{ sourcePostId: string; count: number }>;
};
type ImportMode = "site" | "page";
type EmojiImportPreview = {
  sourceId: string;
  targetId: string;
  sourceCount: number;
  targetCount: number;
  sample: Array<{ key: string; count: number }>;
  result?: string;
};
type GlobalEmojiPreview = {
  entries: EmojiImportPreview[];
  unmapped: Array<{ sourceId: string; total: number }>;
};

function getServices(): ModeratorServices {
  const app: FirebaseApp = getApps().find((candidate) => candidate.name === FIREBASE_APP_NAME) ??
    initializeApp(firebaseConfig, FIREBASE_APP_NAME);
  return { auth: getAuth(app), firestore: getFirestore(app) };
}

function getEmojiServices(): EmojiServices {
  const app: FirebaseApp = getApps().find((candidate) => candidate.name === EMOJI_FIREBASE_APP_NAME) ??
    initializeApp(emojiFirebaseConfig, EMOJI_FIREBASE_APP_NAME);
  return { firestore: getFirestore(app) };
}

function displayText(value: unknown, fallback = "-"): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : fallback;
}

function dateText(value: unknown): string {
  let date: Date | null = null;
  if (value instanceof Date) date = value;
  else if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    date = value.toDate();
  } else if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }
  return date ? date.toLocaleString("id-ID") : "-";
}

function targetPostIdFromLegacyId(sourcePostId: string): string | null {
  const detailMatch = sourcePostId.match(/^detail_slug_(.+)$/);
  if (detailMatch) return `detail_${detailMatch[1]}`;

  const readerMatch = sourcePostId.match(/^reader_slug_(.+)-chapter-(.+)$/);
  const chapter = readerMatch && normalizeChapterNumber(readerMatch[2]);
  if (readerMatch && chapter) return `reader_${readerMatch[1]}_${chapter}`;

  return null;
}

function sourcePostIdFromUrl(value: string): string {
  const url = new URL(value);
  const explicitPageId = url.searchParams.get("pageId");
  const rawId = explicitPageId || `${url.pathname}${url.search}`;
  return rawId
    .replace(/^[\/]+|[\/]+$/g, "")
    .replace(/[\/]/g, "__")
    .replace(/\.html$/i, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function targetPostIdFromUrl(value: string): string {
  const url = new URL(value);
  const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (segments[0] === "series" && segments[1]) {
    return `detail_${segments[1]}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
  if ((segments[0] === "manga" || segments[0] === "novel") && segments[1] && segments[2]) {
    const chapter = normalizeChapterNumber(segments[2]) || segments[2];
    return `reader_${segments[1]}_${chapter}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
  throw new Error("URL tujuan harus berupa halaman detail atau reader Mikoroku yang baru.");
}

function sourceEmojiIdFromUrl(value: string): string {
  const url = new URL(value);
  const communityPageId = url.searchParams.get("pageId");
  const slug = url.searchParams.get("slug");
  const chapter = url.searchParams.get("chapter");
  const pageKey = communityPageId || `${slug || "global"}_${chapter || "0"}`;
  return `emoji_${pageKey}`.replace(/\W/g, "_");
}

function targetEmojiIdFromUrl(value: string): string {
  return `emoji_${targetPostIdFromUrl(value)}`.replace(/\W/g, "_");
}

function targetEmojiIdFromLegacyId(sourceId: string): string | null {
  if (!sourceId.startsWith("emoji_")) return null;
  const legacyKey = sourceId.slice("emoji_".length);
  if (legacyKey === "global_0") return null;

  const oldWidgetDetail = legacyKey.match(/^detail_slug_(.+)$/);
  if (oldWidgetDetail) return `emoji_detail_${oldWidgetDetail[1]}`.replace(/\W/g, "_");

  const oldWidgetReader = legacyKey.match(/^reader_slug_(.+?)(?:-chapter-|_chapter_)(.+)$/i);
  if (oldWidgetReader) {
    const chapter = normalizeChapterNumber(oldWidgetReader[2]);
    return chapter
      ? `emoji_reader_${oldWidgetReader[1]}_${chapter}`.replace(/\W/g, "_")
      : null;
  }

  if (legacyKey.startsWith("detail_") || legacyKey.startsWith("reader_")) return sourceId;

  const oldUrlPageKey = legacyKey.match(/^(.+)_0$/);
  if (!oldUrlPageKey) return null;
  const chapterMatch = oldUrlPageKey[1].match(/^(.+?)(?:-chapter-|_chapter_)(.+)$/i);
  if (!chapterMatch) return `emoji_detail_${oldUrlPageKey[1]}`.replace(/\W/g, "_");
  const chapter = normalizeChapterNumber(chapterMatch[2]);
  return chapter
    ? `emoji_reader_${chapterMatch[1]}_${chapter}`.replace(/\W/g, "_")
    : null;
}

function emojiDocumentId(pageId: string): string {
  return `emoji_${pageId}`.replace(/\W/g, "_");
}

const EMOJI_COUNT_KEYS = ["like", "haha", "wow", "sad", "angry2"] as const;
const EMOJI_IMPORT_MARKER = "_legacyEmojiSources";

function emojiCounts(data: RecordData): Record<string, number> {
  return Object.fromEntries(EMOJI_COUNT_KEYS.flatMap((key) => {
    const value = data[key];
    return typeof value === "number" && Number.isFinite(value) ? [[key, value]] : [];
  }));
}

function emojiCountTotal(data: RecordData): number {
  return Object.values(emojiCounts(data)).reduce((total, value) => total + value, 0);
}

async function mergeEmojiCounts(
  firestore: Firestore,
  sourceId: string,
  targetId: string,
  sourceData: RecordData,
): Promise<boolean> {
  const targetRef = doc(firestore, "emoji_reactions", targetId);
  const sourceCounts = emojiCounts(sourceData);
  return runTransaction(firestore, async (transaction) => {
    const targetSnapshot = await transaction.get(targetRef);
    const targetData = targetSnapshot.exists() ? targetSnapshot.data() as RecordData : {};
    const importedSources = Array.isArray(targetData[EMOJI_IMPORT_MARKER])
      ? targetData[EMOJI_IMPORT_MARKER].filter((value): value is string => typeof value === "string")
      : [];
    if (importedSources.includes(sourceId)) return false;

    const mergedCounts = Object.fromEntries(Object.entries(sourceCounts).map(([key, count]) => {
      const existing = targetData[key];
      return [key, (typeof existing === "number" && Number.isFinite(existing) ? existing : 0) + count];
    }));
    transaction.set(targetRef, {
      ...mergedCounts,
      [EMOJI_IMPORT_MARKER]: [...importedSources, sourceId],
    }, { merge: true });
    return true;
  });
}

function isValidPostId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,1500}$/.test(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui.";
}

export default function ModerationPage() {
  const [services, setServices] = useState<ModeratorServices | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedRow[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingBans, setLoadingBans] = useState(false);
  const [pageError, setPageError] = useState("");
  const [actionStatus, setActionStatus] = useState("");
  const [preview, setPreview] = useState<GlobalImportPreview | null>(null);
  const [pagePreview, setPagePreview] = useState<ImportPreview | null>(null);
  const [emojiPreview, setEmojiPreview] = useState<GlobalEmojiPreview | null>(null);
  const [emojiPagePreview, setEmojiPagePreview] = useState<EmojiImportPreview | null>(null);
  const [importDataType, setImportDataType] = useState<"comments" | "emoji">("comments");
  const [importMode, setImportMode] = useState<ImportMode>("page");
  const [legacyUrl, setLegacyUrl] = useState("https://mikoroku.com/reader?slug=isekai-koushoku-musou-roku-chapter-01");
  const [newUrl, setNewUrl] = useState("https://mikoroku.top/manga/isekai-koushoku-musou-roku/1");
  const [sourceIdOverride, setSourceIdOverride] = useState("");
  const [targetIdOverride, setTargetIdOverride] = useState("");
  const [emojiLegacyUrl, setEmojiLegacyUrl] = useState("https://mikoroku.com/reader?slug=isekai-koushoku-musou-roku-chapter-01");
  const [emojiNewUrl, setEmojiNewUrl] = useState("https://mikoroku.top/manga/isekai-koushoku-musou-roku/1");
  const [emojiSourceIdOverride, setEmojiSourceIdOverride] = useState("");
  const [emojiTargetIdOverride, setEmojiTargetIdOverride] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"import" | "reports" | "banned">("import");

  const isModerator = Boolean(
    user?.email && MODERATOR_EMAILS.includes(user.email.trim().toLowerCase()),
  );

  useEffect(() => {
    try {
      const nextServices = getServices();
      setServices(nextServices);
      return onAuthStateChanged(nextServices.auth, (nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
      });
    } catch (error) {
      console.error("Moderator Firebase initialization failed.", error);
      setPageError(`Firebase moderator tidak dapat dimulai: ${errorMessage(error)}`);
      setAuthReady(true);
    }
  }, []);

  const loadReports = useCallback(async () => {
    if (!services || !isModerator) return;
    setLoadingReports(true);
    try {
      const reportSnapshot = await getDocs(query(
        collection(services.firestore, "reports"),
        where("status", "==", "pending"),
        orderBy("timestamp", "desc"),
      ));
      const rows = await Promise.all(reportSnapshot.docs.map(async (reportDoc) => {
        const data = reportDoc.data();
        const postId = displayText(data.postId, "home");
        const commentId = displayText(data.commentId, "");
        let comment: RecordData | null = null;
        if (commentId) {
          try {
            const commentDoc = await getDoc(doc(services.firestore, "comments", postId, "postComments", commentId));
            if (commentDoc.exists()) comment = commentDoc.data();
          } catch (error) {
            console.warn(`Could not load reported comment ${commentId}.`, error);
          }
        }
        return { id: reportDoc.id, data, comment };
      }));
      setReports(rows);
    } catch (error) {
      console.error("Failed to load pending comment reports.", error);
      setPageError(`Laporan gagal dimuat: ${errorMessage(error)}`);
    } finally {
      setLoadingReports(false);
    }
  }, [isModerator, services]);

  const loadBannedUsers = useCallback(async () => {
    if (!services || !isModerator) return;
    setLoadingBans(true);
    try {
      const snapshot = await getDocs(query(
        collection(services.firestore, "bannedUsers"),
        where("active", "==", true),
      ));
      setBannedUsers(snapshot.docs.map((entry) => ({ id: entry.id, data: entry.data() })));
    } catch (error) {
      console.error("Failed to load banned users.", error);
      setPageError(`Daftar banned gagal dimuat: ${errorMessage(error)}`);
    } finally {
      setLoadingBans(false);
    }
  }, [isModerator, services]);

  useEffect(() => {
    if (!isModerator) return;
    setPageError("");
    void Promise.all([loadReports(), loadBannedUsers()]);
  }, [isModerator, loadBannedUsers, loadReports]);

  const signIn = async () => {
    if (!services) return;
    setPageError("");
    try {
      await signInWithPopup(services.auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Moderator Google sign-in failed.", error);
      setPageError(`Login gagal: ${errorMessage(error)}`);
    }
  };

  const inspectImport = async () => {
    if (!services) return;
    setPageError("");
    setActionStatus("");
    setPreview(null);
    setImportBusy(true);
    try {
      const snapshot = await getDocsFromServer(collectionGroup(services.firestore, "postComments"));
      const commentsByPost = new Map<string, typeof snapshot.docs>();
      snapshot.docs.forEach((comment) => {
        const postId = comment.ref.parent.parent?.id;
        if (!postId) return;
        const comments = commentsByPost.get(postId) ?? [];
        comments.push(comment);
        commentsByPost.set(postId, comments);
      });

      const entries: ImportPreview[] = [];
      const unmapped: GlobalImportPreview["unmapped"] = [];
      commentsByPost.forEach((comments, sourcePostId) => {
        const targetPostId = targetPostIdFromLegacyId(sourcePostId);
        if (!targetPostId) {
          if (!sourcePostId.startsWith("detail_") && !sourcePostId.startsWith("reader_")) {
            unmapped.push({ sourcePostId, count: comments.length });
          }
          return;
        }
        if (!isValidPostId(targetPostId)) {
          unmapped.push({ sourcePostId, count: comments.length });
          return;
        }
        entries.push({
          sourcePostId,
          targetPostId,
          sourceCount: comments.length,
          existingCount: commentsByPost.get(targetPostId)?.length ?? 0,
          sample: comments.slice(0, 2).map((comment) => ({
            id: comment.id,
            text: displayText(comment.data().text || comment.data().comment, "(Komentar tanpa teks)").slice(0, 180),
          })),
        });
      });

      const duplicateTargets = new Set<string>();
      const seenTargets = new Set<string>();
      entries.forEach((entry) => {
        if (seenTargets.has(entry.targetPostId)) duplicateTargets.add(entry.targetPostId);
        seenTargets.add(entry.targetPostId);
      });
      if (duplicateTargets.size) {
        throw new Error(`Beberapa ID sumber menuju halaman yang sama: ${Array.from(duplicateTargets).join(", ")}`);
      }
      entries.sort((left, right) => left.sourcePostId.localeCompare(right.sourcePostId));
      unmapped.sort((left, right) => left.sourcePostId.localeCompare(right.sourcePostId));
      setPreview({ entries, unmapped });
      setActionStatus(
        `Pemindaian selesai: ${entries.length} halaman lama dapat dipetakan, ${entries.reduce((sum, entry) => sum + entry.sourceCount, 0)} komentar ditemukan, ${unmapped.length} ID halaman perlu pemetaan manual.`,
      );
    } catch (error) {
      console.error("Comment import preview failed.", error);
      setPageError(`Pemindaian seluruh komentar gagal: ${errorMessage(error)}`);
    } finally {
      setImportBusy(false);
    }
  };

  const inspectPageImport = async () => {
    if (!services) return;
    setPageError("");
    setActionStatus("");
    setPagePreview(null);
    setImportBusy(true);
    try {
      const sourcePostId = sourceIdOverride.trim() || sourcePostIdFromUrl(legacyUrl.trim());
      const targetPostId = targetIdOverride.trim() || targetPostIdFromUrl(newUrl.trim());
      if (!isValidPostId(sourcePostId) || !isValidPostId(targetPostId)) {
        throw new Error("ID post hanya boleh berisi huruf, angka, garis bawah, dan tanda hubung.");
      }
      if (sourcePostId === targetPostId) {
        throw new Error("ID sumber dan tujuan sama. Periksa URL atau ID post.");
      }
      const [sourceSnapshot, targetSnapshot] = await Promise.all([
        getDocsFromServer(collection(services.firestore, "comments", sourcePostId, "postComments")),
        getDocsFromServer(collection(services.firestore, "comments", targetPostId, "postComments")),
      ]);
      setPagePreview({
        sourcePostId,
        targetPostId,
        sourceCount: sourceSnapshot.size,
        existingCount: targetSnapshot.size,
        sample: sourceSnapshot.docs.slice(0, 3).map((comment) => ({
          id: comment.id,
          text: displayText(comment.data().text || comment.data().comment, "(Komentar tanpa teks)").slice(0, 180),
        })),
      });
      if (sourceSnapshot.empty) {
        setActionStatus("Tidak ditemukan komentar pada ID sumber ini. Pastikan URL atau ID khusus sudah benar.");
      }
    } catch (error) {
      console.error("Single-page comment import preview failed.", error);
      setPageError(`Preview halaman gagal: ${errorMessage(error)}`);
    } finally {
      setImportBusy(false);
    }
  };

  const importPageComments = async () => {
    if (!services || !pagePreview) return;
    if (!window.confirm(
      `Salin komentar dari "${pagePreview.sourcePostId}" ke "${pagePreview.targetPostId}"? Komentar sumber tidak dihapus dan komentar yang sudah ada tidak akan ditimpa.`,
    )) return;
    setImportBusy(true);
    setPageError("");
    setActionStatus("");
    try {
      const [sourceSnapshot, targetSnapshot] = await Promise.all([
        getDocsFromServer(collection(services.firestore, "comments", pagePreview.sourcePostId, "postComments")),
        getDocsFromServer(collection(services.firestore, "comments", pagePreview.targetPostId, "postComments")),
      ]);
      const targetIds = new Set(targetSnapshot.docs.map((comment) => comment.id));
      const missing = sourceSnapshot.docs.filter((comment) => !targetIds.has(comment.id));
      let copied = 0;
      for (let offset = 0; offset < missing.length; offset += 400) {
        const batch = writeBatch(services.firestore);
        const chunk = missing.slice(offset, offset + 400);
        chunk.forEach((comment) => {
          batch.set(
            doc(services.firestore, "comments", pagePreview.targetPostId, "postComments", comment.id),
            comment.data(),
          );
        });
        await batch.commit();
        copied += chunk.length;
      }
      const skipped = sourceSnapshot.size - copied;
      setPagePreview({
        ...pagePreview,
        sourceCount: sourceSnapshot.size,
        existingCount: targetSnapshot.size + copied,
        result: `${copied} komentar disalin · ${skipped} dilewati`,
      });
      setActionStatus(`Import halaman selesai: ${copied} komentar disalin, ${skipped} dilewati karena sudah ada. Komentar sumber tetap utuh.`);
    } catch (error) {
      console.error("Single-page comment import failed.", error);
      setPageError(`Import halaman gagal: ${errorMessage(error)}`);
    } finally {
      setImportBusy(false);
    }
  };

  const importComments = async () => {
    if (!services || !preview?.entries.length) return;
    const total = preview.entries.reduce((sum, entry) => sum + entry.sourceCount, 0);
    if (!window.confirm(
      `Import semua ${preview.entries.length} halaman (${total} komentar) yang bisa dipetakan? Komentar lama tidak dihapus dan komentar tujuan yang sudah ada tidak akan ditimpa.`,
    )) return;

    setImportBusy(true);
    setPageError("");
    setActionStatus("");
    try {
      const snapshot = await getDocsFromServer(collectionGroup(services.firestore, "postComments"));
      const commentsByPost = new Map<string, typeof snapshot.docs>();
      snapshot.docs.forEach((comment) => {
        const postId = comment.ref.parent.parent?.id;
        if (!postId) return;
        const comments = commentsByPost.get(postId) ?? [];
        comments.push(comment);
        commentsByPost.set(postId, comments);
      });
      let copiedTotal = 0;
      let skippedTotal = 0;
      const results: ImportPreview[] = [];
      for (const [index, entry] of preview.entries.entries()) {
        let copied = 0;
        try {
          const sourceComments = commentsByPost.get(entry.sourcePostId) ?? [];
          const targetComments = commentsByPost.get(entry.targetPostId) ?? [];
          const targetIds = new Set(targetComments.map((comment) => comment.id));
          const missing = sourceComments.filter((comment) => !targetIds.has(comment.id));
          for (let offset = 0; offset < missing.length; offset += 400) {
            const batch = writeBatch(services.firestore);
            const chunk = missing.slice(offset, offset + 400);
            chunk.forEach((comment) => {
              batch.set(
                doc(services.firestore, "comments", entry.targetPostId, "postComments", comment.id),
                comment.data(),
              );
            });
            await batch.commit();
            copied += chunk.length;
            copiedTotal += chunk.length;
          }
          skippedTotal += sourceComments.length - copied;
          results.push({ ...entry, sourceCount: sourceComments.length, existingCount: targetComments.length + copied, result: `${copied} disalin · ${sourceComments.length - copied} dilewati` });
        } catch (error) {
          console.error(`Comment batch import failed for ${entry.sourcePostId} -> ${entry.targetPostId}.`, error);
          results.push({ ...entry, result: `Gagal (${copied} disalin sebelum gagal): ${errorMessage(error)}` });
        }
        setPreview({ ...preview, entries: [...results, ...preview.entries.slice(index + 1)] });
        setActionStatus(`Memproses halaman ${index + 1}/${preview.entries.length}... ${copiedTotal} komentar disalin sejauh ini.`);
      }
      const failures = results.filter((entry) => entry.result?.startsWith("Gagal"));
      setActionStatus(
        `Import seluruh web selesai: ${copiedTotal} komentar disalin, ${skippedTotal} dilewati karena sudah ada.${failures.length ? ` ${failures.length} halaman gagal; lihat detail di daftar.` : ""} Komentar sumber tetap utuh.`,
      );
    } catch (error) {
      console.error("Comment import failed.", error);
      setPageError(`Import komentar gagal: ${errorMessage(error)}`);
    } finally {
      setImportBusy(false);
    }
  };

  const inspectEmojiImport = async () => {
    setPageError("");
    setActionStatus("");
    setEmojiPreview(null);
    setImportBusy(true);
    try {
      const { firestore } = getEmojiServices();
      const snapshot = await getDocsFromServer(collection(firestore, "emoji_reactions"));
      const allDocs = new Map(snapshot.docs.map((entry) => [entry.id, entry.data() as RecordData]));
      const entries: EmojiImportPreview[] = [];
      const unmapped: GlobalEmojiPreview["unmapped"] = [];
      snapshot.docs.forEach((entry) => {
        const targetId = targetEmojiIdFromLegacyId(entry.id);
        const total = emojiCountTotal(entry.data());
        if (!targetId) {
          if (!entry.id.startsWith("emoji_detail_") && !entry.id.startsWith("emoji_reader_")) {
            unmapped.push({ sourceId: entry.id, total });
          }
          return;
        }
        if (targetId === entry.id) return;
        const targetData = allDocs.get(targetId);
        entries.push({
          sourceId: entry.id,
          targetId,
          sourceCount: total,
          targetCount: targetData ? emojiCountTotal(targetData) : 0,
          sample: Object.entries(emojiCounts(entry.data())).map(([key, count]) => ({ key, count })),
          result: targetData && Array.isArray(targetData[EMOJI_IMPORT_MARKER]) &&
              targetData[EMOJI_IMPORT_MARKER].includes(entry.id)
            ? "Sudah pernah diimpor"
            : undefined,
        });
      });
      entries.sort((left, right) => left.sourceId.localeCompare(right.sourceId));
      unmapped.sort((left, right) => left.sourceId.localeCompare(right.sourceId));
      setEmojiPreview({ entries, unmapped });
      setActionStatus(
        `Pemindaian emoji selesai: ${entries.length} halaman lama dapat dipetakan, ${entries.reduce((sum, entry) => sum + entry.sourceCount, 0)} total reaksi ditemukan, ${unmapped.length} ID emoji belum terpetakan.`,
      );
    } catch (error) {
      console.error("Emoji reaction scan failed.", error);
      setPageError(`Pemindaian batch gagal membaca daftar koleksi emoji_reactions pada project emoji-reaction-fb044: ${errorMessage(error)} Periksa izin list/read pada Firestore Rules project emoji.`);
    } finally {
      setImportBusy(false);
    }
  };

  const importEmojiSite = async () => {
    if (!emojiPreview?.entries.length) return;
    const total = emojiPreview.entries.reduce((sum, entry) => sum + entry.sourceCount, 0);
    if (!window.confirm(
      `Tambahkan count dari ${emojiPreview.entries.length} halaman (${total} total reaksi) ke tujuan? Count tujuan yang sudah ada akan dijumlahkan; sumber yang sama tidak akan dihitung dua kali.`,
    )) return;
    setImportBusy(true);
    setPageError("");
    setActionStatus("");
    try {
      const { firestore } = getEmojiServices();
      const snapshot = await getDocsFromServer(collection(firestore, "emoji_reactions"));
      const allDocs = new Map(snapshot.docs.map((entry) => [entry.id, entry.data() as RecordData]));
      let copiedPages = 0;
      let skippedPages = 0;
      const results: EmojiImportPreview[] = [];
      for (const [index, entry] of emojiPreview.entries.entries()) {
        try {
          const sourceData = allDocs.get(entry.sourceId);
          if (!sourceData) throw new Error("Dokumen sumber tidak ditemukan saat import.");
          const imported = await mergeEmojiCounts(firestore, entry.sourceId, entry.targetId, sourceData);
          if (!imported) {
            skippedPages += 1;
            results.push({ ...entry, result: "Dilewati: count sumber ini sudah pernah ditambahkan" });
          } else {
            copiedPages += 1;
            results.push({ ...entry, targetCount: entry.targetCount + entry.sourceCount, result: "Count emoji berhasil ditambahkan ke count tujuan" });
          }
        } catch (error) {
          console.error(`Emoji import failed for ${entry.sourceId} -> ${entry.targetId}.`, error);
          results.push({ ...entry, result: `Gagal: ${errorMessage(error)}` });
        }
        setEmojiPreview({ ...emojiPreview, entries: [...results, ...emojiPreview.entries.slice(index + 1)] });
        setActionStatus(`Memproses emoji ${index + 1}/${emojiPreview.entries.length}... ${copiedPages} halaman berhasil.`);
      }
      const failures = results.filter((entry) => entry.result?.startsWith("Gagal:"));
      setActionStatus(
        `Import count emoji selesai: ${copiedPages} halaman ditambahkan, ${skippedPages} dilewati karena sumber sudah pernah diimpor.${failures.length ? ` ${failures.length} halaman gagal; lihat detail.` : ""} Data sumber tetap utuh.`,
      );
    } catch (error) {
      console.error("Emoji site import failed.", error);
      setPageError(`Import count emoji gagal: ${errorMessage(error)}`);
    } finally {
      setImportBusy(false);
    }
  };

  const inspectEmojiPage = async () => {
    setPageError("");
    setActionStatus("");
    setEmojiPagePreview(null);
    setImportBusy(true);
    try {
      const sourceId = emojiSourceIdOverride.trim() || sourceEmojiIdFromUrl(emojiLegacyUrl.trim());
      const targetId = emojiTargetIdOverride.trim() || targetEmojiIdFromUrl(emojiNewUrl.trim());
      if (!/^emoji_[a-zA-Z0-9_]{1,1500}$/.test(sourceId) || !/^emoji_[a-zA-Z0-9_]{1,1500}$/.test(targetId)) {
        throw new Error("ID dokumen emoji harus diawali emoji_ dan hanya berisi huruf, angka, atau garis bawah.");
      }
      if (sourceId === targetId) throw new Error("ID sumber dan tujuan sama. Periksa URL atau ID dokumen.");
      const { firestore } = getEmojiServices();
      const [sourceSnapshot, targetSnapshot] = await Promise.all([
        getDocFromServer(doc(firestore, "emoji_reactions", sourceId)),
        getDocFromServer(doc(firestore, "emoji_reactions", targetId)),
      ]);
      const sourceData = sourceSnapshot.exists() ? sourceSnapshot.data() as RecordData : {};
      const targetData = targetSnapshot.exists() ? targetSnapshot.data() as RecordData : {};
      setEmojiPagePreview({
        sourceId,
        targetId,
        sourceCount: emojiCountTotal(sourceData),
        targetCount: emojiCountTotal(targetData),
        sample: Object.entries(emojiCounts(sourceData)).map(([key, count]) => ({ key, count })),
        result: Array.isArray(targetData[EMOJI_IMPORT_MARKER]) &&
            targetData[EMOJI_IMPORT_MARKER].includes(sourceId)
          ? "Sumber ini sudah pernah diimpor"
          : undefined,
      });
      if (!sourceSnapshot.exists()) setActionStatus("Dokumen count emoji sumber tidak ditemukan. Periksa URL atau ID sumber.");
    } catch (error) {
      console.error("Single-page emoji preview failed.", error);
      setPageError(`Preview count emoji gagal: ${errorMessage(error)}`);
    } finally {
      setImportBusy(false);
    }
  };

  const importEmojiPage = async () => {
    if (!emojiPagePreview) return;
    if (!window.confirm(
      `Tambahkan count emoji dari "${emojiPagePreview.sourceId}" ke "${emojiPagePreview.targetId}"? Count tujuan yang ada akan dijumlahkan dan sumber yang sama tidak akan dihitung dua kali.`,
    )) return;
    setImportBusy(true);
    setPageError("");
    setActionStatus("");
    try {
      const { firestore } = getEmojiServices();
      const [sourceSnapshot, targetSnapshot] = await Promise.all([
        getDocFromServer(doc(firestore, "emoji_reactions", emojiPagePreview.sourceId)),
        getDocFromServer(doc(firestore, "emoji_reactions", emojiPagePreview.targetId)),
      ]);
      if (!sourceSnapshot.exists()) throw new Error("Dokumen count emoji sumber tidak ditemukan.");
      const sourceData = sourceSnapshot.data();
      const imported = await mergeEmojiCounts(
        firestore,
        emojiPagePreview.sourceId,
        emojiPagePreview.targetId,
        sourceData,
      );
      if (!imported) {
        setEmojiPagePreview({
          ...emojiPagePreview,
          targetCount: targetSnapshot.exists() ? emojiCountTotal(targetSnapshot.data()) : 0,
          result: "Dilewati: count sumber ini sudah pernah ditambahkan",
        });
        setActionStatus("Import dilewati karena count dari sumber ini sudah pernah ditambahkan.");
        return;
      }
      setEmojiPagePreview({
        ...emojiPagePreview,
        targetCount: emojiPagePreview.targetCount + emojiPagePreview.sourceCount,
        result: "Count emoji berhasil ditambahkan ke count tujuan",
      });
      setActionStatus("Import count emoji halaman selesai. Count tujuan dan sumber berhasil digabung.");
    } catch (error) {
      console.error("Single-page emoji import failed.", error);
      setPageError(`Import count emoji halaman gagal: ${errorMessage(error)}`);
    } finally {
      setImportBusy(false);
    }
  };

  const resolveReport = async (report: ReportRow, action: "delete" | "ignore" | "ban") => {
    if (!services) return;
    const commentId = displayText(report.data.commentId, "");
    const postId = displayText(report.data.postId, "home");
    const commentRef = commentId
      ? doc(services.firestore, "comments", postId, "postComments", commentId)
      : null;
    const actionLabel = action === "delete" ? "menghapus komentar" : action === "ban" ? "mem-ban pengguna dan menghapus komentar" : "mengabaikan laporan";
    if (!window.confirm(`Yakin ingin ${actionLabel}?`)) return;

    try {
      if (action === "delete") {
        if (!commentRef) throw new Error("ID komentar tidak ditemukan pada laporan.");
        const batch = writeBatch(services.firestore);
        batch.delete(commentRef);
        batch.update(doc(services.firestore, "reports", report.id), { status: "resolved" });
        await batch.commit();
      } else if (action === "ignore") {
        await updateDoc(doc(services.firestore, "reports", report.id), { status: "ignored" });
      } else {
        if (!commentRef) throw new Error("ID komentar tidak ditemukan pada laporan.");
        const commentSnapshot = await getDoc(commentRef);
        if (!commentSnapshot.exists()) throw new Error(`Komentar tidak ditemukan pada post "${postId}".`);
        const comment = commentSnapshot.data();
        const uid = displayText(comment.uid, "");
        if (!uid) throw new Error("UID penulis komentar tidak tersedia, jadi pengguna tidak dapat di-ban.");
        const batch = writeBatch(services.firestore);
        batch.set(doc(services.firestore, "bannedUsers", uid), {
          active: true,
          displayName: displayText(comment.displayName || comment.username, "User"),
          username: displayText(comment.username, ""),
          avatar: displayText(comment.avatar, ""),
          bannedAt: serverTimestamp(),
          reason: "Melanggar aturan komunitas (via Moderation Panel)",
        });
        batch.delete(commentRef);
        batch.update(doc(services.firestore, "reports", report.id), { status: "resolved" });
        await batch.commit();
      }
      setActionStatus(action === "ignore" ? "Laporan diabaikan." : action === "ban" ? "Pengguna di-ban dan komentar dihapus." : "Komentar dihapus.");
      await Promise.all([loadReports(), loadBannedUsers()]);
    } catch (error) {
      console.error(`Failed to ${action} reported comment.`, error);
      setPageError(`Aksi moderasi gagal: ${errorMessage(error)}`);
    }
  };

  const unbanUser = async (entry: BannedRow) => {
    if (!services || !window.confirm(`Yakin ingin membuka ban untuk ${displayText(entry.data.displayName, entry.id)}?`)) return;
    try {
      await updateDoc(doc(services.firestore, "bannedUsers", entry.id), {
        active: false,
        unbannedAt: serverTimestamp(),
      });
      setActionStatus("Ban pengguna berhasil dibuka.");
      await loadBannedUsers();
    } catch (error) {
      console.error("Failed to unban user.", error);
      setPageError(`Gagal membuka ban: ${errorMessage(error)}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f5f8] px-4 py-8 text-slate-900 dark:bg-[#0d0e12] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="relative mb-6 flex flex-col gap-4 overflow-hidden rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_60px_-35px_rgba(15,23,42,.3)] dark:border-white/[0.08] dark:bg-[#17181e] sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.22em] text-rose-600 dark:text-rose-400">Mikoroku · Workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Moderator Panel</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Kelola diskusi komunitas dan migrasikan komentar dengan aman.</p>
          </div>
          {isModerator && user ? (
            <div className="relative flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-slate-50/80 p-2 pl-4 text-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
              <span className="max-w-[220px] truncate text-xs text-slate-600 dark:text-slate-300">{user.email}</span>
              <button type="button" onClick={() => services && void signOut(services.auth)} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold shadow-sm transition hover:bg-rose-50 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]">Logout</button>
            </div>
          ) : null}
        </header>

        {pageError && <p className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">{pageError}</p>}

        {!authReady ? (
          <section className="rounded-2xl bg-white p-6 text-sm shadow-sm dark:bg-[#191a20]">Memeriksa sesi moderator...</section>
        ) : !user ? (
          <section className="grid justify-items-center gap-4 rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-[#191a20]">
            <p className="max-w-lg text-sm text-slate-600 dark:text-slate-400">Login dengan akun moderator yang sudah terdaftar untuk membuka alat moderasi dan import komentar.</p>
            <button
              type="button"
              onClick={() => void signIn()}
              disabled={!services}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50"
            >
              Login moderator dengan Google
            </button>
          </section>
        ) : !isModerator ? (
          <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm" role="alert">
            Akun {user.email || "ini"} tidak memiliki akses moderator.
            <button type="button" onClick={() => services && void signOut(services.auth)} className="ml-3 underline">Ganti akun</button>
          </section>
        ) : (
          <>
            <nav className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Moderator sections">
              {([
                ["import", "Import", "Migrasi komentar lama", "↗", ""],
                ["reports", "Laporan", "Tinjau laporan komunitas", "!", reports.length ? String(reports.length) : "0"],
                ["banned", "Banned", "Kelola akun yang dibatasi", "−", String(bannedUsers.length)],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`group flex min-h-[92px] items-center gap-4 rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${activeTab === tab ? "border-rose-500/40 bg-white ring-2 ring-rose-500/10 dark:bg-[#1b1c23]" : "border-black/[0.07] bg-white/75 hover:border-rose-500/30 dark:border-white/[0.07] dark:bg-[#15161b]"}`}
                >
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-lg font-bold ${activeTab === tab ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" : "bg-slate-100 text-slate-600 group-hover:bg-rose-50 group-hover:text-rose-600 dark:bg-white/[0.06] dark:text-slate-300 dark:group-hover:bg-rose-500/10 dark:group-hover:text-rose-300"}`}>{tab === "import" ? "↗" : tab === "reports" ? "!" : "−"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{label}</span>
                    <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">{tab === "import" ? "Migrasi komentar lama" : tab === "reports" ? "Tinjau laporan komunitas" : "Kelola akun yang dibatasi"}</span>
                  </span>
                  {tab !== "import" && <span className="grid min-w-7 place-items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 dark:bg-white/[0.08] dark:text-slate-300">{tab === "reports" ? reports.length : bannedUsers.length}</span>}
                </button>
              ))}
            </nav>

            {actionStatus && <p className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300" role="status">{actionStatus}</p>}

            {activeTab === "import" && (
              <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_18px_60px_-42px_rgba(15,23,42,.35)] dark:border-white/[0.07] dark:bg-[#17181e] sm:p-7" aria-labelledby="import-heading">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.16em] text-rose-600 dark:text-rose-400">Migrasi data</p>
                    <h2 id="import-heading" className="mt-1 text-xl font-bold tracking-tight">Import komentar & count emoji</h2>
                  </div>
                  <p className="max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400">Data sumber tetap aman. Count tujuan digabungkan dan sumber ditandai agar tidak terhitung dua kali.</p>
                </div>
                <div className="mt-6 inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-black/20" role="tablist" aria-label="Jenis data import">
                  {([
                    ["comments", "Komentar"],
                    ["emoji", "Count Emoji"],
                  ] as const).map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      role="tab"
                      aria-selected={importDataType === type}
                      onClick={() => {
                        setImportDataType(type);
                        setPageError("");
                        setActionStatus("");
                      }}
                      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${importDataType === type ? "bg-white text-slate-900 shadow-sm dark:bg-[#30313a] dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {importDataType === "comments" ? (
                  <>
                <div className="mt-6 inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-black/20" role="tablist" aria-label="Mode import komentar">
                  {([
                    ["site", "Seluruh situs"],
                    ["page", "Per halaman"],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={importMode === mode}
                      onClick={() => {
                        setImportMode(mode);
                        setPageError("");
                        setActionStatus("");
                      }}
                      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${importMode === mode ? "bg-white text-slate-900 shadow-sm dark:bg-[#30313a] dark:text-white" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {importMode === "site" ? (
                  <>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Pindai semua thread komentar lama, lalu import otomatis halaman detail dan reader yang ID-nya dapat dikenali.
                    </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={() => void inspectImport()} disabled={!services || importBusy} className="rounded-xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm font-semibold transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-rose-500/10">
                    {importBusy ? "Memindai..." : "Pindai seluruh situs"}
                  </button>
                  {preview && preview.entries.some((entry) => entry.sourceCount > 0) && (
                    <button type="button" onClick={() => void importComments()} disabled={importBusy} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/15 transition hover:bg-rose-700 disabled:cursor-wait disabled:opacity-50">
                      {importBusy ? "Mengimpor..." : `Import ${preview.entries.length} halaman`}
                    </button>
                  )}
                </div>
                {preview && (
                  <div className="mt-5 grid gap-3">
                    <p className="text-sm font-semibold">
                      {preview.entries.length} halaman terdeteksi · {preview.entries.reduce((sum, entry) => sum + entry.sourceCount, 0)} komentar · {preview.unmapped.length} ID belum terpetakan
                    </p>
                    {preview.entries.slice(0, 100).map((entry, index) => (
                      <article key={`${entry.sourcePostId}-${entry.targetPostId}`} className="rounded-xl border border-black/10 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/10">
                        <p className="text-sm font-semibold">#{index + 1} {entry.sourceCount} komentar sumber · {entry.existingCount} sudah ada di tujuan</p>
                        <p className="mt-1 break-all font-mono text-[11px] leading-5 text-slate-600 dark:text-slate-400">
                          {entry.sourcePostId} → {entry.targetPostId}
                        </p>
                        {entry.result && <p className={`mt-2 text-xs ${entry.result.startsWith("Gagal") ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>{entry.result}</p>}
                        {entry.sample.length > 0 && (
                          <ul className="mt-3 grid gap-2">
                            {entry.sample.map((item) => (
                              <li key={item.id} className="rounded-lg border border-black/10 bg-white p-3 text-xs dark:border-white/10 dark:bg-white/[0.03]">
                                <span className="font-mono text-slate-500">{item.id}</span>
                                <p className="mt-1 whitespace-pre-wrap break-words">{item.text}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </article>
                    ))}
                    {preview.entries.length > 100 && <p className="text-xs text-slate-600 dark:text-slate-400">Menampilkan 100 dari {preview.entries.length} halaman. Semua halaman yang terdeteksi tetap disertakan dalam proses import.</p>}
                    {preview.unmapped.length > 0 && (
                      <details className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                        <summary className="cursor-pointer text-sm font-semibold">ID lama yang belum terpetakan ({preview.unmapped.length})</summary>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">ID ini mungkin memakai `pageId` khusus. ID tersebut tidak akan diimpor otomatis agar komentar tidak salah masuk ke halaman lain.</p>
                        <ul className="mt-3 grid gap-1 font-mono text-xs">
                          {preview.unmapped.slice(0, 100).map((entry) => (
                            <li key={entry.sourcePostId} className="break-all">{entry.sourcePostId} · {entry.count} komentar</li>
                          ))}
                        </ul>
                        {preview.unmapped.length > 100 && <p className="mt-2 text-xs">Menampilkan 100 dari {preview.unmapped.length} ID.</p>}
                      </details>
                    )}
                  </div>
                )}
                  </>
                ) : (
                  <div className="mt-5">
                    <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Import satu thread komentar dengan URL halaman lama dan halaman baru. URL umum akan mengisi ID otomatis; isi ID post secara manual jika halaman lama menggunakan `pageId` khusus.
                    </p>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium">
                        URL halaman lama
                        <input value={legacyUrl} onChange={(event) => { setLegacyUrl(event.currentTarget.value); setPagePreview(null); }} type="url" className="min-w-0 rounded-xl border border-black/10 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-black/10" />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        URL halaman baru
                        <input value={newUrl} onChange={(event) => { setNewUrl(event.currentTarget.value); setPagePreview(null); }} type="url" className="min-w-0 rounded-xl border border-black/10 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-black/10" />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        ID sumber (opsional)
                        <input value={sourceIdOverride} onChange={(event) => { setSourceIdOverride(event.currentTarget.value); setPagePreview(null); }} placeholder="Otomatis dari URL lama" className="min-w-0 rounded-xl border border-black/10 bg-slate-50 px-3 py-2.5 font-mono text-xs outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-black/10" />
                      </label>
                      <label className="grid gap-2 text-sm font-medium">
                        ID tujuan (opsional)
                        <input value={targetIdOverride} onChange={(event) => { setTargetIdOverride(event.currentTarget.value); setPagePreview(null); }} placeholder="Otomatis dari URL baru" className="min-w-0 rounded-xl border border-black/10 bg-slate-50 px-3 py-2.5 font-mono text-xs outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-black/10" />
                      </label>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button type="button" onClick={() => void inspectPageImport()} disabled={!services || importBusy} className="rounded-xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm font-semibold transition hover:border-rose-400 hover:bg-rose-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-rose-500/10">
                        {importBusy ? "Memeriksa..." : "Periksa halaman"}
                      </button>
                      {pagePreview && pagePreview.sourceCount > 0 && (
                        <button type="button" onClick={() => void importPageComments()} disabled={importBusy} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/15 transition hover:bg-rose-700 disabled:opacity-50">
                          {importBusy ? "Mengimpor..." : "Import komentar"}
                        </button>
                      )}
                    </div>
                    {pagePreview && (
                      <div className="mt-5 rounded-2xl border border-black/[0.07] bg-slate-50 p-4 dark:border-white/[0.07] dark:bg-black/10">
                        <p className="text-sm font-semibold">{pagePreview.sourceCount} komentar sumber · {pagePreview.existingCount} komentar di tujuan</p>
                        <p className="mt-1 break-all font-mono text-xs text-slate-500">{pagePreview.sourcePostId} → {pagePreview.targetPostId}</p>
                        {pagePreview.result && <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{pagePreview.result}</p>}
                        {pagePreview.sample.length > 0 && <ul className="mt-3 grid gap-2">{pagePreview.sample.map((comment) => <li key={comment.id} className="rounded-xl border border-black/[0.06] bg-white p-3 text-xs dark:border-white/[0.06] dark:bg-white/[0.03]"><span className="font-mono text-slate-500">{comment.id}</span><p className="mt-1 whitespace-pre-wrap break-words">{comment.text}</p></li>)}</ul>}
                      </div>
                    )}
                  </div>
                )}
                  </>
                ) : (
                  <div className="mt-5">
                    <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Count emoji tersimpan di project Firebase terpisah (`emoji-reaction-fb044`). Import menjumlahkan count lama dengan count tujuan yang ada, dan aman dijalankan ulang tanpa menggandakan sumber yang sama.
                    </p>
                    {importMode === "site" ? (
                      <>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button type="button" onClick={() => void inspectEmojiImport()} disabled={importBusy} className="rounded-xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm font-semibold transition hover:border-rose-400 hover:bg-rose-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-rose-500/10">
                            {importBusy ? "Memindai..." : "Pindai count emoji"}
                          </button>
                          {emojiPreview && emojiPreview.entries.length > 0 && (
                            <button type="button" onClick={() => void importEmojiSite()} disabled={importBusy} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/15 transition hover:bg-rose-700 disabled:opacity-50">
                              {importBusy ? "Mengimpor..." : `Import ${emojiPreview.entries.length} halaman`}
                            </button>
                          )}
                        </div>
                        {emojiPreview && (
                          <div className="mt-5 grid gap-3">
                            <p className="text-sm font-semibold">
                              {emojiPreview.entries.length} halaman terdeteksi · {emojiPreview.entries.reduce((sum, entry) => sum + entry.sourceCount, 0)} total reaksi · {emojiPreview.unmapped.length} ID belum terpetakan
                            </p>
                            {emojiPreview.entries.slice(0, 100).map((entry, index) => (
                              <article key={entry.sourceId} className="rounded-xl border border-black/10 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/10">
                                <p className="text-sm font-semibold">#{index + 1} {entry.sourceCount} reaksi sumber · {entry.targetCount} reaksi di tujuan</p>
                                <p className="mt-1 break-all font-mono text-[11px] text-slate-500">{entry.sourceId} → {entry.targetId}</p>
                                {entry.result && <p className={`mt-2 text-xs ${entry.result.startsWith("Gagal:") ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>{entry.result}</p>}
                                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{entry.sample.map((item) => `${item.key}: ${item.count}`).join(" · ") || "Belum ada hitungan emoji."}</p>
                              </article>
                            ))}
                            {emojiPreview.entries.length > 100 && <p className="text-xs text-slate-500">Menampilkan 100 dari {emojiPreview.entries.length} halaman. Semua halaman tetap diproses.</p>}
                            {emojiPreview.unmapped.length > 0 && (
                              <details className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                                <summary className="cursor-pointer text-sm font-semibold">ID emoji belum terpetakan ({emojiPreview.unmapped.length})</summary>
                                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">ID yang formatnya tidak dikenali dilewati agar count tidak tersalin ke halaman yang salah.</p>
                                <ul className="mt-3 grid gap-1 font-mono text-xs">
                                  {emojiPreview.unmapped.slice(0, 100).map((entry) => <li key={entry.sourceId} className="break-all">{entry.sourceId} · {entry.total} reaksi</li>)}
                                </ul>
                              </details>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                          <label className="grid gap-2 text-sm font-medium">
                            URL halaman lama
                            <input value={emojiLegacyUrl} onChange={(event) => { setEmojiLegacyUrl(event.currentTarget.value); setEmojiPagePreview(null); }} type="url" className="min-w-0 rounded-xl border border-black/10 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-black/10" />
                          </label>
                          <label className="grid gap-2 text-sm font-medium">
                            URL halaman baru
                            <input value={emojiNewUrl} onChange={(event) => { setEmojiNewUrl(event.currentTarget.value); setEmojiPagePreview(null); }} type="url" className="min-w-0 rounded-xl border border-black/10 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-black/10" />
                          </label>
                          <label className="grid gap-2 text-sm font-medium">
                            ID sumber emoji (opsional)
                            <input value={emojiSourceIdOverride} onChange={(event) => { setEmojiSourceIdOverride(event.currentTarget.value); setEmojiPagePreview(null); }} placeholder="Otomatis dari URL lama" className="min-w-0 rounded-xl border border-black/10 bg-slate-50 px-3 py-2.5 font-mono text-xs outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-black/10" />
                          </label>
                          <label className="grid gap-2 text-sm font-medium">
                            ID tujuan emoji (opsional)
                            <input value={emojiTargetIdOverride} onChange={(event) => { setEmojiTargetIdOverride(event.currentTarget.value); setEmojiPagePreview(null); }} placeholder="Otomatis dari URL baru" className="min-w-0 rounded-xl border border-black/10 bg-slate-50 px-3 py-2.5 font-mono text-xs outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-white/10 dark:bg-black/10" />
                          </label>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button type="button" onClick={() => void inspectEmojiPage()} disabled={importBusy} className="rounded-xl border border-black/10 bg-slate-50 px-4 py-2.5 text-sm font-semibold transition hover:border-rose-400 hover:bg-rose-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-rose-500/10">
                            {importBusy ? "Memeriksa..." : "Periksa count emoji"}
                          </button>
                          {emojiPagePreview && emojiPagePreview.sourceCount > 0 && (
                            <button type="button" onClick={() => void importEmojiPage()} disabled={importBusy} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/15 transition hover:bg-rose-700 disabled:opacity-50">
                              {importBusy ? "Mengimpor..." : "Import count emoji"}
                            </button>
                          )}
                        </div>
                        {emojiPagePreview && (
                          <div className="mt-5 rounded-2xl border border-black/[0.07] bg-slate-50 p-4 dark:border-white/[0.07] dark:bg-black/10">
                            <p className="text-sm font-semibold">{emojiPagePreview.sourceCount} total reaksi sumber · {emojiPagePreview.targetCount} saat ini di tujuan</p>
                            <p className="mt-1 break-all font-mono text-xs text-slate-500">{emojiPagePreview.sourceId} → {emojiPagePreview.targetId}</p>
                            {emojiPagePreview.result && <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{emojiPagePreview.result}</p>}
                            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{emojiPagePreview.sample.map((item) => `${item.key}: ${item.count}`).join(" · ") || "Belum ada hitungan emoji."}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </section>
            )}

            {activeTab === "reports" && (
              <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#191a20]" aria-labelledby="reports-heading">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 id="reports-heading" className="text-lg font-bold">Laporan (Pending)</h2>
                  <button type="button" onClick={() => void loadReports()} disabled={loadingReports} className="rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold disabled:opacity-50 dark:border-white/15">Refresh</button>
                </div>
                {loadingReports ? <p className="py-8 text-center text-sm">Memuat laporan...</p> : reports.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Belum ada laporan masuk.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                      <thead><tr className="bg-slate-100 dark:bg-white/[0.06]"><th className="p-3">Tanggal</th><th className="p-3">Alasan</th><th className="p-3">Komentar</th><th className="p-3">Reporter</th><th className="p-3">Aksi</th></tr></thead>
                      <tbody>{reports.map((report) => (
                        <tr key={report.id} className="border-t border-black/10 align-top dark:border-white/10">
                          <td className="p-3">{dateText(report.data.timestamp)}</td>
                          <td className="p-3">{displayText(report.data.reason, "Tidak ada alasan")}</td>
                          <td className="max-w-md whitespace-pre-wrap break-words p-3">
                            <strong>{displayText(report.comment?.displayName || report.comment?.author || report.comment?.username, "Anonymous")}</strong>
                            <p className="mt-2">{displayText(report.comment?.text || report.comment?.comment, displayText(report.data.commentText, "(Komentar kosong)"))}</p>
                            <small className="mt-2 block text-slate-500">ID: {displayText(report.data.commentId)}</small>
                            {typeof report.data.commentLink === "string" && <a className="mt-2 inline-block text-blue-600 underline" href={report.data.commentLink} target="_blank" rel="noreferrer">Buka komentar</a>}
                          </td>
                          <td className="p-3">{displayText(report.data.reporterName, "Anonymous")}<small className="mt-1 block text-slate-500">{displayText(report.data.reporterUsername, "")}</small></td>
                          <td className="p-3">
                            <div className="flex min-w-36 flex-col gap-2">
                              <button type="button" onClick={() => void resolveReport(report, "delete")} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white">Hapus komentar</button>
                              <button type="button" onClick={() => void resolveReport(report, "ban")} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white">Ban user</button>
                              <button type="button" onClick={() => void resolveReport(report, "ignore")} className="rounded-lg bg-slate-500 px-3 py-2 text-xs font-semibold text-white">Abaikan</button>
                            </div>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === "banned" && (
              <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#191a20]" aria-labelledby="banned-heading">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 id="banned-heading" className="text-lg font-bold">User dibanned</h2>
                  <button type="button" onClick={() => void loadBannedUsers()} disabled={loadingBans} className="rounded-lg border border-black/15 px-3 py-2 text-xs font-semibold disabled:opacity-50 dark:border-white/15">Refresh</button>
                </div>
                {loadingBans ? <p className="py-8 text-center text-sm">Memuat daftar banned...</p> : bannedUsers.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">Tidak ada user dibanned.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                      <thead><tr className="bg-slate-100 dark:bg-white/[0.06]"><th className="p-3">Nama</th><th className="p-3">UID</th><th className="p-3">Alasan</th><th className="p-3">Tanggal ban</th><th className="p-3">Aksi</th></tr></thead>
                      <tbody>{bannedUsers.map((entry) => (
                        <tr key={entry.id} className="border-t border-black/10 dark:border-white/10">
                          <td className="p-3">{displayText(entry.data.displayName)}</td>
                          <td className="break-all p-3 font-mono text-xs">{entry.id}</td>
                          <td className="p-3">{displayText(entry.data.reason)}</td>
                          <td className="p-3">{dateText(entry.data.bannedAt)}</td>
                          <td className="p-3"><button type="button" onClick={() => void unbanUser(entry)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Unban</button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
