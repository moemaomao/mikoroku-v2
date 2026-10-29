const GLOBAL_SETTINGS_DB = "mikoroku-global-settings";
const GLOBAL_SETTINGS_STORE = "settings";

type GlobalSettingsEntry = {
  key: string;
  value: string;
};

function openGlobalSettingsDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(GLOBAL_SETTINGS_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(GLOBAL_SETTINGS_STORE)) {
        request.result.createObjectStore(GLOBAL_SETTINGS_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open global settings storage."));
    request.onblocked = () => reject(new Error("Global settings storage is blocked by another browser tab."));
  });
}

export async function readGlobalSetting(key: string): Promise<string | null> {
  if (!("indexedDB" in window)) return null;
  const database = await openGlobalSettingsDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(GLOBAL_SETTINGS_STORE, "readonly");
    const request = transaction.objectStore(GLOBAL_SETTINGS_STORE).get(key);
    let value: string | null = null;
    request.onsuccess = () => {
      const entry = request.result as GlobalSettingsEntry | undefined;
      value = typeof entry?.value === "string" ? entry.value : null;
    };
    request.onerror = () => transaction.abort();
    transaction.oncomplete = () => {
      database.close();
      resolve(value);
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Could not read global settings."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? request.error ?? new Error("Reading global settings was aborted."));
    };
  });
}

export async function writeGlobalSetting(key: string, value: string): Promise<void> {
  if (!("indexedDB" in window)) {
    throw new Error("IndexedDB is unavailable in this browser.");
  }
  const database = await openGlobalSettingsDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(GLOBAL_SETTINGS_STORE, "readwrite");
    transaction.objectStore(GLOBAL_SETTINGS_STORE).put({ key, value } satisfies GlobalSettingsEntry);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not save global settings."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error ?? new Error("Saving global settings was aborted."));
    };
  });
}
