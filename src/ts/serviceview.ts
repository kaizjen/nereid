import { BrowserView, ipcMain } from "electron";
import { INTERNAL_PARTITION } from "./sessions";
import { TabWindow } from "./types";
import { control } from "./userdata";
import { isTabWindow } from "./windows";

type Module = 'targetURL'

/** Unsafe: may be null (or destroyed, or crashed), use `getServiceView()` instead */
export let serviceView: BrowserView & { attachedTo?: Electron.BrowserWindow };
/** Returns the ServiceView. If there's no ServiceView, initializes it. */
export function getServiceView() {
  if (!serviceView || !serviceView.webContents || serviceView.webContents.isDestroyed()) {
    console.warn("Initializing ServiceView on demand...");
    init();
  }
  if (serviceView.webContents.isCrashed()) {
    serviceView.webContents.reload();
  }
  return serviceView;
}

export async function init() {
  serviceView = new BrowserView({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      partition: INTERNAL_PARTITION,
      preload: `${__dirname}/preloads/internal.js`
    }
  });
  serviceView.setBackgroundColor('#0000');
  serviceView.attachedTo = null;
  await serviceView.webContents.loadURL('n-internal://serviceview/index.html')
  serviceView.webContents.startPainting();
  if (!control.options.service_view_devtools.value) return;
  serviceView.webContents.openDevTools({ mode: 'detach' })
}

async function sendBounds() {
  getServiceView();

  if (!serviceView.attachedTo) return;
  if (isTabWindow(serviceView.attachedTo)) {
    const bounds = await serviceView.attachedTo.currentTab.webContents.executeJavaScript(`
      ({ width: window.innerWidth, height: window.innerHeight })
    `).catch((e) => console.warn('[ServiceView] Error while getting content bounds', e));

    if (!bounds || !serviceView.attachedTo) return;

    serviceView.webContents.send('windowBounds', {
      ...bounds, x: 0, y: serviceView.attachedTo.chromeHeight
    })

  } else {
    serviceView.webContents.send('windowBounds', serviceView.attachedTo.getContentBounds())
  }
}

let previousModule = '';
function activateServiceView(window: Electron.BrowserWindow, module: Module, data?: object): Promise<void> {
  getServiceView();
  if (previousModule != module) {
    serviceView.setBounds({ width: 1, height: 1, x: 0, y: 0 })
  }

  window.addBrowserView(serviceView);
  window.setTopBrowserView(serviceView)
  serviceView.attachedTo = window;
  serviceView.webContents.send('activate', module, data)
  sendBounds()

  previousModule = module;

  return new Promise(resolve => {
    getServiceView().webContents.ipc.once('dataRecieved', () => resolve())
  })
}

function cleanup() {
  serviceView.attachedTo.removeBrowserView(serviceView);
  serviceView.attachedTo.off('resized', sendBounds)
  serviceView.attachedTo = null;
}

function deactivateServiceView(hardReset: boolean, window?: Electron.BrowserWindow) {
  if (getServiceView().attachedTo != window) return false;
  if (serviceView.attachedTo == null) return false;

  serviceView.webContents.send('reset', hardReset)
  previousModule = '';
  if (hardReset) {
    cleanup()

  } else {
    serviceView.webContents.ipc.once('resetRecieved', () => {
      if (getServiceView().attachedTo != window) return;
      if (serviceView.attachedTo == null) return;
      cleanup()
    })
  }

  return true;
}

export function showTargetURL(win: TabWindow, url: string) {
  if (!control.options.enable_service_view.value) return;
  if (!url) {
    return deactivateServiceView(false, win)
  }
  activateServiceView(win, 'targetURL', { url })
}

ipcMain.on('updateServiceViewBounds', (e, bounds) => {
  if (e.sender != serviceView?.webContents) return console.warn("Unexpected updateServiceViewBounds message");

  try {
    serviceView.setBounds(bounds);

  } catch (error) {
    console.warn('Unable to set ServiceView bounds:', error)
    deactivateServiceView(true);
  }
})