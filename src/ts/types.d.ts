import type { BrowserView, BrowserWindow, Request } from "electron";

declare global {
  var SESSION_UUID: string
}

/** Base window with a chrome */
export type ChromeWindow = BrowserWindow & {
  /** The chrome (https://developer.mozilla.org/en-US/docs/Glossary/Chrome) of the window. */
  chrome: BrowserView
  /** The height of the chrome (from the top of the window) in pixels. */
  chromeHeight: number
}
/** The main window of the browser with tabs */
export type TabWindow = ChromeWindow & {
  /** The currently displayed tab of the window */
  currentTab: RealTab
  /** All tabs of the window. The index corresponds to the index of each tab in the chrome. */
  tabs: Tab[]
  /** All tab groups of the window. No code should ever be dependent on the index, use tab group id instead */
  tabGroups: TabGroup[]
  /** The currently displayed pane view of the window. Is the same as `.currentTab.paneView` */
  currentPaneView: PaneView | null
  /** All pane views in that window. No code should ever be dependent on the index */
  paneViews: PaneView[]
  /** The first few tabs of each window are pinned tabs. This specifies the first non-pinned tab. */
  pinnedTabsEndIndex: number
  /** Unique ID of the window. These ID are be reused in the same session. */
  winID: number
  /** Array of tab descriptors for tabs that were recently closed */
  recentlyClosed: {
    tab: Tab
    index: number
    UID: number
    lastURL: string
    lastTitle: string
    lastTabGroupID: number
  }[]
}
/** A window with only one tab supported, i.e. the one opened by `window.open()` */
export type SingleTabWindow = TabWindow & {
  currentTab: RealTab
  tabs: [RealTab]
  /** A tab that opened this window */
  owner: RealTab
}
export type AnyTabWindow = TabWindow | SingleTabWindow

/** A tab group is just an array of consecutive tabs in the window. */
export type TabGroup = {
  /** The index of the first tab in the group */
  startIndex: number
  /** The non-inclusive index at which the tab group ends */
  endIndex: number
  name: string
  color: 'gray' | 'blue' | 'red' | 'yellow' | 'green' | 'magenta' | 'purple' | 'cyan' | 'orange'
  id?: number
}

export type PaneView = {
  leftTab: RealTab
  rightTab: RealTab
  /** The part of space from the left occupied by the left pane. `0 < x < 1` */
  separatorPosition: number
}

export interface TabOptions {
  /** The initial URL of the newly created tab */
  url: string
  /** Whether the tab should be a private tab */
  private?: boolean
  /** If this is `false`, the tab will be automatically selected */
  background?: boolean
  /**
   * The position of the tab in its window.
   * **DO NOT rely on this property to be accurate as the tab cannot be
   * inserted between pinned tabs, and its position will be changed!** Use `TabWindow.tabs.indexOf()`!
  */
  position?: number
  /** The tab UID for identifying it across the session. **Avoid using this property at all costs!** */
  uid?: number
  /** The URL or the data URL of the initial favicon for that tab. */
  initialFavicon?: string
  isOpenedAtStart?: boolean
  /** Whether the tab should be created as a Ghost Tab */
  isGhost?: boolean
  /** The initial title of the tab */
  initialTitle?: string
  /** The frame name used by `<a target="framename">` links */
  targetFrameName?: string
  /** The id of the group that this tab is in */
  groupID?: number
}

export interface CertficateCache {
  [hostname: string]: Request
}

type NavigationReason = 'redirect' | 'input-url' | 'other' | 'created' | `searched:${string}`
type TabProperties = {
  /** A window that was opened with `window.open()` */
  childWindow?: BrowserWindow
  private: boolean
  /** The URL of the favicon */
  faviconURL: string
  /** The data URL of the fetched favicon */
  faviconDataURL?: string
  /** A session-wide unique ID of the tab */
  uniqueID: number
  /** The reason for the last navigation of the tab */
  lastNavigationReason?: NavigationReason
  isFullScreen?: boolean
  /** The window that this tab is in. */
  owner?: TabWindow
  /** The frame name, if the tab was opened using a `<a target="framename">` link */
  targetFrameName?: string
  /** The tab history, every entry corresponds to the Chromium's history index. */
  history: {
    title: string
    url: string
    faviconURL: string
  }[]
  /** The current index of the `Tab.history` array */
  currentHistoryIndex: number
  /** The pane view that this tab is in */
  paneView?: PaneView
  /**
   * Tab's data that is used by the chrome, like the find in page query, or the dialogs.
   * 
   * **Only serializable objects must be passed through here!**
   */
  chromeData: Record<string, any>
}
/**
 * Upon starting Nereid, instead of loading all tabs at once,
 * only one tab is loaded, the others are all loaded as ghost tabs.
 *
 * Ghost Tabs don't have a `BrowserView`, they exist as a skeleton
 * to load one upon being selected.
 */
export type GhostTab = ({ isGhost: true, url: string, title: string, owner: TabWindow } & TabProperties)
export type RealTab = ({ isGhost?: false | undefined } & BrowserView & TabProperties)
export type Tab = RealTab | GhostTab

export interface ParsedURL extends URL {
  slashes: boolean
}



export type Permissions = {
  popups: boolean | null
  'media.video': boolean | null
  'media.audio': boolean | null
  displayCapture: boolean | null
  DRM: boolean | null
  geolocation: boolean | null
  notifications: boolean | null
  midi: boolean | null
  pointerLock: boolean | null
  openExternal: boolean | null
  idleDetection: boolean | null
  sensors: boolean | null
  screenWakeLock: boolean | null
  fullscreen: boolean | null
}
export interface Configuration {
  v: string
  welcomePhase: number
  i18n: {
    locale: string
    lang: string
  } | null
  ui: {
    theme: 'light' | 'dark' | 'system'
    defaultZoomFactor: number
    chromeZoomFactor: number
    showBookmarks: 'newtab' | 'all' | 'none'
    backgroundImage: string
    onlyShowCurrentTabGroup: boolean
    showTabGroupColor: boolean
  }
  search: {
    available: {
      name: string
      searchURL: string
      suggestURL: string
      suggestAlgorithm: 'google-like' | 'startpage-like' | 'find'
    }[]
    selectedIndex: number
  }
  privacy: {
    httpsOnly: boolean
    useSuggestions: boolean
    hideSessionForSuggestions: boolean
    alwaysClearBrowsingData: boolean
    denyCrossOriginPermissions: boolean
    defaultPermissions: Permissions
    sitePermissions: {
      [hostname: string]: Partial<Permissions>
    }
    adblockerWhitelist: string[]
  }
  behaviour: {
    onStart: {
      type: 'new-tab' | 'last-tabs'
    } | {
      type: 'page'
      url: string
    }
    maxRecentTabs: number
    keyboardOpensTabNearby: boolean
    downloadPath: string | false
    spellChecker: {
      enabled: boolean
      languages: string[]
    }
    a11yEnabled: null | boolean
  }
  keybinds: {
    [command: string]: Electron.Accelerator
  }
  // to be added
}

export interface LastLaunch {
  exitedSafely: boolean
  launchFailed: boolean
  windows: {
    title: string
    url: string
    faviconURL: string | null
  }[][]
  // in case Nereid will end with an error, the whole session will be restored with all the windows
  bounds: {
    x: number
    y: number
    width: number
    height: number
    maximized: boolean
  }
}

export type History = {
  sessionUUID: typeof SESSION_UUID
  tabUID: number
  url: string
  title: string
  timestamp: number
  reason: NavigationReason
  faviconURL?: string
}[]

export type Downloads = {
  url: string
  savePath: string
  status: 'completed' | 'interrupted'
  urlChain: string[]
  offset: number
  length: number
}[]

export type Bookmark = {
  url: string
  name: string
  iconURL?: string
  thumbnailURL?: string
}
export type Bookmarks = {
  "@bookmarkBar": Bookmark[]
  "@startPanel": Bookmark[]
  [folder: string]: Bookmark[]
}

export type FeatureObject = {
  type: "bool"
  default: boolean
  value: boolean
  description: string
} | {
  type: "str"
  default: string
  value: string
  description: string
} | {
  type: "num"
  default: number
  value: number
  description: string
} | {
  type: "enum"
  default: number
  value: number
  /**
   * Index of each element is a possible value
   */
  elements: string[]
  description: string
}

export type Details = {
  switches: string[]
  arguments: { name: string, value: string }[]
  options: {
    [name: string]: FeatureObject
  }
}