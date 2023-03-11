import { FiltersEngine, Request } from "@cliqz/adblocker";
import fetch from "electron-fetch";
import * as fs from "fs-extra";
import * as pt from "path";
import { config, control, userdataDirectory } from "./userdata";
import $ from "./common"

export let engine: FiltersEngine;
export let isAdBlockerReady = false;
export let adBlockerError = false;

const expirationValue = Number(control.options.adblock_cache_expiration?.value) || 2592000000;

export async function setup() {
  try {
    engine = await FiltersEngine.fromPrebuiltAdsAndTracking(fetch, {
      path: pt.join(userdataDirectory, 'adblockercache.bin'),
      async read(path) {
        const result = await fs.readFile(path, 'utf-8');
        const expires = Number(result.split('\0')[0]);

        const data = result.split('\0').slice(1).join('\0');

        if (expires <= Date.now()) {
          console.log("Blocklist expired. Re-downloading");

          throw "Blocklist expired";
        }
        return Buffer.from(data)
      },
      async write(path, buffer) {
        let str = Buffer.from(buffer).toString('utf-8');
        // we store the expiration date in the file, before a NUL byte
        str = (Date.now() + expirationValue) + '\0' + str;
        await fs.writeFile(path, str);
      }
    });
    isAdBlockerReady = true;

  } catch (err) {
    adBlockerError = true;
    console.error("Adblocker failed to load correctly. (error: %o)", err);
  }
}

export const webContentsABMap: Record<number, {
  trackersBlocked: string[]
  wasReady: boolean
}> = {};

function standardOptions() {
  return { trackersBlocked: [], wasReady: isAdBlockerReady };
}

export function matchRequest(info: Electron.OnBeforeRequestListenerDetails) {
  if (!info.webContents) return {};

  const pageURL = info.webContents.getURL();
  if (!webContentsABMap[info.webContentsId]) {
    // write standard options to the adblocker map
    webContentsABMap[info.webContentsId] = standardOptions();
    info.webContents.on('did-navigate', () => {
      // when webContents navigates, overwrite the options
      webContentsABMap[info.webContentsId] = standardOptions();
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
    const { trackersBlocked } = webContentsABMap[info.webContentsId];
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