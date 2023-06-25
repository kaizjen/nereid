import { BrowserWindow, MenuItem, app, dialog } from "electron"
import { TabWindow } from "./types"
import { buildAppMenu } from "./menu"
import $ from "./common"
import * as pathModule from "path"
import { t } from "./i18n"
import { isTabWindow, newTabWindow, openUtilityWindow, setCurrentTabBounds } from "./windows"
import { config } from "./userdata"
import { closeTab, createTab, dividePanes, openClosedTab, openUniqueNereidTab, togglePinPane, selectTab, toRealTab, undividePanes, asRealTab } from "./tabs"
import { getTabGroupByTab } from "./tabgroups"
import { registerPedal } from "./omnibox"
import isAccelerator from "electron-is-accelerator"

type AnyFn = (...args: any[]) => any

type CommandConstructorOptions<T extends AnyFn> = {
  name: string
  label: string
  sublabel?: string
  accelerator?: Electron.Accelerator
  trigger: T
}
type CmdChangeHandler<T extends AnyFn> = (c: Command<T>) => any

type KnownCmds = {
  newTab: Command<(win: BrowserWindow) => any>
  newPrivateTab: Command<(win: BrowserWindow) => any>
  newTabInLeftPane: Command<(win: BrowserWindow) => any>
  newTabInRightPane: Command<(win: BrowserWindow) => any>
  leftTabInLeftPane: Command<(win: BrowserWindow) => any>
  leftTabInRightPane: Command<(win: BrowserWindow) => any>
  rightTabInLeftPane: Command<(win: BrowserWindow) => any>
  rightTabInRightPane: Command<(win: BrowserWindow) => any>
  closePanes: Command<(win: BrowserWindow) => any>
  closeTab: Command<(win: BrowserWindow) => any>
  closeAllPrivateTabs: Command<(win: BrowserWindow) => any>
  openClosed: Command<(win: BrowserWindow) => any>
  newWindow: Command<() => any>
  openFile: Command<(win: BrowserWindow) => any>
  closeWindow: Command<(win: BrowserWindow) => any>
  openDownloads: Command<(win: BrowserWindow) => any>
  openExtensions: Command<(win: BrowserWindow) => any>
  openBookmarks: Command<(win: BrowserWindow) => any>
  openSettings: Command<(win: BrowserWindow) => any>
  openHistory: Command<(win: BrowserWindow) => any>
  openAbout: Command<(win: BrowserWindow) => any>
  fullscreen: Command<(win: BrowserWindow) => any>
  findInPage: Command<(win: BrowserWindow) => any>
  swapPanes: Command<(win: BrowserWindow) => any>
  pinFocusedPane: Command<(win: BrowserWindow) => any>
  nextTab: Command<(win: BrowserWindow) => any>
  previousTab: Command<(win: BrowserWindow) => any>
  toggleDevTools: Command<(win: BrowserWindow) => any>
  taskMgr: Command<() => any>
  reload: Command<(win: BrowserWindow) => any>
  hardReload: Command<(win: BrowserWindow) => any>
  reloadAll: Command<(win: BrowserWindow) => any>
  onePageUp: Command<(win: BrowserWindow) => any>
  quit: Command<() => any>
}
type ChangeHandlerInfo<T extends AnyFn> = { handler: CmdChangeHandler<T>, listenTo?: string }
type ClickToTriggerFn<T extends AnyFn> =
  T extends (mi?: MenuItem, w?: BrowserWindow) => any ? void : ((mi: MenuItem, win: Electron.BrowserWindow, ev: Electron.KeyboardEvent) => Parameters<T>)
;

export const commands: KnownCmds & Record<string, Command<any>> = {} as any;

export class Command<T extends AnyFn> {
  /** Gets a command by name and throws if it doesn't exist. */
  static byName<T extends AnyFn = AnyFn>(name: string) {
    if (!(name in commands)) throw new ReferenceError(`No such command as "${name}"`);
    return commands[name] as Command<T>;
  }

  private listeners: ChangeHandlerInfo<T>[] = [];

  private _label: string;
  private _sublabel: string;
  private _accel?: Electron.Accelerator;
  private _trigger: T;

  private cachedMenuItems: {
    opts: Partial<Electron.MenuItemConstructorOptions>, ctf: ClickToTriggerFn<T>, item: MenuItem
  }[] = [];
  private appMenuListenerRegistered = false;

  private handleChange(property: string) {
    const self = this;

    // Clear this list because the old MenuItems are no longer valid.
    this.cachedMenuItems = [];

    this.listeners.forEach(info => {
      if (info.listenTo && !info.listenTo.includes(property)) return;
      info.handler(self);
    })
  }

  constructor(options: CommandConstructorOptions<T>) {
    this.name = options.name;

    this.defaultLabel = this._label = options.label;
    this.defaultSubLabel = this._sublabel = options.sublabel || '';
    this.defaultAccelerator = this._accel = options.accelerator;
    this._trigger = options.trigger;
  }

  readonly name: string;

  readonly defaultLabel: string;
  readonly defaultSubLabel: string;
  readonly defaultAccelerator: Electron.Accelerator;

  /**
   * Registers a listener to any changes of this command.
   * @param handler The listener
   * @param handleProperties An array of properties to watch
   * @returns A function that will unregister the listener.
   */
  onChange(handler: CmdChangeHandler<T>, handleProperties?: ('label' | 'sublabel' | 'accelerator' | 'trigger')[]) {
    const obj: ChangeHandlerInfo<T> = { handler };
    if (handleProperties) {
      obj.listenTo = handleProperties.join(';');
    }
    this.listeners.push(obj);
    return function unregister() {
      this.offChange(handler);
    }
  }

  /** Unregisters a listener */
  offChange(handler: CmdChangeHandler<T>) {
    const item = this.listeners.findIndex(fn => fn.handler == handler);
    if (item == -1) throw new ReferenceError("No such listener found");

    this.listeners.splice(item, 1);
  }

  /** A localized name of this command */
  get label() { return this._label };
  /** A localized sublabel of this command */
  get sublabel() { return this._sublabel };
  /** An accelerator that is supposed to trigger this command */
  get accelerator() { return this._accel };
  /** The trigger function */
  get trigger() { return this._trigger };

  setLabel(newLabel: string) {
    this._label = newLabel;
    this.handleChange('label')
  }
  setSubLabel(newLabel: string) {
    this._sublabel = newLabel;
    this.handleChange('sublabel')
  }
  setAccelerator(newAccel: Electron.Accelerator) {
    this._accel = newAccel;
    this.handleChange('accelerator')
  }
  setTrigger(newTrig: T) {
    this._trigger = newTrig;
    this.handleChange('trigger')
  }

  /** Transforms this command to Electron's `MenuItem` */
  toMenuItem(clickToTrigger: ClickToTriggerFn<T>): MenuItem;
  toMenuItem(overrideOptions: Partial<Electron.MenuItemConstructorOptions>, clickToTrigger?: ClickToTriggerFn<T>): MenuItem;
  toMenuItem(
    overrideOptions: Partial<Electron.MenuItemConstructorOptions> | ClickToTriggerFn<T>,
    clickToTrigger?: ClickToTriggerFn<T>
  ): MenuItem {
    if (typeof overrideOptions == 'function') {
      clickToTrigger = overrideOptions;
      overrideOptions = {};
    }

    const opts: Electron.MenuItemConstructorOptions = {};

    opts.label = this.label;
    if (this.sublabel) opts.sublabel = this.sublabel;
    if (this.accelerator) opts.accelerator = this.accelerator;
    if (clickToTrigger) {
      const self = this;
      opts.click = (mi, win, ev) => {
        self.trigger(...(clickToTrigger as AnyFn)(mi, win, ev))
      }

    } else {
      opts.click = this.trigger;
    }

    const finalOpts = { id: `cmd:${this.name}`, ...opts, ...overrideOptions };

    const cachedItem = this.cachedMenuItems.find(
      cached => $.propsEqual(cached.opts, overrideOptions) && cached.ctf == clickToTrigger
    );
    if (cachedItem) return cachedItem.item;

    const mi = new MenuItem(finalOpts);

    this.cachedMenuItems.push({ opts: overrideOptions as typeof opts, ctf: clickToTrigger, item: mi })

    return mi;
  }

  /** Does the same as `.toMenuItem()`, but also registers a listener which calls `rebuildAppMenu()` on change */
  toAppMenuItem(clickToTrigger: ClickToTriggerFn<T>): MenuItem;
  toAppMenuItem(overrideOptions: Partial<Electron.MenuItemConstructorOptions>, clickToTrigger?: ClickToTriggerFn<T>): MenuItem;
  toAppMenuItem(
    overrideOptions: Partial<Electron.MenuItemConstructorOptions> | ClickToTriggerFn<T>,
    clickToTrigger?: ClickToTriggerFn<T>
  ): MenuItem {
    const mi =
      typeof overrideOptions == 'function' ?
      this.toMenuItem(overrideOptions) :
      this.toMenuItem(overrideOptions as Electron.MenuItemConstructorOptions, clickToTrigger)
    ;

    if (this.accelerator && !this.appMenuListenerRegistered) {
      this.onChange(buildAppMenu)
      this.appMenuListenerRegistered = true;
    }

    return mi;
  }

  /** Turns this command into a registered pedal (see omnibox.ts) and returns its id */
  toPedal(pedalToTrigger?: (win: TabWindow) => Parameters<T>) {
    if (pedalToTrigger) {
      return registerPedal(win => this.trigger(...pedalToTrigger(win)))

    } else {
      return registerPedal(w => this.trigger(w))
    }
  }
}

export function registerCommand<T extends AnyFn>(options: CommandConstructorOptions<T>) {
  if (commands[options.name]) throw new Error("Command names must be unique.");

  const cmd = new Command(options);
  commands[options.name] = cmd;
  return cmd;
}


function obtainWebContents(win: Electron.BrowserWindow | TabWindow) {
  return isTabWindow(win) ? win.currentTab.webContents : win.webContents
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

registerCommand({
  name: 'newTab',
  label: t('menu.common.newTab'),
  accelerator: 'CmdOrCtrl+T',
  trigger(win: Electron.BrowserWindow) {
    if (!isTabWindow(win)) return;

    if (config.get().behaviour.keyboardOpensTabNearby) {
      createTab(win, {
        url: $.newTabUrl,
        position: win.tabs.indexOf(win.currentTab) + 1
      })

    } else {
      const tabGroup = getTabGroupByTab(win.currentTab);
      if (tabGroup && config.get().ui.onlyShowCurrentTabGroup) {
        // In this case, open the tab at the end of the tab group
        createTab(win, {
          url: $.newTabUrl,
          position: tabGroup.endIndex,
          groupID: tabGroup.id
        })

      } else createTab(win, { url: $.newTabUrl });
    }
    focusChrome(win)
  }
})
registerCommand({
  name: 'newPrivateTab',
  label: t('menu.common.newPrivateTab'),
  accelerator: 'CmdOrCtrl+P',
  trigger(win: Electron.BrowserWindow) {
    if (!isTabWindow(win)) return;

    if (config.get().behaviour.keyboardOpensTabNearby) {
      createTab(win, {
        url:'nereid://private',
        position: win.tabs.indexOf(win.currentTab) + 1,
        private: true
      })

    } else {
      const tabGroup = getTabGroupByTab(win.currentTab);
      if (tabGroup && config.get().ui.onlyShowCurrentTabGroup) {
        // In this case, open the tab at the end of the tab group
        createTab(win, {
          url: 'nereid://private',
          position: tabGroup.endIndex,
          groupID: tabGroup.id,
          private: true
        })

      } else createTab(win, { url: 'nereid://private', private: true });
    }
    focusChrome(win)
  }
})
registerCommand({
  name: 'newTabInLeftPane',
  label: t('menu.tabs.newTabInLeftPane'),
  accelerator: 'CmdOrCtrl+Alt+Left',
  trigger(win: Electron.BrowserWindow) {
    if (!isTabWindow(win)) return;

    let newTab = createTab(win, {
      url: $.newTabUrl,
      position: win.tabs.indexOf(win.currentTab),
      background: true
    })
    if (!newTab) return;
    dividePanes(win, {
      left: asRealTab(newTab), right: win.currentTab,
      pinRight: win.currentPaneView?.rightPanePinned,
      separatorPosition: win.currentPaneView?.separatorPosition
    })
    selectTab(win, { tab: newTab })

    focusChrome(win)
  }
})
registerCommand({
  name: 'newTabInRightPane',
  label: t('menu.tabs.newTabInRightPane'),
  accelerator: 'CmdOrCtrl+Alt+Right',
  trigger(win: Electron.BrowserWindow) {
    if (!isTabWindow(win)) return;

    let newTab = createTab(win, {
      url: $.newTabUrl,
      position: win.tabs.indexOf(win.currentTab) + 1,
      background: true
    })
    if (!newTab) return;
    dividePanes(win, {
      left: win.currentTab, right: asRealTab(newTab),
      pinLeft: win.currentPaneView?.leftPanePinned,
      separatorPosition: win.currentPaneView?.separatorPosition
    })
    selectTab(win, { tab: newTab })

    focusChrome(win)
  }
})

registerCommand({
  name: 'leftTabInLeftPane',
  label: t('menu.tabs.leftTabInLeftPane'),
  accelerator: 'CmdOrCtrl+Alt+,',
  trigger(win: Electron.BrowserWindow) {
    if (!isTabWindow(win)) return;
    if (win.tabs.indexOf(win.currentTab) - 1 < 0) return;

    dividePanes(win, {
      left: toRealTab(win.tabs[win.tabs.indexOf(win.currentTab) - 1]),
      right: win.currentTab,
      pinRight: win.currentPaneView?.rightPanePinned,
      separatorPosition: win.currentPaneView?.separatorPosition
    })
  }
})
registerCommand({
  name: 'leftTabInRightPane',
  label: t('menu.tabs.leftTabInRightPane'),
  trigger(win: Electron.BrowserWindow) {
    if (!isTabWindow(win)) return;
    if (win.tabs.indexOf(win.currentTab) - 1 < 0) return;

    dividePanes(win, {
      left: win.currentTab,
      right: toRealTab(win.tabs[win.tabs.indexOf(win.currentTab) - 1]),
      pinLeft: win.currentPaneView?.leftPanePinned,
      separatorPosition: win.currentPaneView?.separatorPosition
    })
  }
})
registerCommand({
  name: 'rightTabInLeftPane',
  label: t('menu.tabs.rightTabInLeftPane'),
  trigger(win: Electron.BrowserWindow) {
    if (!isTabWindow(win)) return;
    if (!win.tabs[win.tabs.indexOf(win.currentTab) + 1]) return;

    dividePanes(win, {
      left: toRealTab(win.tabs[win.tabs.indexOf(win.currentTab) + 1]),
      right: win.currentTab,
      pinRight: win.currentPaneView?.rightPanePinned,
      separatorPosition: win.currentPaneView?.separatorPosition
    })
  }
})
registerCommand({
  name: 'rightTabInRightPane',
  label: t('menu.tabs.rightTabInRightPane'),
  accelerator: 'CmdOrCtrl+Alt+.',
  trigger(win: Electron.BrowserWindow) {
    if (!isTabWindow(win)) return;
    if (!win.tabs[win.tabs.indexOf(win.currentTab) + 1]) return;

    dividePanes(win, {
      left: win.currentTab,
      right: toRealTab(win.tabs[win.tabs.indexOf(win.currentTab) + 1]),
      pinLeft: win.currentPaneView?.leftPanePinned,
      separatorPosition: win.currentPaneView?.separatorPosition
    })
  }
})

registerCommand({
  name: 'closePanes',
  label: t('menu.panes.close'),
  accelerator: 'CmdOrCtrl+Alt+W',
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;
    if (!win.currentPaneView) return;

    undividePanes(win, win.currentPaneView)
  }
})
registerCommand({
  name: 'closeTab',
  label: t('menu.tabs.close'),
  accelerator: 'CmdOrCtrl+W',
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;

    closeTab(win, { tab: win.currentTab })
  }
})
registerCommand({
  name: 'closeAllPrivateTabs',
  label: t('menu.tabs.closeAllPrivate'),
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;

    let index = -1;
    while (index++ < win.tabs.length - 1) {
      if (!win.tabs[index].private) continue;

      closeTab(win, { index }, true)
    }
  }
})
registerCommand({
  name: 'openClosed',
  label: t('menu.tabs.openClosed'),
  accelerator: 'CmdOrCtrl+Shift+T',
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;

    openClosedTab(win)
  }
})

registerCommand({
  name: 'newWindow',
  label: t('menu.common.newWindow'),
  accelerator: 'CmdOrCtrl+N',
  trigger() {
    let url: string;

    let onStart = config.get().behaviour.onStart
    if (onStart.type == 'page') {
      url = onStart.url
    } else {
      url = $.newTabUrl
    }
    newTabWindow([{ url }]);
  }
})
registerCommand({
  name: 'openFile',
  label: t('menu.openFile'),
  accelerator: 'CmdOrCtrl+O',
  async trigger(win: BrowserWindow) {
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
})
registerCommand({
  name: 'closeWindow',
  label: t('menu.window.close'),
  async trigger(win: BrowserWindow) {
    win.close();
  }
})

registerCommand({
  name: 'openDownloads',
  label: t('common.downloads'),
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;
    openUniqueNereidTab(win, 'downloads', true)
  }
})
registerCommand({
  name: 'openExtensions',
  label: t('common.extensions'),
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;
    openUniqueNereidTab(win, 'extensions', true)
  }
})
registerCommand({
  name: 'openBookmarks',
  label: t('common.bookmarks'),
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;
    openUniqueNereidTab(win, 'bookmarks', true)
  }
})
registerCommand({
  name: 'openSettings',
  label: t('common.settings'),
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;
    openUniqueNereidTab(win, 'settings', true)
  }
})
registerCommand({
  name: 'openHistory',
  label: t('common.history'),
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;
    openUniqueNereidTab(win, 'history', true)
  }
})
registerCommand({
  name: 'openAbout',
  label: t('menu.about'),
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;
    openUniqueNereidTab(win, 'about', true)
  }
})

registerCommand({
  name: 'fullscreen',
  label: t('menu.fullscreen'),
  accelerator: 'F11',
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;

    win.setFullScreen(!win.isFullScreen())
    setCurrentTabBounds(win)
  }
})

registerCommand({
  name: 'findInPage',
  label: t('menu.findInPage'),
  accelerator: 'CmdOrCtrl+F',
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;

    win.chrome.webContents.send('toggleFindInPage')
    win.chrome.webContents.focus();
  }
})

registerCommand({
  name: 'swapPanes',
  label: t('menu.panes.switch'),
  accelerator: 'CmdOrCtrl+Alt+S',
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;
    if (!win.currentPaneView) return;

    dividePanes(win, {
      left: win.currentPaneView.rightTab,
      right: win.currentPaneView.leftTab,
      separatorPosition: win.currentPaneView.separatorPosition,
      pinLeft: win.currentPaneView.rightPanePinned,
      pinRight: win.currentPaneView.leftPanePinned
    })
  }
})

registerCommand({
  name: 'pinFocusedPane',
  label: t('menu.panes.pinFocused'),
  accelerator: 'CmdOrCtrl+Alt+P',
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;
    if (!win.currentPaneView) return;

    togglePinPane(
      win.currentPaneView,
      win.currentTab == win.currentPaneView.leftTab ? 'left' : 'right'
    )
    console.log("should pin", win.currentTab == win.currentPaneView.leftTab ? 'left' : 'right');
  }
})

registerCommand({
  name: 'nextTab',
  label: t('menu.tabs.next'),
  accelerator: 'CmdOrCtrl+Tab',
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;

    const nextTabIndex = win.tabs.indexOf(win.currentTab) + 1;
    if (!win.tabs[nextTabIndex]) return;

    selectTab(win, { index: nextTabIndex })
  }
})
registerCommand({
  name: 'previousTab',
  label: t('menu.tabs.previous'),
  accelerator: 'CmdOrCtrl+Shift+Tab',
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;

    const prevTabIndex = win.tabs.indexOf(win.currentTab) - 1;
    if (!win.tabs[prevTabIndex]) return;

    selectTab(win, { index: prevTabIndex })
  }
})

registerCommand({
  name: 'toggleDevTools',
  label: t('menu.devTools'),
  accelerator: 'CmdOrCtrl+Shift+I',
  trigger(win: BrowserWindow) {
    let wc = obtainWebContents(win)
    toggleDevTools(wc);
  }
})

registerCommand({
  name: 'taskMgr',
  label: t('menu.taskManager'),
  accelerator: 'Shift+Escape',
  trigger() {
    openUtilityWindow({ type: 'taskmanager', options: { width: 650, resizable: true, minimizable: true } })
  }
})

registerCommand({
  name: 'reload',
  label: t('navigation.reload'),
  accelerator: "CmdOrCtrl+R",
  trigger(win: BrowserWindow) {
    let wc = obtainWebContents(win)
    wc.reload()
  }
})
registerCommand({
  name: 'hardReload',
  label: t('menu.tabs.hardReload'),
  accelerator: "CmdOrCtrl+Shift+R",
  trigger(win: BrowserWindow) {
    let wc = obtainWebContents(win)
    wc.reloadIgnoringCache()
  }
})
registerCommand({
  name: 'reloadAll',
  label: t('menu.tabMenu.reloadAll'),
  trigger(win: BrowserWindow) {
    if (!isTabWindow(win)) return;

    win.tabs.forEach(t => {
      toRealTab(t).webContents.reload()
    })
  }
})
registerCommand({
  name: 'onePageUp',
  label: t('menu.tabs.onePageUp'),
  accelerator: "CmdOrCtrl+Backspace",
  trigger(win: BrowserWindow) {
    let wc = obtainWebContents(win);
    const url = wc.getURL();
    if (!url.startsWith('http')) return;

    const parsed = $.URLParse(url);
    const newPathname = pathModule.posix.dirname(parsed.pathname);
    const newURL = (new URL(newPathname, parsed.href)).href;
    if (newURL == parsed.href) return;
    wc.loadURL(newURL);
  }
})

registerCommand({
  name: 'quit',
  label: t('menu.common.quit'),
  trigger() {
    app.quit()
  }
})


config.listenCall(({ keybinds }) => {
  for (const cmdName in keybinds) {
    const accelerator = keybinds[cmdName];
    if (!(cmdName in commands)) {
      console.log(
        `Error registering the accelerator for "${cmdName}" - "${cmdName}" is not a registered command.`
      );
      continue;
    }
    if (!isAccelerator(accelerator as string)) {
      console.log(
        `Error registering the accelerator for "${cmdName}" - "${accelerator}" is not a valid accelerator.`
      );
      continue;
    }

    commands[cmdName].setAccelerator(accelerator);
  }

  setImmediate(() => {
    for (const cmdName in commands) {
      // Reset all previously changed accelerators
      const cmd = commands[cmdName];
      if (!keybinds[cmdName] && cmd.accelerator != cmd.defaultAccelerator) {
        console.log('resetting', cmd.name);
        cmd.setAccelerator(cmd.defaultAccelerator)
      }
    }
  })
})