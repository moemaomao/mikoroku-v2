"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { initializeFirebaseClient } from "./lib/firebase-client";
import {
  DEFAULT_ADVERTISEMENTS,
  parseAdvertisements,
  pathMatchesPattern,
  type AdPlacement,
  type Advertisement,
} from "./lib/advertisements";

const AdvertisementContext = createContext<Advertisement[] | null>(null);
const startedGlobalAdvertisements = new Set<string>();
let advertisementLoad: Promise<Advertisement[]> | undefined;

function loadAdvertisements(): Promise<Advertisement[]> {
  if (!advertisementLoad) {
    const { firestore } = initializeFirebaseClient();
    advertisementLoad = getDoc(doc(firestore, "meta", "mangaSummary"))
      .then((snapshot) => {
        if (!snapshot.exists()) return DEFAULT_ADVERTISEMENTS;
        const data = snapshot.data();
        return Object.prototype.hasOwnProperty.call(data, "siteAds")
          ? parseAdvertisements(data.siteAds)
          : DEFAULT_ADVERTISEMENTS;
      })
      .catch((error: unknown) => {
        advertisementLoad = undefined;
        throw error;
      });
  }
  return advertisementLoad;
}

function startGlobalAdvertisement(advertisement: Advertisement): void {
  if (startedGlobalAdvertisements.has(advertisement.id)) return;
  startedGlobalAdvertisements.add(advertisement.id);

  const template = document.createElement("template");
  template.innerHTML = advertisement.code;
  const sourceScripts = [...template.content.querySelectorAll("script")];
  const scripts = sourceScripts.length ? sourceScripts : [null];

  scripts.forEach((source) => {
    const script = document.createElement("script");
    script.dataset.globalAdvertisement = advertisement.id;
    if (source) {
      for (const attribute of source.attributes) {
        script.setAttribute(attribute.name, attribute.value);
      }
      if (source.src) script.src = source.src;
      else script.textContent = source.textContent;
      if (!source.hasAttribute("async") && !source.hasAttribute("defer")) {
        script.async = false;
      }
    } else {
      script.textContent = advertisement.code;
    }
    script.onerror = () => {
      console.error(`Global advertisement "${advertisement.name}" failed to load.`);
    };
    document.body.appendChild(script);
  });
}

function bannerDocument(code: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{box-sizing:border-box;width:100%;min-height:100%;margin:0;padding:0;overflow:hidden}body{display:flex;justify-content:center}</style></head><body>${code}</body></html>`;
}

export function AdvertisementManager({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [advertisements, setAdvertisements] = useState<Advertisement[] | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    let active = true;
    void Promise.resolve()
      .then(loadAdvertisements)
      .then((loaded) => {
        if (active) setAdvertisements(loaded);
      })
      .catch((error: unknown) => {
        console.error("Advertisement configuration failed to load.", error);
        if (active) setAdvertisements([]);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!advertisements || pathname.startsWith("/admin")) return;
    advertisements
      .filter((advertisement) => advertisement.enabled && advertisement.type === "global")
      .forEach(startGlobalAdvertisement);
  }, [advertisements, pathname]);

  return (
    <AdvertisementContext.Provider value={advertisements}>
      {children}
    </AdvertisementContext.Provider>
  );
}

export function BannerAdSlot({ placement }: { placement: AdPlacement }) {
  const pathname = usePathname();
  const advertisements = useContext(AdvertisementContext);
  if (!advertisements || pathname.startsWith("/admin")) return null;

  const matchingAds = advertisements.filter((advertisement) =>
    advertisement.enabled &&
    advertisement.type === "page" &&
    advertisement.placement === placement &&
    pathMatchesPattern(pathname, advertisement.pathPattern),
  );
  if (!matchingAds.length) return null;

  return (
    <div className="mx-auto my-5 grid w-full max-w-[1100px] justify-items-center gap-4 px-3" aria-label="Iklan">
      {matchingAds.map((advertisement) => (
        <iframe
          key={`${advertisement.id}:${advertisement.code}`}
          title={advertisement.name}
          srcDoc={bannerDocument(advertisement.code)}
          width="100%"
          height={advertisement.height}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
          className="block max-w-full border-0"
          style={{ minHeight: advertisement.height }}
        />
      ))}
    </div>
  );
}
