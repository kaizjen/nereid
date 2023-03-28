// Manages all menu stuff

import { app, clipboard, dialog, ipcMain, Menu, MenuItem, session } from "electron";
import { Bookmark, RealTab, Tab, TabGroup, TabOptions, TabWindow } from "./types";
import { isTabWindow, newWindow, setCurrentTabBounds, newDialogWindow } from './windows'
import { bookmarks, config, control, downloads } from './userdata'
import * as pathModule from "path";
import * as fs from "fs"
import { asRealTab, closeTab, createTab, dividePanes, moveTab, openClosedTab, selectTab, setMutedTab, toRealTab, undividePanes } from './tabs'
import $ from './common'
import fetch from "electron-fetch";
import type { Response } from "electron-fetch"
import { DEFAULT_PARTITION, PRIVATE_PARTITION } from "./sessions";
import { t } from "./i18n";
import { kill } from "./process";
import { createTabGroup, getTabGroupByTab, removeTabFromGroup } from "./tabgroups";

function obtainWebContents(win: Electron.BrowserWindow | TabWindow) {
  return isTabWindow(win) ? win.currentTab.webContents : win.webContents
}

function zoom(direction: 'in' | 'out') {
  return function (_, win) {
    let wc = obtainWebContents(win)
    wc.emit('zoom-changed', {}, direction)
  }
}

async function exists(path: string) {
  try {
    await fs.promises.access(path);
    return true;

  } catch (e) {
    return false;
  }
}

function toggleDevTools(wc: Electron.WebContents) {
  if (wc.isDevToolsOpened()) {
    wc.closeDevTools();

  } else {
    // TODO: remebmer the last state of DevTools, instead of forcing 'bottom'. How do we get the state though?
    wc.openDevTools({ mode: 'bottom' })
  }
}

function focusChrome(win: TabWindow) {
  win.chrome.webContents.focus()
}

const SEPARATOR: Electron.MenuItemConstructorOptions = {
  type: 'separator'
}

const newTabInPanes: Electron.MenuItemConstructorOptions[] = [
  {
    label: t('menu.tabs.newTabInLeftPane'),
    click(_m, win) {
      if (!isTabWindow(win)) return;

      let newTab = createTab(win, {
        url: $.newTabUrl,
        position: win.tabs.indexOf(win.currentTab),
        background: true
      })
      dividePanes(win, { left: newTab, right: win.currentTab })
      selectTab(win, { tab: newTab })

      focusChrome(win)
    },
    accelerator: 'CmdOrCtrl+Alt+Left',
  },
  {
    label: t('menu.tabs.newTabInRightPane'),
    click(_m, win) {
      if (!isTabWindow(win)) return;

      let newTab = createTab(win, {
        url: $.newTabUrl,
        position: win.tabs.indexOf(win.currentTab) + 1,
        background: true
      })
      dividePanes(win, { left: win.currentTab, right: newTab })
      selectTab(win, { tab: newTab })

      focusChrome(win)
    },
    accelerator: 'CmdOrCtrl+Alt+Right',
  },
]
const openNearbyTabsInPanes: Electron.MenuItemConstructorOptions[] = [
  {
    label: t('menu.tabs.openLeftTabIn'),
    submenu: [
      {
        label: t('menu.tabs.openTabIn.leftPane'),
        accelerator: "CmdOrCtrl+Alt+,",
        click(_, win) {
          if (!isTabWindow(win)) return;
          if (win.tabs.indexOf(win.currentTab) - 1 < 0) return;

          dividePanes(win, {
            left: win.tabs[win.tabs.indexOf(win.currentTab) - 1],
            right: win.currentTab
          })
        }
      },
      {
        label: t('menu.tabs.openTabIn.rightPane'),
        click(_, win) {
          if (!isTabWindow(win)) return;
          if (win.tabs.indexOf(win.currentTab) - 1 < 0) return;

          dividePanes(win, {
            left: win.currentTab,
            right: win.tabs[win.tabs.indexOf(win.currentTab) - 1]
          })
        }
      },
    ]
  },
  {
    label: t('menu.tabs.openRightTabIn'),
    submenu: [
      {
        label: t('menu.tabs.openTabIn.leftPane'),
        click(_, win) {
          if (!isTabWindow(win)) return;
          if (!win.tabs[win.tabs.indexOf(win.currentTab) + 1]) return;

          dividePanes(win, {
            left: win.tabs[win.tabs.indexOf(win.currentTab) + 1],
            right: win.currentTab
          })
        }
      },
      {
        label: t('menu.tabs.openTabIn.rightPane'),
        accelerator: "CmdOrCtrl+Alt+.",
        click(_, win) {
          if (!isTabWindow(win)) return;
          if (!win.tabs[win.tabs.indexOf(win.currentTab) + 1]) return;

          dividePanes(win, {
            left: win.currentTab,
            right: win.tabs[win.tabs.indexOf(win.currentTab) + 1]
          })
        }
      },
    ]
  }
]

const tabs_windows: Electron.MenuItemConstructorOptions[] = [
  {
    label: t('menu.common.newTab'),
    click(_m, win) {
      if (!isTabWindow(win)) return;

      createTab(win, {
        url: $.newTabUrl
      })
      focusChrome(win)
    },
    accelerator: 'CmdOrCtrl+T',
    id: 'new-tab'
  },
  {
    label: t('menu.common.newPrivateTab'),
    click(_m, win) {
      if (!isTabWindow(win)) return;

      createTab(win, {
        url: 'nereid://private',
        private: true
      })
      focusChrome(win)
    },
    accelerator: 'CmdOrCtrl+P',
    id: 'new-tab-p'
  },
  SEPARATOR,
  ...newTabInPanes,
  SEPARATOR,
  {
    label: t('menu.panes.close'),
    click(_m, win) {
      if (!isTabWindow(win)) return;
      if (!win.currentPaneView) return;

      undividePanes(win, win.currentPaneView)
    },
    accelerator: 'CmdOrCtrl+Alt+W',
    id: 'close-panes'
  },
  {
    label: t('menu.tabs.close'),
    click(_m, win) {
      if (!isTabWindow(win)) return;

      closeTab(win, { tab: win.currentTab })
    },
    accelerator: 'CmdOrCtrl+W',
    id: 'close-tab'
  },
  {
    label: t('menu.tabs.openClosed'),
    click(_m, win) {
      if (!isTabWindow(win)) return;

      openClosedTab(win)
    },
    accelerator: 'CmdOrCtrl+Shift+T',
    id: 'open-closed'
  },
  SEPARATOR,
  {
    label: t('menu.common.newWindow'),
    click() {
      let url;
      let onStart = config.get().behaviour.onStart
      if (onStart.type == 'page') {
        url = onStart.url
      } else {
        url = $.newTabUrl
      }
      newWindow([{ url }]);
    },
    accelerator: 'CmdOrCtrl+N',
    id: 'new-win'
  },
  {
    label: t('menu.openFile'),
    accelerator: 'CmdOrCtrl+O',
    async click(_m, win) {
      if (!isTabWindow(win)) return;

      let result = await dialog.showOpenDialog(win, {
        title: t('menu.openFile'),
        properties: ['openFile']
      })
      result.filePaths.forEach(pth => {
        pth = pth.replaceAll('\\', '/');
        pth = 'file://' + pth;

        createTab(win, {
          url: pth,
          private: win.currentTab.private
        })
      })
    }
  },
  {
    label: t('menu.window.close'),
    click(_m, win) {
      win.close()
    },
    id: 'close-win'
  }
]
const tools: Electron.MenuItemConstructorOptions[] = [
  {
    label: t('common.downloads'),
    click(_, win) {
      if (!isTabWindow(win)) return;

      if (win.currentTab.webContents.getURL().startsWith('nereid://downloads')) return;
      createTab(win, {
        url: 'nereid://downloads'
      })
    },
    id: 'dls'
  },
  /* {
    label: t('common.extensions'),
    click(_, win) {
      if (!isTabWindow(win)) return;

      if (win.currentTab.webContents.getURL().startsWith('nereid://extensions')) return;
      createTab(win, {
        url: 'nereid://extensions'
      })
    },
    id: 'exts'
  }, */
  {
    label: t('common.bookmarks'),
    click(_, win) {
      if (!isTabWindow(win)) return;

      if (win.currentTab.webContents.getURL().startsWith('nereid://bookmarks')) return;
      createTab(win, {
        url: 'nereid://bookmarks'
      })
    },
    id: 'bookms'
  },
  {
    label: t('common.settings'),
    click(_, win) {
      if (!isTabWindow(win)) return;

      if (win.currentTab.webContents.getURL().startsWith('nereid://settings')) return;
      createTab(win, {
        url: 'nereid://settings'
      })
    },
    id: 'settings'
  }
]
const about: Electron.MenuItemConstructorOptions = {
  label: t('menu.about'),
  click(_, w) {
    if (!isTabWindow(w)) return;

    const win = w as TabWindow;
    createTab(win, {
      url: 'nereid://about'
    })
  }
}
const view: Electron.MenuItemConstructorOptions[] = [
  {
    label: t('menu.fullscreen'),
    accelerator: 'F11',
    click(_m, win) {
      if (!isTabWindow(win)) return;

      if (!win.isFullScreen()) {
        win.setFullScreen(true);
        const { width, height } = win.getContentBounds()
        win.currentTab.setBounds({ x: 0, y: 0, width, height })

      } else {
        win.setFullScreen(false);
        setCurrentTabBounds(win)
      }
    }
  },
  {
    label: t('menu.zoom.in'),
    accelerator: 'CmdOrCtrl+numadd',
    registerAccelerator: false, // alredy registered
    click: zoom('in')
  },
  {
    label: t('menu.zoom.out'),
    accelerator: 'CmdOrCtrl+-',
    registerAccelerator: false, // alredy registered
    click: zoom('out')
  },
  {
    label: t('menu.zoom.0'),
    accelerator: 'CmdOrCtrl+num0',
    click(_m, win) {
      if (!isTabWindow(win)) return;

      win.currentTab.webContents.zoomFactor = config.get().ui.defaultZoomFactor;
      win.chrome.webContents.send('zoomUpdate', win.currentTab.webContents.zoomFactor)
    }
  }
]
const findInPage: Electron.MenuItemConstructorOptions = {
  label: t('menu.findInPage'),
  accelerator: 'CmdOrCtrl+F',
  click(_, win) {
    if (!isTabWindow(win)) return;

    win.chrome.webContents.send('toggleFindInPage')
    win.chrome.webContents.focus();
  }
}
export const appMenu = Menu.buildFromTemplate([
  {
    label: t('name'),
    submenu: [
      about,
      tools.find(i => i.id == 'settings'),
      ...(process.platform == 'darwin' ? [
        SEPARATOR,
        {
          role: 'hide' as const
        },
        {
          role: 'hideOthers' as const
        },
        {
          role: 'unhide' as const
        },
        SEPARATOR,
        {
          role: 'services' as const
        },
        SEPARATOR
      ] : []),
      {
        label: t('menu.common.quit'),
        click() {
          app.quit()
        }
      },

      // HIDDEN ITEMS
      // These items are only used for app-wide keyboard shortcuts.

      {
        label: 'devtools-hidden',
        accelerator: 'F12',
        click(_, win) {
          let wc = obtainWebContents(win)
          toggleDevTools(wc)
        },
        visible: false
      },
      {
        label: 'zoomin-num-hidden',
        accelerator: 'CmdOrCtrl+numadd',
        click: zoom('in'),
        visible: false
      },
      {
        label: 'zoomin-std-eq-hidden',
        // when you press the plus not on the numpad, but on the other keyboard, you actually press the equal sign!
        accelerator: 'CmdOrCtrl+=',
        click: zoom('in'),
        visible: false
      },
      {
        label: 'zoomin-std-plus-hidden',
        accelerator: 'CmdOrCtrl++',
        click: zoom('in'),
        visible: false
      },
      {
        label: 'zoomout-num-hidden',
        accelerator: 'CmdOrCtrl+numsub',
        click: zoom('out'),
        visible: false
      },
      {
        label: 'zoomout-std-hidden',
        accelerator: 'CmdOrCtrl+-',
        click: zoom('out'),
        visible: false
      },
      {
        label: "f5-reload-hidden",
        visible: false,
        accelerator: "F5",
        click(_, win) {
          let wc = obtainWebContents(win)
          wc.reload()
        }
      },
      {
        label: 'esc-exit-fullscreen-hidden',
        visible: false,
        accelerator: 'Escape',
        click(_, win) {
          if (!isTabWindow(win)) return;

          win.setFullScreen(false);
          setCurrentTabBounds(win);
        }
      },
      {
        label: 'switch-panes-hidden',
        visible: false,
        accelerator: 'CmdOrCtrl+Alt+S',
        click(_, win) {
          if (!isTabWindow(win)) return;
          if (!win.currentPaneView) return;

          dividePanes(win, {
            left: win.currentPaneView.rightTab,
            right: win.currentPaneView.leftTab
          })
        }
      }
    ]
  },
  {
    label: t('menu.appMenu.file'),
    submenu: [
      ...tabs_windows
    ]
  },
  {
    label: t('menu.appMenu.edit'),
    submenu: [
      { role: 'undo', accelerator: 'CmdOrCtrl+Z' },
      { role: 'redo', accelerator: 'CmdOrCtrl+Y' },
      SEPARATOR,
      { role: 'cut', accelerator: 'CmdOrCtrl+X' },
      { role: 'copy', accelerator: 'CmdOrCtrl+C' },
      { role: 'paste', accelerator: 'CmdOrCtrl+V' },
      { role: 'pasteAndMatchStyle', accelerator: 'CmdOrCtrl+Shift+V' },
      { role: 'delete', accelerator: 'Delete' },
      { role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
      SEPARATOR,
      findInPage,
      ...(app.isEmojiPanelSupported() ? [
        SEPARATOR,
        {
          label: t('menu.emojiPanel'),
          accelerator: 'Meta+.',
          registerAccelerator: false,
          click() {
            app.showEmojiPanel();
          }
        }
      ] : [])
    ]
  },
  {
    label: t('menu.appMenu.view'),
    submenu: view
  },
  {
    label: t('menu.tools'),
    submenu: [
      {
        label: t('common.history'),
        click(_, win) {
          if (!isTabWindow(win)) return;

          if (win.currentTab.webContents.getURL().startsWith('nereid://history')) return;
          createTab(win, {
            url: 'nereid://history'
          })
        }
      },
      ...tools,
      SEPARATOR,
      {
        label: t('menu.devTools'),
        accelerator: 'CmdOrCtrl+Shift+I',
        click(_, win) {
          let wc = obtainWebContents(win)
          toggleDevTools(wc);
        }
      },
      {
        label: t('menu.taskManager'),
        accelerator: 'Shift+Escape',
        click() {
          newDialogWindow({ type: 'taskmanager', options: { width: 650, resizable: true, minimizable: true } })
        }
      },

    ]
  },
  {
    label: t('menu.appMenu.tab'),
    submenu: [
      {
        label: t('navigation.reload'),
        accelerator: "CmdOrCtrl+R",
        click(_, win) {
          let wc = obtainWebContents(win)
          wc.reload()
        }
      },
      {
        label: t('menu.tabs.hardReload'),
        accelerator: "CmdOrCtrl+Shift+R",
        click(_, win) {
          let wc = obtainWebContents(win)
          wc.reloadIgnoringCache()
        }
      },
      SEPARATOR,
      {
        label: t('menu.tabs.onePageUp'),
        accelerator: "CmdOrCtrl+Backspace",
        click(_, win) {
          let wc = obtainWebContents(win);
          const url = wc.getURL();
          if (!url.startsWith('http')) return;

          const parsed = $.URLParse(url);
          const newPathname = pathModule.posix.dirname(parsed.pathname);
          const newURL = (new URL(newPathname, parsed.href)).href;
          if (newURL == parsed.href) return;
          wc.loadURL(newURL);
        }
      },
      SEPARATOR,
      ...newTabInPanes,
      ...openNearbyTabsInPanes,
      SEPARATOR,
      tabs_windows.find(i => i.id == 'close-panes'),
      tabs_windows.find(i => i.id == 'close-tab')
    ]
  },
  {
    label: t('menu.appMenu.window'),
    submenu: [
      { role: 'minimize' },
      {
        label: t('menu.window.maximize') + '/' + t('menu.window.unmaximize'),
        click(_m, win) {
          if (win.isMaximized()) win.unmaximize()
          else win.maximize()
        }
      },
      tabs_windows.find(i => i.id == 'close-win'),
    ]
  }
])

Menu.setApplicationMenu(appMenu)


export function showAppMenu() {
  Menu.getApplicationMenu().popup();
}

export async function displayOptions(win: TabWindow, { x, y }) {
  let multiplier /* markiplier */ = config.get().ui.chromeZoomFactor

  let menu = Menu.buildFromTemplate([
    ...tabs_windows,
    SEPARATOR,
    findInPage,
    SEPARATOR,
    ...view,
    {
      label: t('menu.zoom.info', { zoom: win.currentTab.webContents.zoomFactor * 100 }),
      enabled: false
    },
    SEPARATOR,
    {
      label: t('common.history'),
      submenu: [
        {
          label: t('common.history'),
          click(_, win) {
            if (!isTabWindow(win)) return;

            if (win.currentTab.webContents.getURL().startsWith('nereid://history')) return;
            createTab(win, {
              url: 'nereid://history'
            })
          }
        },
        SEPARATOR,
        {
          label: t('menu.recentlyClosedTabs'),
          enabled: false
        },
        ...win.recentlyClosed.map((tab, i) => ({
          label: tab.lastTitle,
          sublabel: tab.lastURL,
          click() {
            console.log('oct', win.recentlyClosed, i, tab);
            openClosedTab(win, i)
          }
        }))
      ]
    },
    ...tools,
    SEPARATOR,
    {
      label: t('menu.common.quit'),
      click() {
        app.quit()
      }
    }
  ]);

  x = Math.round(x * multiplier);
  y = Math.round(y * multiplier);
  // if i dont multiply these by chromeZoomFactor, the menu will be way off
  // i think it's caused by the Menu.popup(), because, unlike BrowserView.setBounds() it doesn't automatically adjust for the zoom factor
  // (which makes sense, since it's not the zoom factor of the window, but the zoom factor of a BrowserView on top of it)

  menu.popup({ x, y, window: win });
  menu.on('menu-will-close', () => {
    // sending the input event so the chrome will update its styles and the button won't stay 'hovered'
    // basically if we don't update the thing, chrome's webContents will think the mouse is still hovering over the menu button
    win.chrome.webContents.sendInputEvent({
      type: 'mouseMove',
      x: 0, y: 0
    })
  })
}

function createContextTabF(win: TabWindow, tab: Tab) {
  return function createContextTab(opts: TabOptions) {
    if (!win) return;

    const group = getTabGroupByTab(tab);
    let groupID = null;
    if (group) groupID = group.id;

    return createTab(win, Object.assign({
      private: tab.private,
      position: win.tabs.indexOf(tab) + 1 || win.tabs.length,
      groupID
    }, opts))
  }
}

export async function showContextMenu(win: TabWindow, tab: RealTab, opts: Electron.ContextMenuParams) {
  const createContextTab = createContextTabF(win, tab)

  let menu = new Menu();

  function addItem(obj: Electron.MenuItemConstructorOptions) {
    menu.append(new MenuItem(obj))
  }
  /**
   * Wrapper around the t(), adds "menu.contextMenu"
   */
  function $t(str: string, obj?: {}) {
    return t(`menu.contextMenu.${str}`, obj)
  }

  /** Executes code on the selected element, with variable `element` pointing to it.
   * Bypasses iframes and open shadow roots, but fails on closed ones. */
  async function executeCodeOnElement(frame: Electron.WebFrameMain, code: string) {
    let x = opts.x;
    let y = opts.y;
    if (frame != frame.top && frame.top != null) {
      // x & y in the string code are the absolute coordinates of the ctx menu;
      // we subtract the starting coords of the iframe to get the coordinates relative to the iframe's document.
      let { newX, newY } = await executeCodeOnElement(frame.top, `(function(){
        const { x: iframeX, y: iframeY } = element.getBoundingClientRect();
        return { newX: x - iframeX, newY: y - iframeY }
      })()`) as any
      x = newX;
      y = newY;
    }
    return await frame.executeJavaScript(`(function(){
      const x = ${x};
      const y = ${y};
      function findElement(root) {
        const element = root.elementFromPoint(x, y);
  
        if (element.shadowRoot) {
          findElement(element.shadowRoot)
  
        } else {
          return ${code}
        }
      }
      return findElement(document)
    })()`)
  }

  if (opts.altText) {
    addItem({ label: opts.altText, enabled: false })
    addItem(SEPARATOR)
  }

  if (opts.selectionText) {
    let searchConfig = config.get().search;
    let selectedSE = searchConfig.available[searchConfig.selectedIndex]

    if ($.isValidURL(opts.selectionText)) {
      let linkText = opts.selectionText;

      if (!linkText.startsWith('http:') && !linkText.startsWith('https:')) {
        linkText = `http://${linkText}`
      }

      addItem({
        label: $t('openLink'), sublabel: linkText,
        click() {
          createContextTab({ url: linkText })
        }
      })
    }
    addItem({ label: $t('search', { engine: selectedSE.name }), click() {
      createContextTab({ url: selectedSE.searchURL.replaceAll('%s', encodeURIComponent(opts.selectionText)) })
    } })
    addItem({ label: $t('copy'), role: 'copy', accelerator: 'CmdOrCtrl+C' })
    if (opts.editFlags.canCut) {
      addItem({ label: $t('cut'), role: 'cut', accelerator: 'CmdOrCtrl+X' })
    }
    if (opts.editFlags.canDelete) {
      addItem({ label: $t('delete'), role: 'delete', accelerator: 'Delete' })
    }
    addItem(SEPARATOR)
  }
  if (opts.editFlags.canPaste) {
    addItem({ label: $t('paste'), role: 'paste', accelerator: 'CmdOrCtrl+V' })
    addItem({ label: $t('pasteAndMatchStyle'), role: 'pasteAndMatchStyle', accelerator: 'CmdOrCtrl+Shift+V' })
    addItem(SEPARATOR)
  }

  if (opts.linkURL) {
    addItem({ label: $t('open.newTab'), click() { createContextTab({ url: opts.linkURL }) } })
    addItem({ label: $t('open.newPrivateTab'), click() { createContextTab({ url: opts.linkURL, private: true }) } })
    addItem({ label: $t('open.newWindow'), click() { newWindow([{ url: opts.linkURL, private: tab.private }]) } })
    addItem({ label: $t('open.thisTab'), click() { tab.webContents.loadURL(opts.linkURL) } })
    addItem(SEPARATOR)
    addItem({ label: $t('open.leftPane'), click() {
      const newTab = createContextTab({ url: opts.linkURL, background: true })
      dividePanes(win, { left: newTab, right: tab })
    } })
    addItem({ label: $t('open.rightPane'), click() {
      const newTab = createContextTab({ url: opts.linkURL, background: true })
      dividePanes(win, { left: tab, right: newTab })
    } })
    addItem(SEPARATOR)
    addItem({ label: $t('copyLink'), click() { clipboard.writeText(opts.linkURL) } })

    addItem(SEPARATOR)
  }

  if (opts.mediaType == 'image') {
    if (opts.srcURL) {
      addItem({ label: $t('image.viewInNewTab'), click() { createContextTab({ url: opts.srcURL }) } })
      addItem({ label: $t('image.copyURL'), click() { clipboard.writeText(opts.srcURL) } })
      addItem(SEPARATOR)
  }
    addItem({ label: $t('image.saveAs'), async click() {
      let response: Response;
      try {
        response = await fetch(opts.srcURL, {
          session: session.fromPartition(tab.private ? PRIVATE_PARTITION : DEFAULT_PARTITION),
          useSessionCookies: true
        });
        // Unfortunately, the image will be fetched again, and if the server retrns another image, then oops.
        // There's probably a way to do this with clipboard, but it's too messy even for me.
        
      } catch (e) {
        console.error(`Fetching image failed:`, e);
        dialog.showErrorBox($t('image.saving.error-title'), `Error: ${e}.`)
        return;
      }

      let contentType = response.headers.get('content-type') ?? '';
      let extension = contentType.slice(6) || pathModule.extname(opts.srcURL).slice(1);

      if (extension == '' || (contentType && !contentType.startsWith('image'))) {
        // maybe don't throw here?
        console.error(`Content-Type is not an image, or the image has no extension`);
        dialog.showErrorBox($t('image.saving.error-title'), $t('image.saving.error-notAnImage'))
        return;
      }

      let result = await dialog.showSaveDialog(win || null, {
        title: $t('image.saving.dialog'),
        properties: ['showHiddenFiles', 'createDirectory'],
        defaultPath: pathModule.join(config.get().behaviour.downloadPath || app.getPath('downloads'), `image.${extension}`)
      });

      if (result.canceled) return;

      if (!response.ok) {
        console.error(`Fetching image failed: ${response.statusText} (${response.status})`);
        dialog.showErrorBox($t('image.saving.error-title'), `Failed: ${response.status} - ${response.statusText}`)
        return;
      }

      let buf = await response.buffer();

      if (await exists(result.filePath)) {
        console.error(`Saving image failed: File with that name already exists`);
        dialog.showErrorBox($t('image.saving.error-title'), $t('image.saving.error-alreadyExists'))
        return;
        
      } else {
        await fs.promises.writeFile(result.filePath, buf);
        let dlData = await downloads.get();
        dlData.unshift({
          url: opts.srcURL,
          urlChain: [ opts.srcURL ],
          savePath: result.filePath,
          status: 'completed',
          offset: buf.byteLength,
          length: buf.byteLength
        })
        await downloads.set(dlData)
      }

    } })
    addItem({ label: $t('image.copy'), click() { tab.webContents.copyImageAt(opts.x, opts.y) } })
    addItem(SEPARATOR)
  }

  if (opts.mediaType == 'audio' || opts.mediaType == 'video') {
    addItem({ label: $t('media.' + (opts.mediaFlags.isPaused ? 'play' : 'pause')), click() {
      executeCodeOnElement(
        opts.frame,
        opts.mediaFlags.isPaused ? `element.play()` : `element.pause()`
      )
    } })
    addItem({ label: $t('media.mute'), type: 'checkbox', checked: opts.mediaFlags.isMuted, click() {
      executeCodeOnElement(opts.frame, `element.muted = ${opts.mediaFlags.isMuted ? 'false' : 'true'}`)
    }, enabled: opts.mediaFlags.hasAudio })
    addItem({ label: $t('media.loop'), type: 'checkbox', checked: opts.mediaFlags.isLooping, click() {
      executeCodeOnElement(opts.frame, `element.loop = ${opts.mediaFlags.isLooping ? 'false' : 'true'}`)
    }, enabled: opts.mediaFlags.canLoop })
    if (opts.srcURL) {
      addItem(SEPARATOR)
      addItem({ label: $t('media.viewInNewTab'), click() {
        createContextTab({ url: opts.srcURL })
      } })
      addItem({ label: $t('media.copyURL'), click() {
        clipboard.writeText(opts.srcURL)
      } })
    }
    addItem(SEPARATOR)
  }

  if (opts.mediaType == 'video') {
    addItem({ label: $t('media.controls'), type: 'checkbox', checked: opts.mediaFlags.isControlsVisible, click() {
      executeCodeOnElement(opts.frame, `element.controls = ${opts.mediaFlags.isControlsVisible ? 'false' : 'true'}`)
    }, enabled: opts.mediaFlags.canToggleControls })

    if (opts.mediaFlags.canShowPictureInPicture) {
      addItem({ label: $t('media.pictureInPicture'), type: 'checkbox', checked: opts.mediaFlags.isShowingPictureInPicture, click() {
        executeCodeOnElement(
          opts.frame,
          opts.mediaFlags.isShowingPictureInPicture ? 'document.exitPictureInPicture()' : 'element.requestPictureInPicture()'
        )
      } })
    }
    addItem(SEPARATOR)
  }

  if (opts.frame != tab.webContents.mainFrame) {
    addItem({ label: $t('frame.reload'), click() { opts.frame.reload() } })
    addItem({ label: $t('frame.viewSourceCode'), click() {
      createContextTab({ url: `view-source:${opts.frame.url}` })
    } })
    addItem(SEPARATOR)
  }

  addItem({ label: t('navigation.back'), enabled: tab.webContents.canGoBack(), click() { tab.webContents.goBack() } })
  addItem({ label: t('navigation.forward'), enabled: tab.webContents.canGoForward(), click() { tab.webContents.goForward() } })
  addItem({ label: t('navigation.reload'), click() { tab.webContents.reload() } })
  addItem(SEPARATOR)
  addItem({ label: $t('savePageAs'), async click() {
    let result = await dialog.showSaveDialog(win || null, {
      title: $t('savePage_dialog', { page: tab.webContents.getURL() }),
      properties: [ 'showHiddenFiles', 'createDirectory' ],
      defaultPath: pathModule.join(config.get().behaviour.downloadPath || '/', opts.suggestedFilename || 'page'),
      filters: [ { extensions: ['html', 'htm'], name: 'HTML documents' } ]
    });

    if (result.canceled) return;

    let pageType = control.options.save_complete_page.value ? "HTMLComplete" as const : "HTMLOnly" as const
    tab.webContents.savePage(result.filePath, pageType)

  }, accelerator: 'Ctrl+S' })
  addItem({ label: $t('print'), click() {
    // TODO: print page
    dialog.showErrorBox("Not implemented", "Not implemented")
  }, accelerator: 'Ctrl+Shift+P' })
  addItem(SEPARATOR)
  addItem({ label: $t('viewSourceCode'), click() { createContextTab({ url: `view-source:${tab.webContents.getURL()}` }) } })
  addItem({ label: $t('openDevTools'), click() { toggleDevTools(tab.webContents) }, accelerator: 'Ctrl+Shift+I' })
  if (tab.paneView) {
    addItem(SEPARATOR)
    addItem({ label: $t('closePane'), click() {
      if (tab == tab.paneView.leftTab) {
        selectTab(win, { tab: tab.paneView.rightTab })

      } else {
        selectTab(win, { tab: tab.paneView.leftTab })
      }
      undividePanes(win, tab.paneView);
    } })
  }

  menu.popup()
}

export function menuOfAddressBar(win: TabWindow, opts: { selectionText: string }) {
  let menu = new Menu();

  function addItem(obj: Electron.MenuItemConstructorOptions) {
    menu.append(new MenuItem(obj))
  }
  /**
   * Wrapper around the t(), adds "menu.contextMenu"
   */
  function $t(str: string, obj?: {}) {
    return t(`menu.contextMenu.${str}`, obj)
  }

  if (opts.selectionText) {
    let searchConfig = config.get().search;
    let selectedSE = searchConfig.available[searchConfig.selectedIndex]
    addItem({
      label: $t('search', { engine: selectedSE.name }), click() {
        createTab(win, { url: selectedSE.searchURL.replaceAll('%s', encodeURIComponent(opts.selectionText)) })
      }
    })
    addItem({ label: $t('copy'), role: 'copy', accelerator: 'CmdOrCtrl+C' })
    addItem({ label: $t('cut'), role: 'cut', accelerator: 'CmdOrCtrl+X' })
    addItem({ label: $t('delete'), role: 'delete', accelerator: 'Delete' })
    addItem(SEPARATOR)
  }
  addItem({ label: $t('paste'), role: 'paste', accelerator: 'CmdOrCtrl+V' })
  addItem({ label: $t('pasteAndMatchStyle'), role: 'pasteAndMatchStyle', accelerator: 'CmdOrCtrl+Shift+V' })
  const copied = clipboard.readText();
  if (copied) {
    addItem(SEPARATOR)
    addItem({
      label: $t($.isValidURL(copied) ? 'pasteAndGo' : 'pasteAndSearch', { query: copied }),
      accelerator: 'CmdOrCtrl+Shift+V',
      click() {
        win.currentTab.webContents.focus();
        // TODO: stop using ipcMain.emit and switch to something
        // more versatile
        ipcMain.emit('currentTab.go', { sender: win.chrome.webContents }, copied)
      }
    })
  }

  if (menu.items.length == 0) return;

  menu.popup();
}

export function menuOfTab(win: TabWindow, tab: Tab) {
  const createContextTab = createContextTabF(win, tab)

  let menu = new Menu();
  function addItem(options: Electron.MenuItemConstructorOptions) {
    menu.append(new MenuItem(options))
  }

  function $t(str: string, obj?: {}) {
    return t(`menu.tabMenu.${str}`, obj)
  }

  addItem({ label: $t('createNewTab'), accelerator: 'CmdOrCtrl+T', click() {
    createContextTab({
      private: false,
      url: $.newTabUrl
    })
    focusChrome(win)
  } })
  addItem({ label: $t('createNewPrivateTab'), accelerator: 'CmdOrCtrl+P', click() {
    createContextTab({ url: 'nereid://private', private: true })
    focusChrome(win)
  } })
  addItem(SEPARATOR)
  addItem({ label: t('navigation.reload'), click() { toRealTab(tab).webContents.reload() } })
  addItem({
    label: $t('reloadAll'), click() {
      win.tabs.forEach(t => {
        toRealTab(t).webContents.reload()
      })
    }
  })
  addItem({ label: $t('copyURL'), click() { toRealTab(tab).webContents.getURL() } })
  addItem(SEPARATOR)
  addItem({ label: $t('duplicate'), click() {
    createContextTab({
      url: tab.isGhost ? tab.url : asRealTab(tab).webContents.getURL()
    })
  } })
  if (!tab.isGhost && asRealTab(tab).webContents.audioMuted) {
    addItem({ label: $t('sound-unmute'), click() { setMutedTab(win, tab, false) } })

  } else {
    addItem({ label: $t('sound-mute'), click() { setMutedTab(win, tab, true) } })
  }
  addItem(SEPARATOR)
  if (getTabGroupByTab(tab)) {
    addItem({ label: $t('removeFromGroup'), click() {
      removeTabFromGroup(win, getTabGroupByTab(tab) as TabGroup, tab);
    } })

  } else {
    addItem({ label: $t('addToNewGroup'), click() {
      createTabGroup(win, {
        startIndex: win.tabs.indexOf(tab),
        endIndex: win.tabs.indexOf(tab) + 1,
        name: '',
        color: 'gray'
      })
    } })
  }
  addItem(SEPARATOR)
  if (tab == win.currentTab) {
    openNearbyTabsInPanes.forEach(item => {
      addItem(item)
    })

  } else {
    addItem({ label: $t('splitPaneLeft'), click() {
      dividePanes(win, { left: tab, right: win.currentTab })
    } })
    addItem({ label: $t('splitPaneRight'), click() {
      dividePanes(win, { left: win.currentTab, right: tab })
    } })
  }
  addItem(SEPARATOR)
  addItem({ label: $t('openInNewWindow'), async click() {
    const window = await newWindow([]);
    moveTab(tab, { window, index: 0 })
  } })
  addItem(SEPARATOR)
  addItem({
    label: $t('close-this'), accelerator: 'Ctrl+W', async click() {
      try {
        await closeTab(win, { tab }, true)

      } catch (e) {
        console.error('Menu item "Close tab" - error:', e)
      }
    }
  })
  addItem({
    label: $t('close-others'), click() {
      win.tabs.forEach(async otherTab => {
        if (otherTab == tab) return;

        try {
          await closeTab(win, { tab: otherTab }, true)

        } catch (e) {
          console.error('Menu item "Close other tabs" - error:', e)
        }
      })
    }
  })
  addItem({
    label: $t('close-right'), async click() {
      let index = win.tabs.indexOf(tab);
      if (index == -1) console.error('Menu item "Close tabs to the right" - no tab found in window');

      while (win.tabs[index + 1]) {
        await closeTab(win, { index: index + 1 }, true)
      }
    }
  })

  menu.popup()
}

export function menuNewTab(win: TabWindow, group?: TabGroup) {
  function $t(str: string, obj?: {}) {
    return t(`menu.tabMenu.${str}`, obj)
  }

  Menu.buildFromTemplate([
    {
      label: $t('createNewTab'),
      accelerator: 'CmdOrCtrl+T',
      click() {
        createTab(win, { url: $.newTabUrl, groupID: group?.id })
        focusChrome(win)
      }
    },
    {
      label: $t('createNewPrivateTab'),
      accelerator: 'CmdOrCtrl+P',
      click() {
        createTab(win, { url: 'nereid://private', private: true, groupID: group?.id })
        focusChrome(win)
      }
    },
  ]).popup()
}

export function menuOfBookmark(win: TabWindow, bookmark: Bookmark, index: number) {
  let menu = new Menu();
  function addItem(options: Electron.MenuItemConstructorOptions) {
    menu.append(new MenuItem(options));
  }

  function t_menu(str: string, obj?: {}) {
    return t(`menu.contextMenu.${str}`, obj)
  }
  function t_bar(str: string, obj?: {}) {
    return t(`ui.bookmarkBar.${str}`, obj)
  }

  addItem({
    label: t_menu('copyLink'),
    sublabel: bookmark.url,
    click() {
      clipboard.writeText(bookmark.url)
    }
  })
  addItem(SEPARATOR)
  addItem({
    label: t_menu('open.newTab'),
    click() {
      createTab(win, { url: bookmark.url })
    }
  })
  addItem({
    label: t_menu('open.newPrivateTab'),
    click() {
      createTab(win, { url: bookmark.url, private: true })
    }
  })
  addItem({
    label: t_menu('open.newWindow'),
    click() {
      newWindow([{ url: bookmark.url }])
    }
  })
  addItem({
    label: t_menu('open.thisTab'),
    click() {
      win.currentTab.webContents.loadURL(bookmark.url)
    }
  })

  addItem(SEPARATOR)

  addItem({
    label: t_bar('edit'),
    click() {
      createTab(win, { url: `nereid://bookmarks/#@bookmarkBar/edit:${index}` })
    }
  })
  addItem({
    label: t_bar('delete'),
    async click() {
      const bms = await bookmarks.get();
      bms["@bookmarkBar"].splice(index, 1);
      bookmarks.set(bms)
    }
  })

  addItem(SEPARATOR)

  addItem({
    label: t('common.bookmarks'),
    click() {
      createTab(win, { url: `nereid://bookmarks/` })
    }
  })

  menu.popup();
}

export function menuOfProcess(process: Electron.ProcessMetric) {
  let menu = new Menu();
  function addItem(options: Electron.MenuItemConstructorOptions) {
    menu.append(new MenuItem(options))
  }

  function $t(str: string, obj?: {}) {
    return t(`windows.taskManager.${str}`, obj)
  }

  let localizedIntegrity = $t('table.integrityDescription.unknown');
  if (process.integrityLevel) {
    localizedIntegrity = $t(`table.integrityDescription.${process.integrityLevel}`)
  }

  addItem({ label: $t('button-finish'), async click() {
    try {
      await kill(process.pid)
      
    } catch (error) {
      dialog.showErrorBox('Failed to terminate the process', `Error: ${error}`)
    }
  } })
  addItem(SEPARATOR)
  addItem({ enabled: false, label: $t('table.more-integrity', { value: localizedIntegrity }) })
  addItem({ enabled: false, label: $t('table.more-peakMemory', { value: process.memory.peakWorkingSetSize + ' ' + $t('table.kb') }) })
  addItem({ enabled: false, label: $t('table.more-creationTime', { value: (new Date(process.creationTime)).toISOString() }) })
  addItem({ enabled: false, label: process.sandboxed ? $t('table.more-sandboxed') : $t('table.more-notSandboxed') })

  menu.popup()
}

export function menuOfPaneDivider(win: TabWindow) {
  let menu = new Menu();
  function addItem(options: Electron.MenuItemConstructorOptions) {
    menu.append(new MenuItem(options))
  }

  if (!win.currentPaneView) {
    return dialog.showErrorBox("Error", "No panes opened")
  }

  function $t(str: string, obj?: {}) {
    return t(`menu.panes.${str}`, obj)
  }

  addItem({ label: $t('close'), async click() {
    undividePanes(win, win.currentPaneView)
  }})
  addItem({ label: $t('switch'), accelerator: 'CmdOrCtrl+Alt+S', async click() {
    dividePanes(win, {
      left: win.currentPaneView.rightTab,
      right: win.currentPaneView.leftTab
    })
  }})

  menu.popup()
}