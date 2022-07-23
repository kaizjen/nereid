// Handles net errors. It's just so large i needed to put it in another file

import { ipcMain, WebContents, WebFrameMain, webFrameMain } from "electron";
import * as fs from 'fs'
import { t } from "./i18n";
import $ from "./vars";
import { control } from "./userdata";

const URLParse = $.URLParse;

export function handleNetError(
  webc: WebContents, _e, errCode: number, errorDescription: string,
  url: string, isMainFrame: boolean, framePID: number, frameRID: number
) {
  if (errCode == -3 || errCode == -1) { return null; } // The load was cancelled by user or an async API isn't done yet

  console.log('net error:', errCode, errorDescription);
  let frame: WebFrameMain;
  try {
    frame = webFrameMain.fromId(framePID, frameRID);
    
  } catch (e) {
    // sometimes throws an error, ignore
  }

  let errInfo = {
    info: '',
    detail: '',
    code: errorDescription,
    moreJS: null
  };
  let parsed = URLParse(url);

  function $t(key: string, data?: {}) {
    let translation = t(`net-error.${key}`, { ...parsed, path: parsed.pathname ?? url, url, ...data });
    if (translation == `net-error.${key}`) {
      return '';
      
    } else {
      return translation.replaceAll('\n', '\\n')
    }
  }

  if (-99 <= errCode && errCode <= -1) {
    errInfo.info = $t('common.local.0')
    errInfo.detail = $t('common.local.1')

  } else if (-199 <= errCode && errCode <= -100) {
    errInfo.info = $t('common.connection.0')
    errInfo.detail = $t('common.connection.1')

  } else if (-299 <= errCode && errCode <= -200) {
    errInfo.info = $t('common.certificate.0')
    errInfo.detail = $t('common.certificate.1')

  } else if (-399 <= errCode && errCode <= -300) {
    errInfo.info = $t('common.http.0')
    errInfo.detail = $t('common.http.1')

  } else if (-499 <= errCode && errCode <= -400) {
    errInfo.info = $t('common.cache.0')
    errInfo.detail = $t('common.cache.1') +
      "<a id='reload-nocache' class='btn'>" + $t('common.cache.2') + "</a>"
    if (isMainFrame) {
      errInfo.moreJS = `document.getElementById('reload-nocache').onclick = () => { PostMainMessage('reloadIgnoringCache') }`
      function onMessagePosted(e) {
        if (e.senderFrame == frame) {
          webc.reloadIgnoringCache();
          ipcMain.off('chrome-error:reloadIgnoringCache', onMessagePosted)
        }
      }
      ipcMain.on('chrome-error:reloadIgnoringCache', onMessagePosted)
    }

  } else {
    errInfo.info = $t('common.unknown.0')
    errInfo.detail = $t('common.unknown.1')

  }

  // now we get more specific
  switch (errCode) {
    case -105:
      errInfo.info = $t('noSiteAccess.0')
      errInfo.detail = $t('noSiteAccess.1')
      break;
    case -6:
      errInfo.info = $t('noFileAccess.0')
      errInfo.detail = $t('noFileAccess.1')
      break;
    case -8:
      errInfo.info = $t('fileTooBig.0')
      errInfo.detail = $t('fileTooBig.1')
      break;
    case -10:
      errInfo.info = $t('denied.0')
      errInfo.detail = $t('denied.1')
      break;
    case -19:
      errInfo.info = $t('virus.0')
      errInfo.detail = $t('virus.1')
      break;
    case -20:
      errInfo.info = $t('requestBlocked.0')
      errInfo.detail = $t('requestBlocked.1') + control.options.disallow_http?.value ?
        "<br>You have a control option disallow_http enabled. It's likely that the request was blocked because of this option." : ""
      break;
    case -21:
      errInfo.info = $t('netChange.0')
      errInfo.detail = $t('netChange.1')
      break;
    case -27:
      errInfo.info = $t('blockedByResponse.0')
      errInfo.detail = $t('blockedByResponse.1')
      break;
    case -30:
      errInfo.info = $t('blockedByCSP.0')
      errInfo.detail = $t('blockedByCSP.1')
      break;
    case -100:
      errInfo.info = $t('closed.0')
      errInfo.detail = $t('closed.1')
      break;
    case -101:
      errInfo.info = $t('reset.0')
      errInfo.detail = $t('reset.1')
      break;
    case -102:
      errInfo.info = $t('refused.0')
      errInfo.detail = $t('refused.1')
      break;
    case -104:
      errInfo.info = $t('failed.0')
      errInfo.detail = $t('failed.1')
      break;
    case -106:
      errInfo.info = $t('internetLost.0')
      errInfo.detail = $t('internetLost.1')
      break;
    case -107:
      errInfo.info = $t('SSL.0')
      errInfo.detail = $t('SSL.1')
      break;
    case -108:
      errInfo.info = $t('invalidIP.0')
      errInfo.detail = $t('invalidIP.1')
      break;
    case -109:
      errInfo.info = $t('unreachableIP.0')
      errInfo.detail = $t('unreachableIP.1')
      break;
    case -113:
      errInfo.info = $t('noHTTPS.0')
      errInfo.detail = $t('noHTTPS.1')
      break;
    case -300:
      errInfo.info = $t('invalidURL.0')
      errInfo.detail = $t('invalidURL.1')
      break;
  }

  frame.executeJavaScript('document.documentElement.innerHTML = `' + fs.readFileSync('src/browser/nereid/net-err-template.html', 'utf-8').replaceAll('`', '\\`') + '`');
  frame.executeJavaScript(`document.getElementById('info').innerHTML = "${errInfo.info.replaceAll('"', '\\"')}"`);
  frame.executeJavaScript(`document.getElementById('detail').innerHTML = "${errInfo.detail.replaceAll('"', '\\"')}"`);
  frame.executeJavaScript(`document.getElementById('code').innerHTML = "${errInfo.code.replaceAll('"', '\\"')}"`);
  errInfo.moreJS ? frame.executeJavaScript(errInfo.moreJS) : null;
}
