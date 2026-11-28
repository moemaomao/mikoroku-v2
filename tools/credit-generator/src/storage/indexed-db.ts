import type { CreditProject, TeamPreset } from "../types";

const DATABASE_NAME = "mikoroku-credit-generator";
const DATABASE_VERSION = 1;
const PROJECTS_STORE = "projects";
const PRESETS_STORE = "team-presets";
const SETTINGS_STORE = "settings";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
        database.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(PRESETS_STORE)) {
        database.createObjectStore(PRESETS_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      }
    };
    request.onerror = () => reject(request.error || new Error("Could not open generator storage."));
    request.onsuccess = () => resolve(request.result);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not read generator storage."));
  });
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const database = await openDatabase();
  try {
    return await requestResult(database.transaction(storeName, "readonly")
      .objectStore(storeName).getAll()) as T[];
  } finally {
    database.close();
  }
}

async function putRecord(storeName: string, value: Record<string, unknown>): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(value);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not save generator data."));
      transaction.onabort = () => reject(transaction.error || new Error("Saving generator data was aborted."));
    });
  } finally {
    database.close();
  }
}

async function deleteRecord(storeName: string, id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Could not delete generator data."));
      transaction.onabort = () => reject(transaction.error || new Error("Deleting generator data was aborted."));
    });
  } finally {
    database.close();
  }
}

export function listCreditProjects(): Promise<CreditProject[]> {
  return getAll<CreditProject>(PROJECTS_STORE);
}

export function saveCreditProject(project: CreditProject): Promise<void> {
  return putRecord(PROJECTS_STORE, project);
}

export function deleteCreditProject(id: string): Promise<void> {
  return deleteRecord(PROJECTS_STORE, id);
}

export function listTeamPresets(): Promise<TeamPreset[]> {
  return getAll<TeamPreset>(PRESETS_STORE);
}

export function saveTeamPreset(preset: TeamPreset): Promise<void> {
  return putRecord(PRESETS_STORE, preset);
}

export function deleteTeamPreset(id: string): Promise<void> {
  return deleteRecord(PRESETS_STORE, id);
}

export async function loadGeneratorSetting<T>(key: string): Promise<T | null> {
  const database = await openDatabase();
  try {
    const record = await requestResult(database.transaction(SETTINGS_STORE, "readonly")
      .objectStore(SETTINGS_STORE).get(key)) as { value?: T } | undefined;
    return record?.value ?? null;
  } finally {
    database.close();
  }
}

export function saveGeneratorSetting<T>(key: string, value: T): Promise<void> {
  return putRecord(SETTINGS_STORE, { key, value });
}
