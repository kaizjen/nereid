import type { ValidVariable, cssColor } from './css-vars'

type ExtensionUUID = `${string}-${string}-${string}-${string}-${string}`

type URI = `${string}://${string}`
type WebURL = `${'http' | 'https'}://${string}`

type AlmostAllSEAlgorithms = 'google-like' | 'startpage-like' | 'extension' | 'find'
type SearchEngineOptions = {
  name: string
  suggestURL: WebURL
  searchURL: WebURL
  algorithm: AlmostAllSEAlgorithms | `extension:${ExtensionUUID}`
}
type SearchEngine = SearchEngineOptions & {
  id: number
}
type SEHintingAlgorithm = (res: Response) => string[] | Promise<string[]>

type SearchEngineHandle = SearchEngine & {
  setAlgorithm(al: AlmostAllSEAlgorithms | SEHintingAlgorithm): Promise<void>
  setSuggestURL(url: WebURL): Promise<void>
  setSearchURL(url: WebURL): Promise<void>
  setName(name: string): Promise<void>
  remove(): Promise<void>
}

type MenuItem = {
  label: string
  showOn: ('text' | 'image' | 'link')[]
  onClick(menuStatus: MenuStatus): any
} | {
  label: string
  showOn: ('text' | 'image' | 'link')[]
  children: MenuItem[]
}

type MenuStatus = {
  hasText: boolean
  hasImage: boolean
  hasLink: boolean
  getWebContents(): Promise<WebContentsHandle>
}

type TabHandle = {
  readonly uniqueID: number
  readonly windowID: number
  readonly index: number

  readonly title: string
  readonly isLoading: boolean
  readonly faviconURL: URI
  readonly url: URI
  readonly selected: boolean
  getWebContents(): Promise<WebContentsHandle>
  getWindow(): Promise<WindowHandle>
  addTag(tag: string): Promise<void>
  removeTag(tag: string): Promise<void>
  getTags(): Promise<string[]>
  close(): Promise<void>
  select(): Promise<void>

  onClosed(fn: () => any): Promise<void>
  onSelected(fn: (index: number) => any): Promise<void>
  onMovedToAnotherWindow(fn: (windowID: number, newIndex: number) => any): Promise<void>

  refetch(): Promise<TabHandle>
}

type TabOptions = {
  readonly url: string,
  readonly private?: boolean,
  readonly background?: boolean,
  readonly position?: number,
}

type WebContentsHandle = {
  getURL(): Promise<URI>
  getTitle(): Promise<string>
  executeJavaScript(js: string): Promise<unknown>
  readonly navigation: {
    goBack(): Promise<void>
    goForward(): Promise<void>
    reload(): Promise<void>
    loadURL(): Promise<void>
  }
  onNavigated(fn: (url: URI, isInPage: boolean) => any): Promise<void>
  onContextMenu(fn: (status: MenuStatus) => MenuItem | void): Promise<void>
  postMessage(msg: any): Promise<void>

  refetch(): Promise<WebContentsHandle>
}

type ExtensionHandle = {
  readonly uuid: ExtensionUUID
  readonly name: string
  readonly version: `${number}.${number}.${number}`
  readonly enabled: boolean
  disable(): Promise<void>
  enable(): Promise<void>

  refetch(): Promise<ExtensionHandle>
}

type WindowHandle = {
  readonly id: number
  readonly tabsAmount: number
  isFocused(): Promise<boolean>
  isOpen(): Promise<boolean>
  getTabs(): Promise<TabHandle[]>
  selectTab(index: number): Promise<void>

  maximize(): Promise<void>
  minimize(): Promise<void>
  unmaximize(): Promise<void>
  restore(): Promise<void>
  focus(): Promise<void>
  close(): Promise<void>

  readonly ownerExtensionUUID?: ExtensionUUID

  refetch(): Promise<WindowHandle>
}



declare global {
  let nereid: {
    search: {
      removeSearchHintingAlgorithm(): Promise<void>
      setSearchHintingAlgorithm(params: {
        searchEngines: string[] | '*'
        algorithm: SEHintingAlgorithm
      }): Promise<void>
      getSearchEngines(): Promise<SearchEngineHandle[]>
      addSearchEngine(extendedSE: SearchEngineOptions & { algorithm: AlmostAllSEAlgorithms | SEHintingAlgorithm }): Promise<SearchEngineHandle>
      setDefaultSearchEngine(desc: { id: number } | { name: string }): Promise<void>
    }
    ui: {
      getCurrentTheme(): Promise<'dark' | 'light'>
      changeColorTheme(ct: {
        [K in ValidVariable]?: cssColor
      }): Promise<void>
      insertCSS(css: string): Promise<number>
      removeCSS(id: number): Promise<void>
      contextMenu: {
        addGlobalMenuItem(item: MenuItem): Promise<void>
        removeGlobalMenuItem(): Promise<void>
      }
    }
    tabs: {
      query(q: {
        uniqueID?: number
        ids?: {
          windowID: number,
          tabIndex: number
        }
        urlMatch?: RegExp
        url?: URI
        tags?: string[],
        selected?: boolean
      }): Promise<TabHandle[]>
      getAllTabs(): Promise<TabHandle[]>
      createNewTab(options: TabOptions): Promise<TabHandle>
      getByUID(uid: number): Promise<TabHandle>
      onNewTabCreated(fn: (tab: TabHandle) => any): Promise<void>
    }
    extensions: {
      getSelf(): Promise<ExtensionHandle>
      getByUUID(uuid: ExtensionUUID): Promise<ExtensionHandle>
      getAll(): Promise<ExtensionHandle[]>
    }
    windows: {
      getByID(id: number): Promise<WindowHandle>
      getAllWindows(): Promise<WindowHandle[]>
      createWindow(tabOptionsArray?: TabOptions[]): Promise<WindowHandle>
      onNewWindowCreated(fn: (w: WindowHandle) => any): Promise<void>
    }
    webRequest: {
      
    }
  }
}
