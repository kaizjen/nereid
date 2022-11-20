// This file does everything related to the current session and the electron sessions

import type { CertficateCache, Permissions, TabWindow } from "./types";
import { app, BrowserWindow, ipcMain, protocol, session, Session, screen, nativeTheme } from "electron";
import * as pathModule from "path"
import $ from "./vars";
import { randomUUID } from 'crypto'
import * as fs from "fs-extra"
import { getAllTabWindows, isTabWindow } from './windows'
import { config, downloads, userdataDirectory, control } from "./userdata";
import fetch from "electron-fetch";
import { isAdBlockerReady, matchRequest } from "./adblocker";

const URLParse = $.URLParse;

export let certificateCache: CertficateCache = {}

global.SESSION_UUID = randomUUID();
console.log('Starting session with UUID ', global.SESSION_UUID);

protocol.registerSchemesAsPrivileged([
  { scheme: 'nereid', privileges: { standard: true } },
  { scheme: 'n-res', privileges: { standard: true } },
  { scheme: 'n-internal', privileges: { standard: true } },
]);

const fakeAskValueForPermCheck = control.options.fake_permission_value_on_prompt?.value == 1 // 1 is allow

function nereidProtocol(req: Electron.ProtocolRequest, respond: (response: string | Electron.ProtocolResponse) => void) {
  let parsed = URLParse(req.url);

  let finalPath = (parsed.hostname ?? '') + (parsed.pathname ?? '');

  if (finalPath.endsWith('/')) {
    finalPath = finalPath.slice(0, -1)
  }

  // Internal URLs:
  switch (parsed.hostname) {
    case '.svelte': {
      const base = `${__dirname}/../../node_modules/svelte`
      let path: string;
      if (parsed.pathname == '/') {
        /*
          For an unknown to mankind reason, the ES6 module spec does not respect redirects at all.
          If you have a file importing "/location" that redirects to "/location/index.js" and a file importing
          "/location/index.js" directly, the module resolver TREATS THEM AS DIFFERENT FILES! THE MODULE
          RESOLVER ONLY CARES ABOUT WHAT STRING YOU IMPORT, AND DOES NOT EVEN UNDERSTAND THAT YOU LITERAlLY REDIRECTED TO THE
          SAME FILE.
          So, this workaround basically makes it so that the "svelte" module ("nereid://.svelte/") now imports
          stuff from internal modules using the nereid: protocol, which kinda helps.
          Still, this is why the modules suck so much >:(
        */
        return respond({
          statusCode: 308,
          headers: {
            Location: `${parsed.protocol}//.svelte.hack.js/`
          }
        })

      } else if (parsed.pathname == '/internal/index.mjs') {
        return respond({
          statusCode: 308,
          headers: {
            Location: `${parsed.protocol}//.svelte/internal`
          }
        })

      } else {
        path = `${base}/${
          pathModule.extname(parsed.pathname) == '' ? (parsed.pathname + '/index.mjs') : parsed.pathname
        }`;
      }
      respond(pathModule.normalize(path))
      console.log(
        'module required:', req.url,
        'module response:', pathModule.normalize(path)
      );
      return true;
    }

    case '.bg_image': {
      let configData = config.get();
      let bgimg = configData.ui.backgroundImage;
      let theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'

      async function findImage(initialPath: string) {
        let display = screen.getPrimaryDisplay();
        let displayResolution = display.size.height * display.size.width;
        const source = {
          userdata: userdataDirectory,
          theme,
          size: (displayResolution <= 272000) ? 'small' : ((displayResolution >= 3825600) ? 'large' : 'medium'),
          LocalAppData: process.env.LOCALAPPDATA,
          AppData: process.env.APPDATA,
          Home: process.env.HOME
        }

        let regex = /\${.*?}/g;
        let matches = [...initialPath.matchAll(regex)].map(match => match[0]);

        matches.forEach(match => {
          let val = source[match.slice(2, -1)]; // get rid of '${' and '}'
          if (!val) return;

          initialPath = initialPath.replace(match, val)
        })
        initialPath = pathModule.normalize(initialPath)

        let isDirectory = (await fs.lstat(initialPath)).isDirectory();

        if (isDirectory) {
          const items = await fs.readdir(initialPath);
          const rand = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]

          const finalPath = pathModule.join(initialPath, rand(items))

          console.log('background image: ', finalPath, 'for', req.url);

          return finalPath

        } else {
          console.log('background image: ', initialPath, 'for', req.url);
          return initialPath
        }
      }

      findImage(bgimg).then(respond)
      return;
    }
  }
  // end of Internal URLs

  if (!['nereid:', '', null].includes(URLParse(req.referrer).protocol)) {
    // if any other thing tries to access nereid protocol, deny
    respond({ error: -10 }) // Access denied
    return false;
  }
  if (finalPath.endsWith('.svelte')) {
    // Add .js extension for all svelte files
    finalPath += '.js'
  }
  if (pathModule.extname(finalPath) == '') {
    try {
      // if .js file is present, then js is the priority
      fs.accessSync(pathModule.normalize(`${__dirname}/../browser/webui/${finalPath}.js`));
      finalPath += '.js'

    } catch (e) {
      finalPath += '.html';
    }
  }
  if (finalPath.includes('..')) {
    // if tries to access anything outside of the nereid
    // i know that this also prevents this from accessing files like "something..js" but who needs them anyway
    respond({ error: -10 }) // Access denied
    return false;
  }
  if (finalPath.includes('$')) {
    // this is the symbol that specifies hidden code
    respond({ error: -6 }) // File not found
    return false;
  }
  respond({
    headers: {
      'X-Frame-Options': 'DENY' // do not let other sites embed nereid:// pages
    },
    path: pathModule.normalize(`${__dirname}/../browser/webui/${finalPath}`)
  })
  console.log('response:', pathModule.normalize(`${__dirname}/../browser/webui/${finalPath}`), 'for', req.url);

  return true;
}

async function getProtocol(req: Electron.ProtocolRequest, respond: (response: Electron.ProtocolResponse) => void) {
  const parsed = URLParse(req.url);
  let url = req.url.replace(parsed.protocol, '')
  if (parsed.slashes) {
    url = url.replace('//', '')
  }

  try {
    const response = await fetch(url, { session: session.fromPartition(NO_HEADERS_PARTITION), useSessionCookies: false });
    if (typeof response.body == 'string') {
      respond({ statusCode: 500 });
      return;
    }
    respond({ data: response.body, headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "text/plain"
    } })
    
  } catch (err) {
    respond({ data: err + '', error: -2 })
  }
}

export function registerSession(ses: Session) {
  //ses.setPreloads([ `${__dirname}/preloads/tab.js` ])

  ses.protocol.registerFileProtocol('nereid', nereidProtocol)

  ses.protocol.registerStreamProtocol('get', getProtocol)

  ses.webRequest.onBeforeRequest({ urls: ['http://*/*'] }, ({ url }, callback) => {
    if (!config.get().privacy.httpsOnly) return callback({ cancel: false })

    if (control.options.disallow_http?.value) {
      callback({
        cancel: true
      })

    } else {
      callback({
        redirectURL: url.replace('http:', 'https:')
      })
    }
  })

  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (!isAdBlockerReady) return callback({ cancel: false });

    const { redirect, match } = matchRequest(details);
    if (redirect) return callback({ redirectURL: redirect });
    if (match) return callback({ cancel: true });

    // faster redirects + tracking protections
    const url = URLParse(details.url)
    if (url.hostname.endsWith('google.com') && url.pathname.startsWith('/url')) {
      let redirectURL = url.searchParams.get('url');
      if (redirectURL) return callback({ redirectURL })
    }
    if (url.hostname.endsWith('youtube.com') && url.pathname.startsWith('/redirect')) {
      let redirectURL = url.searchParams.get('q');
      if (redirectURL) return callback({ redirectURL })
    }
    if (url.hostname == 'vk.com' && url.pathname.startsWith('/away.php')) {
      let redirectURL = url.searchParams.get('to');
      if (redirectURL) return callback({ redirectURL })
    }

    return callback({ cancel: false })
  })

  ses.setCertificateVerifyProc(async (req, next) => {
    certificateCache[req.hostname] = req;

    if (req.errorCode != 0) {
      console.warn(
        `Could not establish a secure connection with ${req.hostname}: ${req.verificationResult} (${req.errorCode})`
      );

      return;
    }

    setImmediate(() => {
      getAllTabWindows().forEach(win => {
        win.tabs.forEach(tab => {
          // update the security icon of already loaded tabs
          if (!tab.webContents) return;

          let url = tab.webContents.getURL();
          if (URLParse(url).hostname == req.hostname) {
            tab.webContents.send('tabUpdate', 'sec', true)
          }
        })
      })
    })
    
    next(-3) // continue with the result
  })

  let isDownloadInProgress = false;
  ses.on('will-download', async(e, item) => {
    if (isDownloadInProgress) e.preventDefault()

    if (item.getState() == 'interrupted') {
      item.resume()
    }

    const send = (function () {
      let wins = getAllTabWindows();
      return function (channel: string, ...msgs: any[]) {
        wins.forEach(w => {
          w.chrome.webContents.send(channel, ...msgs)
        })
      }
    })()

    const ipcFunctions = {
      "dl:resume"() {
        item.resume()
      },
      "dl:pause"() {
        console.log('download paused by chrome');
        item.pause();
        BrowserWindow.getAllWindows().forEach(win => {
          win.setProgressBar(currentOffset / total, { mode: 'paused' })
        })
      },
      "dl:cancel"() {
        console.log('download cancelled by chrome');
        item.cancel()
      }
    }

    for (const ch in ipcFunctions) {
      ipcMain.on(ch, ipcFunctions[ch])
    }

    let currentOffset = 0;
    let total = item.getTotalBytes()

    let dSavePath = config.get().behaviour.downloadPath;
    if (dSavePath) {
      const realPath = pathModule.join(dSavePath, item.getFilename());
      const ext = pathModule.extname(realPath)
      let number = 0;
      let path = realPath;

      function checkPath() {
        if (fs.existsSync(path)) {
          number++;
          path = realPath.slice(0, -ext.length) + ` (${number})` + ext;
          checkPath()
        }
      }
      checkPath()
      item.setSavePath(path)

    } else {
      item.setSaveDialogOptions({
        title: 'Save file',
        defaultPath: '/',
        properties: [ 'showHiddenFiles', 'createDirectory', 'showOverwriteConfirmation' ]
      })
    }

    send('downloadStart', {
      path: item.getSavePath(),
      url: item.getURL()
    })

    isDownloadInProgress = true;

    item.on('updated', (_e, state) => {
      if (state == 'progressing') {
        send('downloadStatus', {
          state, recieved: item.getReceivedBytes(), total: item.getTotalBytes()
        });

        currentOffset = item.getReceivedBytes();
        total = item.getTotalBytes()

        BrowserWindow.getAllWindows().forEach(win => {
          win.setProgressBar(currentOffset / total)
        })

      } else {
        send('downloadStatus', {
          state
        })

        BrowserWindow.getAllWindows().forEach(win => {
          win.setProgressBar(-1)
        })
        isDownloadInProgress = false;
      }
    });

    item.on('done', async(_e, state) => {
      console.log('done because', state);
      send('downloadStatus', {
        state
      })
      isDownloadInProgress = false;

      let dlData = await downloads.get();
      dlData.unshift({
        url: item.getURL(),
        urlChain: item.getURLChain(),
        savePath: item.getSavePath(),
        status: state == 'cancelled' ? 'interrupted' : state,
        offset: currentOffset,
        length: total
      })
      await downloads.set(dlData)

      BrowserWindow.getAllWindows().forEach(win => {
        win.setProgressBar(-1)
      })

      for (const ch in ipcFunctions) {
        ipcMain.off(ch, ipcFunctions[ch])
      }
    })
  })

  ses.setPermissionCheckHandler((_wc, permission, originalOrigin, details) => {
    //console.log('checking permission %o for %o with details %o', permission, originalOrigin, details);
    
    const { privacy } = config.get();
    let { defaultPermissions, sitePermissions, denyCrossOriginPermissions } = privacy;
    let { origin, hostname } = URLParse(originalOrigin)

    if (denyCrossOriginPermissions && !details.isMainFrame && (origin != details.embeddingOrigin)) return false;

    function checkPermission(obj: Permissions | Partial<Permissions>): boolean | null | undefined {
      switch (permission) {
        case 'notifications': {
          return obj.notifications
        }
        case 'geolocation': {
          return obj.geolocation
        }
        case 'media': {
          if (details.mediaType == 'audio') {
            return obj['media.audio']

          } else if (details.mediaType == 'video') {
            return obj['media.video']

          } else return false
        }
        case 'mediaKeySystem': {
          return obj.DRM
        }
        case 'midi': {
          return obj.midi
        }
        case 'pointerLock': {
          return obj.pointerLock
        }
        case 'openExternal': {
          return obj.openExternal
        }
        case 'display-capture': {
          return obj.displayCapture
        }
        case 'idle-detection': {
          return obj.idleDetection
        }
        case 'clipboard-sanitized-write': {
          return !control.options.disallow_clipboard_read.value
        }
          
      
        default: return false // unknown permission
      }
    }

    if (hostname in sitePermissions) {
      let check = checkPermission(sitePermissions[hostname]);
      switch (check) {
        case true: return true
        case false: return false
        case undefined: // site is going to ask us anyway
      }
    }

    let defaultCheck = checkPermission(defaultPermissions)
    // there is no way to return 'prompt' or 'default' so we just say no usually
    return defaultCheck == undefined ? fakeAskValueForPermCheck : defaultCheck
  })

  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    console.log('requested permission %o with details %o', permission, details);

    const { privacy } = config.get();
    let { sitePermissions, defaultPermissions, denyCrossOriginPermissions } = privacy;
    let { origin, hostname } = URLParse(details.requestingUrl);
    
    if (permission == 'clipboard-read') return callback(!control.options.disallow_clipboard_read.value)

    if (denyCrossOriginPermissions && !details.isMainFrame && (origin != URLParse(details.requestingUrl).origin)){
      callback(false); return;
    }

    function checkPermission(obj: Permissions | Partial<Permissions>): boolean | null | undefined {
      switch (permission) {
        case 'fullscreen': {
          let win = BrowserWindow.fromWebContents(wc);
          if (!isTabWindow(win)) return false
    
          if (win.currentTab.webContents != wc) return false
    
          return obj.fullscreen
        }
        case 'notifications': {
          return obj.notifications
        }
        case 'geolocation': {
          return obj.geolocation
        }
        case 'media': {
          if (details.mediaTypes?.includes('audio')) {
            return obj['media.audio']
          }
          if (details.mediaTypes?.includes('video')) {
            return obj['media.video']
          }
          // TODO: find a way to not do this, because this is very risky behaviour, even though I couldn't find a way to hack this.
          // This is done because every time a media permission is requested, for some reason another media permission
          // is requested right after without "mediaTypes".
          return true
        }
        case 'mediaKeySystem': {
          return obj.DRM
        }
        case 'midi': {
          return obj.midi
        }
        case 'pointerLock': {
          return obj.pointerLock
        }
        case 'openExternal': {
          return obj.openExternal
        }
        case 'display-capture': {
          return obj.displayCapture
        }
        // undocumented
        case 'idle-detection' as string: {
          return obj.idleDetection
        }
        case 'sensors' as string: {
          return obj.sensors
        }

        default: return false // unknown permission
      }
    }

    function getValidName(perm: string) {
      switch (perm) {
        case 'mediaKeySystem': return 'DRM'
        case 'display-capture': return 'displayCapture'
        case 'idle-detection': return 'idleDetection'
        case 'media': return details.mediaTypes?.includes('audio') ? 'media.audio' :
          (details.mediaTypes?.includes('video') ? 'media.video' : '-unknown-')
        default: return perm
      }
    }

    function writePermission(isAllowed: boolean | null) {
      if (hostname in sitePermissions) {
        sitePermissions[hostname][getValidName(permission)] = isAllowed;
      } else {
        sitePermissions[hostname] = { [getValidName(permission)]: isAllowed }
      }

      config.set({ privacy });
    }

    function ask() {
      let win = BrowserWindow.fromWebContents(wc) as TabWindow;
      if (!win || !isTabWindow(win)) return callback(false);

      let uid = win.tabs.find(t => t.webContents == wc)?.uniqueID;
      if (uid == undefined) throw(new Error("No tab in window. This should NOT happen!"));

      win.chrome.webContents.send('permission-add', uid, {
        name: getValidName(permission),
        hostname,
        externalURL: details.externalURL
      })

      type PermissionIPC = {
        name: string
        hostname: string
      }
      function handleIPC(_e: Electron.Event, channel: string, data: {
        allow: boolean|null, tabUID: number, permission: PermissionIPC
      }) {
        if (
          channel != 'permission-response' ||
          data.tabUID != uid ||
          data.permission.name != getValidName(permission)
        ) return;

        win.chrome.webContents.off('ipc-message', handleIPC);
        if (data.allow != null) {
          callback(data.allow)
          writePermission(permission == 'openExternal' ? null : data.allow)
          // openExternal isn't saved due to security reasons: a site that has this permission can open
          // ANY app that has a protocol handler
        }
        win.chrome.webContents.send('permission-remove', uid, {
          name: getValidName(permission),
          hostname
        })
      }
      win.chrome.webContents.on('ipc-message', handleIPC)
    }

    if (hostname in sitePermissions) {
      let check = checkPermission(sitePermissions[hostname]);
      switch (check) {
        case true: return callback(true)
        case false: return callback(false)
        case null:
        case undefined: // use default
      }
    }

    let check = checkPermission(defaultPermissions);

    if (check == undefined || check == null) return ask()
    else {
      writePermission(null); // writing explicit default
      return callback(check)
    }
  })
}

export function validateDomainByURL(url: string) {
  let { hostname } = URLParse(url);
  let certificate = certificateCache[hostname]

  if (certificate) {    
    if (certificate.errorCode == 0) return true;
    else return false
  }
  else return false
}

export const DEFAULT_PARTITION = 'persist:tab-default'
export const PRIVATE_PARTITION = 'tab-private'
export const NO_CACHE_PARTITION = 'no_cache'
export const NO_HEADERS_PARTITION = 'no_headers'
export const INTERNAL_PARTITION = 'internal'

app.once('ready', () => {
  session.fromPartition(NO_CACHE_PARTITION, { cache: false }) // create a non-cacheable session
  session.fromPartition(INTERNAL_PARTITION, { cache: false })
    .webRequest.onBeforeRequest({ urls: ['ftp://*/*', 'http://*/*', 'https://*/*'] }, (_, cb) => {
      cb({ cancel: true })
    })
  // chrome's session won't have access to any network resources for security reasons

  session.fromPartition(NO_HEADERS_PARTITION).webRequest.onBeforeSendHeaders((_, cb) => {
    cb({ requestHeaders: {} })
  })
  session.fromPartition(NO_HEADERS_PARTITION).webRequest.onHeadersReceived((_, cb) => {
    cb({ responseHeaders: {} })
  })

  registerSession(session.fromPartition(DEFAULT_PARTITION))
  registerSession(session.fromPartition(PRIVATE_PARTITION))

  const internalProtocol = session.fromPartition(INTERNAL_PARTITION).protocol;

  internalProtocol.registerFileProtocol('nereid', nereidProtocol)
  internalProtocol.registerStreamProtocol('get', getProtocol)

  internalProtocol.registerStringProtocol('n-res', async (req, respond) => {
    if (req.url.includes('..')) {
      respond({ error: -10 }) // Access denied
      return;
    }

    const parsed = URLParse(req.url)
    const theme = parsed.hostname;
    let color: string;

    switch (theme) {
      case 'dark': {
        color = '#ffffff'
        break;
      }
      case 'light': {
        color = '#000000'
        break;
      }
      case 'none': {
        color = '<THIS SHOULD NOT BE HERE - HOSTNAME IS "NONE">'
        break;
      }

      default: {
        console.warn(`The hostname of the n-res:// URL should be a valid theme. "${theme}" is not.`);
        respond({ error: -300 }) // Invalid URL
        return;
      }
    }

    let path = `${__dirname}/../browser/res/${parsed.pathname}`;

    try {
      let svg = await fs.readFile(path, 'utf-8');
      svg = svg.replaceAll('${color}', color)

      respond({
        data: svg,
        headers: {
          'Content-Type': "image/svg+xml"
        }
      });

    } catch (e) {
      respond({
        statusCode: 500,
        data: e.toString()
      })
    }
  })

  internalProtocol.registerFileProtocol('n-internal', async (req, respond) => {
    let parsed = URLParse(req.url);

    let finalPath = (parsed.hostname ?? '') + (parsed.pathname ?? '');

    if (finalPath.endsWith('/')) {
      finalPath = finalPath.slice(0, -1)
    }

    if (finalPath.endsWith('.svelte')) {
      finalPath += '.js';
    }

    respond({
      path: pathModule.normalize(`${__dirname}/../browser/out/${finalPath}`)
    })
  })
})