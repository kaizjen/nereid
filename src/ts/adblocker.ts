import { FiltersEngine, Request } from "@cliqz/adblocker";
import fetch from "electron-fetch";
import * as fs from "fs-extra";
import * as pt from "path";
import { config, control, userdataDirectory } from "./userdata";
import $ from "./common"

export let engine: FiltersEngine;
export let isAdBlockerReady = false;
export let adBlockerError = false;

const expirationValue = Math.round(Number(control.options.adblock_cache_expiration?.value) || 43200);

export async function setup() {
  if (!config.get().privacy.adblockerEnabled) return console.log("Adblock is disabled.");
  console.log('Attempting to start adblock...');
  try {
    engine = await FiltersEngine.fromPrebuiltAdsAndTracking(fetch, {
      path: pt.join(userdataDirectory, 'adblockercache.bin'),
      async read(path) {
        const buffer = await fs.readFile(path);
        const expires = buffer.readUint32LE(0) + expirationValue;

        const result = buffer.subarray(32 / 8);

        const now = Math.round(Date.now() / (60_000));
        if (expires <= now) {
          console.log("Blocklist expired. Re-downloading");
          throw "Blocklist expired";
        }
        return result;
      },
      async write(path, initialBuffer) {
        // we store the creation date in the file, before the adblock contents
        const now = Math.round(Date.now() / (60_000));

        const dateBuffer = Buffer.alloc(32 / 8);
        dateBuffer.writeUint32LE(now);

        await fs.writeFile(path, Buffer.concat([dateBuffer, initialBuffer]));
      }
    });
    isAdBlockerReady = true;
    adBlockerError = false;
    console.log("Adblock started!");

  } catch (err) {
    adBlockerError = true;
    console.error("Adblocker failed to load correctly. (error: %s)\n Retrying after 10sec", err);
    setTimeout(setup, 10_000);
  }
}

export const webContentsABMap = new WeakMap<Electron.WebContents, {
  trackersBlocked: string[]
  wasReady: boolean
}>();

function standardOptions() {
  return { trackersBlocked: [], wasReady: isAdBlockerReady };
}

config.listen(({ privacy }) => {
  if (privacy.adblockerEnabled && !isAdBlockerReady) {
    setup();
  }
})

export function matchRequest(info: Electron.OnBeforeRequestListenerDetails) {
  if (!config.get().privacy.adblockerEnabled) return {};
  if (!info.webContents) return {};

  const pageURL = info.webContents.getURL();
  if (!webContentsABMap.has(info.webContents)) {
    // write standard options to the adblocker map
    webContentsABMap.set(info.webContents, standardOptions());
    info.webContents.on('did-navigate', () => {
      // when webContents navigates, overwrite the options
      webContentsABMap.set(info.webContents, standardOptions());
    })
  }

  if (!isAdBlockerReady) return {};

  if (pageURL) {
    const { protocol, hostname } = $.URLParse(pageURL)

    if (config.get().privacy.adblockerWhitelist.includes(protocol + hostname)) {
      return {}
    }
    if (protocol == 'nereid') return {};
  }

  const result = engine.match(Request.fromRawDetails({
    url: info.url,
    type: info.resourceType,
    sourceUrl: info.referrer,
    tabId: info.webContentsId
  }));

  if (result.match && info.webContents) {
    const { trackersBlocked } = webContentsABMap.get(info.webContents);
    if (!trackersBlocked.includes(info.url)) {
      trackersBlocked.push(info.url)
    }
  }

  return {
    redirect: result.redirect?.dataUrl,
    match: result.match,
    blockedName: result.filter?.hostname
  }
}

export function getCosmeticFilters() {
  
}