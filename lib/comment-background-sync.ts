import { cacheUserStatsProfile } from "./user-stats-cache";

type PendingCommentBackground = {
  uid: string;
  image: Blob;
  attempts: number;
  nextAttemptAt: number;
  updatedAt: number;
  uploadedUrl?: string;
};

export type CommentBackgroundFirestore = {
  collection: (name: string) => {
    doc: (uid: string) => {
      set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void>;
    };
  };
};

export const COMMENT_BACKGROUND_QUEUED_EVENT = "mikoroku:comment-background-queued";
export const COMMENT_BACKGROUND_SYNCED_EVENT = "mikoroku:comment-background-synced";
export const MAX_COMMENT_BACKGROUND_FILE_SIZE = 20 * 1024 * 1024;

const DATABASE_NAME = "mikoroku-comment-background-sync";
const STORE_NAME = "pending";
const IMGBB_API_KEY = "751e8d146b32b8a00499aef04f568e30";
const INITIAL_RETRY_DELAY_MS = 60_000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

function openDatabase(): Promise<IDBDatabase> {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("This browser does not support offline background storage."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "uid" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline background storage."));
    request.onblocked = () => reject(new Error("Offline background storage is blocked by another browser tab."));
  });
}

async function readPending(uid: string): Promise<PendingCommentBackground | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(uid);
    let value: PendingCommentBackground | null = null;
    request.onsuccess = () => {
      const result = request.result as PendingCommentBackground | undefined;
      if (result && result.uid === uid && result.image instanceof Blob) value = result;
    };
    transaction.oncomplete = () => {
      database.close();
      resolve(value);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Could not read the offline background."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Reading the offline background was aborted."));
    };
  });
}

async function writePending(pending: PendingCommentBackground): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(pending);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not save the offline background."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Saving the offline background was aborted."));
    };
  });
}

async function deletePending(uid: string, updatedAt?: number): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(uid);
    request.onsuccess = () => {
      const current = request.result as PendingCommentBackground | undefined;
      if (updatedAt === undefined || current?.updatedAt === updatedAt) store.delete(uid);
    };
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not remove the offline background."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Removing the offline background was aborted."));
    };
  });
}

export async function getPendingCommentBackground(uid: string): Promise<Blob | null> {
  return (await readPending(uid))?.image || null;
}

export async function getPendingCommentBackgroundRetry(uid: string): Promise<number | null> {
  return (await readPending(uid))?.nextAttemptAt ?? null;
}

export async function queueCommentBackground(uid: string, image: Blob): Promise<void> {
  const updatedAt = Date.now();
  await writePending({
    uid,
    image,
    attempts: 0,
    nextAttemptAt: updatedAt,
    updatedAt,
  });
  window.dispatchEvent(new Event(COMMENT_BACKGROUND_QUEUED_EVENT));
}

export async function clearPendingCommentBackground(uid: string): Promise<void> {
  await deletePending(uid);
}

function compressCommentBackground(image: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    createImageBitmap(image).then((bitmap) => {
      const scale = Math.min(1, 1600 / bitmap.width, 1600 / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        reject(new Error("Browser image processing is unavailable."));
        return;
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The background image could not be compressed."));
      }, "image/webp", 0.72);
    }).catch((error: unknown) => {
      reject(error instanceof Error ? error : new Error("The background image could not be processed."));
    });
  });
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function uploadCommentBackground(image: Blob): Promise<string> {
  const compressedImage = await withTimeout(
    compressCommentBackground(image),
    30_000,
    "Background image processing timed out.",
  );
  const formData = new FormData();
  formData.append("image", compressedImage, "comment-background.webp");
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    const result: {
      success?: boolean;
      data?: { url?: string };
      error?: { message?: string };
    } = await response.json();
    if (!response.ok || !result.success || !result.data?.url) {
      throw new Error(result.error?.message || `Image upload failed (${response.status}).`);
    }
    return result.data.url;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Background image upload timed out.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function updateLocalProfile(uid: string, imageUrl: string): void {
  cacheUserStatsProfile(uid, { customCommentBg: imageUrl });
  try {
    const raw = window.localStorage.getItem("userSettingsPreview");
    if (!raw) return;
    const preview = JSON.parse(raw) as Record<string, unknown>;
    if (typeof preview.customCommentBg === "string" && preview.customCommentBg.startsWith("blob:")) {
      window.localStorage.setItem(
        "userSettingsPreview",
        JSON.stringify({ ...preview, customCommentBg: imageUrl }),
      );
    }
  } catch (error) {
    console.warn("The synced comment background could not be written to the local profile preview.", error);
  }
}

export async function syncPendingCommentBackground(
  uid: string,
  firestore: CommentBackgroundFirestore,
): Promise<number | null> {
  let pending = await readPending(uid);
  if (!pending || !navigator.onLine || pending.nextAttemptAt > Date.now()) {
    return pending?.nextAttemptAt ?? null;
  }

  try {
    if (!pending.uploadedUrl) {
      const imageUrl = await uploadCommentBackground(pending.image);
      const latest = await readPending(uid);
      if (!latest || latest.updatedAt !== pending.updatedAt) return latest?.nextAttemptAt ?? null;
      pending = { ...latest, uploadedUrl: imageUrl };
      await writePending(pending);
    }

    const latest = await readPending(uid);
    if (!latest || latest.updatedAt !== pending.updatedAt) return latest?.nextAttemptAt ?? null;
    let timeout: number | undefined;
    try {
      await Promise.race([
        firestore.collection("userStats").doc(uid).set(
          { customCommentBg: pending.uploadedUrl },
          { merge: true },
        ),
        new Promise<never>((_, reject) => {
          timeout = window.setTimeout(() => reject(new Error("Comment background sync timed out.")), 20_000);
        }),
      ]);
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
    }

    const current = await readPending(uid);
    if (!current || current.updatedAt !== pending.updatedAt) return current?.nextAttemptAt ?? null;
    await deletePending(uid, pending.updatedAt);
    updateLocalProfile(uid, pending.uploadedUrl || "");
    window.dispatchEvent(new CustomEvent(COMMENT_BACKGROUND_SYNCED_EVENT, {
      detail: { uid, url: pending.uploadedUrl || "" },
    }));
    return null;
  } catch (error) {
    const latest = await readPending(uid);
    if (!latest || latest.updatedAt !== pending.updatedAt) return latest?.nextAttemptAt ?? null;
    const attempts = latest.attempts + 1;
    const delay = Math.min(
      INITIAL_RETRY_DELAY_MS * (2 ** Math.min(attempts - 1, 10)),
      MAX_RETRY_DELAY_MS,
    );
    const retry = {
      ...latest,
      attempts,
      nextAttemptAt: Date.now() + delay,
      updatedAt: Date.now(),
    };
    await writePending(retry);
    console.warn("Comment background remains queued for background synchronization.", error);
    return retry.nextAttemptAt;
  }
}
