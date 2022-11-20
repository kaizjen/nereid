import type { BrowserView, BrowserWindow, Request } from "electron";

declare global {
  var SESSION_UUID: string
  var isSafeMode: boolean
  var isStarting: boolean
}

/** 
 * The main window of the browser with tabs
 * 
 * `currentTab` The currently displayed tab of the window
 * 
 * `tabs` All tabs of the window. The index is the id of the tab
 * 
 * `chrome` The chrome (https://developer.mozilla.org/en-US/docs/Glossary/Chrome) of the window. 
 * 
 * `chromeHeight` The height of the chrome (from the top of the window) in pixels.
 * 
 * `winID` Unique ID of the window (session-wide)
 * 
 * `recentlyClosed` Array of tabs that were recently closed (wow)
*/
export interface TabWindow extends BrowserWindow {
  currentTab: Tab
  tabs: Tab[]
  chrome: BrowserView
  chromeHeight: number
  winID: number
  recentlyClosed: {
    tab: Tab
    index: number
    UID: number
    lastURL: string
    lastTitle: string
  }[]
}

export interface TabOptions {
  url: string
  private?: boolean
  background?: boolean
  position?: number
  uid?: number
  initialFavicon?: string
  isOpenedAtStart?: boolean
}

export interface CertficateCache {
  [hostname: string]: Request
}

type NavigationReason = 'redirect' | 'input-url' | 'other' | 'created' | `searched:${string}`
export interface Tab extends BrowserView {
  childWindow?: BrowserWindow
  private?: boolean
  faviconURL?: string
  faviconDataURL?: string
  uniqueID?: number
  lastNavigationReason?: NavigationReason
  isFullScreen?: boolean
  owner?: TabWindow
  isOpenedAtStart?: boolean
}

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
  }
  search: {
    available: {
      name: string
      searchURL: string
      suggestURL: string
      suggestAlgorithm: 'google-like' | 'startpage-like' | 'extension' | 'find' | `extension:${string}`
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
    downloadPath: string | false
    spellChecker: {
      enabled: boolean
      languages: string[]
    }
    a11yEnabled: null | boolean
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