// This is the entry point of the application.
// It mostly ties everything together

import { app, dialog, Menu, nativeImage, nativeTheme, session, Tray } from "electron";
import { getAllTabWindows, newWindow } from "./windows";
import * as ipcManager from "./ipc";
import * as userData from "./userdata";
import { DEFAULT_PARTITION } from "./sessions";
import * as thisProcess from "./process";
import * as pathModule from "path"
import $ from "./vars";
import type { TabOptions } from "./types";
import { t, data } from "./i18n";

global.isStarting = true; // some things, like history, shouldn't work while the app is still starting

require('tls').DEFAULT_ECDH_CURVE = 'auto' // fix handshake error

app.userAgentFallback = app.userAgentFallback
  .replace(/nereid\/.*? /, '')    // remove the 'nereid/x.y.z'
  .replace(/Electron\/.*? /, '')    // and 'Electron/17.x.y' strings from the user agent string
  + ` Nereid/${app.getVersion()}` // and add the correct Nereid string at the end
;
app.enableSandbox()


app.on('before-quit', () => {
  session.fromPartition(DEFAULT_PARTITION).flushStorageData();
  userData.lastlaunch.set({ exitedSafely: true })
})

if (userData.lastlaunch.get().launchFailed) {
  global.isSafeMode = true;
  dialog.showErrorBox("Oh no!",
    "Nereid has failed to launch last time. So now it has launched in safe mode, which means all extensions have been\
 disabled, and the control options (nereid://control) were ignored. Restart Nereid to exit safe mode.")

} else {
  global.isSafeMode = false;

  if (app.isPackaged && !userData.lastlaunch.get().exitedSafely) {
    dialog.showErrorBox("Oh no!", "Nereid's work ended abruptly last time. There might be some unsaved data.")
  }

  let oldConfig = userData.config.get()

  userData.config.listenCall((c) => {
    if (c.ui.theme != nativeTheme.themeSource) {
      nativeTheme.themeSource = c.ui.theme;
      getAllTabWindows().forEach(w => {
        w.chrome.webContents.send('config', 'theme', c.ui.theme)
      })
    }

    if (c.ui.defaultZoomFactor != oldConfig.ui.defaultZoomFactor) {
      getAllTabWindows().forEach(w => {
        w.tabs.forEach(t => {
          if (t.webContents.zoomFactor == oldConfig.ui.defaultZoomFactor) {
            // changes the zoom only if it hasn't been changed before
            t.webContents.zoomFactor = c.ui.defaultZoomFactor;
          }
        })
      })
    }

    if (c.behaviour.a11yEnabled !== oldConfig.behaviour.a11yEnabled) {
      app.accessibilitySupportEnabled = c.behaviour.a11yEnabled ?? app.accessibilitySupportEnabled;
    }

    oldConfig = c;
  })
}

userData.lastlaunch.set({ launchFailed: true })

app.on('ready', () => {
  ipcManager.init();

  if (userData.config.get().welcomePhase <= 4) {
    newWindow([ { url: 'nereid://welcome' } ])

  } else {
    let { onStart } = userData.config.get().behaviour;
    let { windows } = userData.lastlaunch.get()
  
    if (windows.length > 0 && windows[0].length > 0 && onStart.type == 'last-tabs') {
      windows.forEach(tabs => {
        let allOptions: TabOptions[] = tabs
          .filter(t => t.title && t.url) // sometimes the title and url are empty strings; TODO: fix that somehow
          .map((t, i) => {
            return {
              url: t.url,
              background: i != 0, // only select the first tab
              initialFavicon: t.faviconURL
            }
          });
        if (allOptions.length < 1) allOptions = [{ url: $.newTabUrl }]
  
        newWindow(allOptions);
      })
  
    } else if (onStart.type == 'page') {
      newWindow([ { url: onStart.url } ])
  
    } else {
      newWindow([ { url: $.newTabUrl } ])
    }
  }

  userData.lastlaunch.set({ launchFailed: false, exitedSafely: false })
  thisProcess.init()
  global.isStarting = false;
})

let tray: Tray;

app.on('window-all-closed', (e: Event) => {
  e.preventDefault();
  if (process.platform == 'darwin') return;

  if (!userData.control.options.do_not_quit.value) {
    app.quit()

  } else {
    let img = nativeImage.createFromPath(
      pathModule.join(__dirname, 
        process.platform == 'win32' ? '../../nereid.ico' : '../../nereid.png'
      )
    );

    tray = new Tray(img);
    
    tray.setToolTip(t('menu.tray.state-ready', data()))
    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: t('name'),
        enabled: false
      },
      { type: 'separator' },
      {
        label: t('menu.common.newWindow'),
        click() {
          newWindow([{ url: $.newTabUrl }])
          tray.destroy()
        }
      },
      {
        label: t('menu.common.quit', data()),
        click() {
          app.quit()
        }
      }
    ]));

    tray.on('double-click', () => {
      newWindow([{ url: $.newTabUrl }]);
      tray.destroy()
    })
    tray.on('click', () => {
      tray.popUpContextMenu()
    })
    tray.on('right-click', () => {
      tray.popUpContextMenu()
    })
  }
})

