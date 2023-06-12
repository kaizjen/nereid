import { t } from "./i18n";
import $ from "./common";
import { config, control, history } from "./userdata";
import fetch from "electron-fetch";
import { BrowserWindow, ipcMain, session } from "electron";
import { DEFAULT_PARTITION, NO_CACHE_PARTITION } from "./sessions";
import { NavigationReason, TabWindow } from "./types";
import { getAllTabWindows, isTabWindow } from "./windows";
import { asRealTab, selectTab } from "./tabs";

const URLParse = $.URLParse;

type GetHintsParams = { isPrivate?: boolean, disableEntropy?: boolean };
type RichText = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  gray?: boolean
  blue?: boolean
}[]
type Hint = {
  /** The name of the provider. Will be set automatically. */
  provider?: string
  /** Privileged hints are always shown at the top, though ranked between each other. */
  privileged?: boolean
  /** The relevance score of the hint, the higher it is, the higher the hint appears in the list. */
  relevance: number
  /** The `RichText` object that appears *the first* in the hint UI. */
  contents: RichText
  /** The `RichText` object that appears *the second* in the hint UI. */
  desc: RichText
  /** Go to this URL when the user clicks this hint */
  url: string
  /** When the user selects the hint using the arrow keys, what will be put in the omnibox */
  omniboxValue?: string
  /** Specify the icon with `::` at the beginning to use the internal Nereid resources. */
  icon: string
  /** The navigation reason recorded in history when the user clicks this hint */
  navigationReason?: NavigationReason
  /**
   * If this is present, then, when this hint is clicked, a function specified by the 
   * provider will be called. See `registerPedal` for more info
   * ```ts
   * return [{
   *   ...,
   *   pedalID: registerPedal(() => {
   *     // do something here instead of going to the URL
   *   }),
   *   ...
   * }]
   * ```
   * **Warning!** The `.url` and `.navigationReason` properties will be ignored if you specify pedalID!
   */
  pedalID?: number
}
type HintProvider = (query: string, params: GetHintsParams, util: { isDone(): boolean }) => Hint[] | Promise<Hint[]>
type Pedal = (win: TabWindow) => any

type _SearchAlgorithmResponse = { result: string, rel?: number }[]
const searchHintAlgorithms = {
  async googleLike(res: Response): Promise<_SearchAlgorithmResponse> {
    const json: string[][] = await res.json();
    
    if (!Array.isArray(json))
      return searchHintAlgorithms.finder({ text: async () => JSON.stringify(json) } as any)
    ;
    let relArray = [];
    if (json[4]) {
      relArray = json[4]['google:suggestrelevance'] || []
    }

    return json[1].map((result, i) => ({ result, rel: relArray[i] }))
  },
  async startpageLike(res: Response): Promise<_SearchAlgorithmResponse> {
    const json: any = await res.json();

    return json.suggestions.map(s => ({ result: s.text }))
  },
  error(): _SearchAlgorithmResponse {
    return [
      { result: "⚠ Something went wrong while trying to get hints. Check your config.json5 file." }
    ]
  },
  async finder(res: Response): Promise<_SearchAlgorithmResponse> {
    // tries to understand which fields of request are valid hints.

    let text = await res.text();
    try {
      const json = JSON.parse(text);

      if(Array.isArray(json)) {
        if (json.every(v => typeof v == 'string')) {
          return json.map(s => ({ result: s }));
        }
        if (json.every(v => typeof v == 'object' && v != null)) {
          let a = json.map((o) => {
            return o.value || o.text || o.string || o.hint || o.suggestion || null
          });
          if (a.every(v => v == null)) return []
          return a.map(any => ({ result: String(any) }))
        }

        let pendingResult = [];
        let i = 0;
        for (const obj of json) {
          if (typeof obj == 'string') {
            if (i == 0) continue;

            if (pendingResult.every(a => typeof a == 'string')) {
              pendingResult.push(obj)
            }
          }
          if (Array.isArray(obj)) {
            if (obj.every(v => typeof v == 'string')) {
              return obj;
            }
            if (obj.every(v => typeof v == 'object' && v != null)) {
              let a = obj.map((o) => {
                return o.value || o.text || o.string || o.hint || o.suggestion || null
              });
              if (a.every(v => v == null)) return []
              return a.map(any => ({ result: String(any) }))
            }
          }
          if (typeof obj == 'object') {
            if (pendingResult.every(a => typeof a == 'string')) {
              pendingResult.push(obj.value || obj.text || obj.string || obj.hint || obj.suggestion || null)
            }
          }
          i++;
        }
        return pendingResult;

      } else if (typeof json == 'object' && json != null) {
        let suggs = json.value || json.values || json.text || json.string || json.entries || json.strings || json.hint || json.hints || json.suggestion || json.suggestions || json.response || null
        if (!suggs) return [];

        if (Array.isArray(suggs)) {
          let a = suggs.map((o) => {
            return o.value || o.text || o.string || o.hint || o.suggestion || o
          })
          if (!a.every(s => typeof s == 'string')) return [];

          return a;

        } else if (typeof suggs == 'object') {
          return Object.keys(suggs).map(sug => ({ result: sug }))

        } else if (typeof suggs == 'string') {
          let semiC = suggs.split(';').map(str => ({ result: str }))
          let comma = suggs.split(',').map(str => ({ result: str }))

          if (semiC.length < 2 && comma.length > 3) return comma;
          if (semiC.length > 1) return semiC;
          if (semiC.length == 1 && comma.length == 1) return semiC;

        } else return []

      } else return []

    } catch (e) {
      return [];
    }
  }
}

let _historyLengthFeat = control.options.max_history_for_hints
const maxHistoryHintLength = _historyLengthFeat?.type == 'num' ? _historyLengthFeat.value : 3000;


const hintProviders: Record<string, HintProvider> = {};

let pedalIDMap: ReadonlyArray<Pedal> = []

/** Queues the manipulation of hints so that if
 * multiple hint providers finish at the same time, 
 * the hints would be sent only once. */
let isSortQueued = false;
const queueSort = (() => {
  let hints: Hint[] = [];

  return function(newHints: Hint[], updateHints: (sortedHints: Hint[]) => any) {
    hints = newHints;
    if (isSortQueued) return;

    isSortQueued = true;
    setImmediate(() => {
      isSortQueued = false;

      // We need ALL hints to be saved before sorting them, because
      // sometimes a provider will have a lot of hints in the cache
      // and in the next run end up with less hints. We don't want
      // hints from other providers to be lost then
      hints = hints.slice()

      hints.sort(({ relevance: rel1, privileged: p1 }, { relevance: rel2, privileged: p2 }) => {
        if ((p1 && p2) || (!p1 && !p2)) {
          return rel2 - rel1;

        } else if (p1 && !p2) return -Infinity;
        else return Infinity;
      })
      if (hints.length > 15) {
        hints.length = 15;
      }
      updateHints(hints);
    })
  }
})()

/** Keep track of previous hints to replace them by provider. */
let previousHints: Hint[] = [];
let currentGetHintsCall = 0;
export async function getHints(query: string, updateHints: (hints: Hint[]) => any, params: GetHintsParams = {}) {
  // Remove all the previous pedals
  pedalIDMap = [];

  if (query == '') return updateHints([]);

  console.log('querying hints for %o', query);

  currentGetHintsCall++;
  const thisCall = currentGetHintsCall;

  let hints: Hint[] = params.disableEntropy ? [] : previousHints;

  const safeQueueSort = () => {
    queueSort(hints, sortedHints => {
      if (currentGetHintsCall != thisCall)
        return console.warn(`The hints for "${query}" weren't sent because the query was updated.`)
      ;
      updateHints(sortedHints);
      if (!params.disableEntropy) previousHints = sortedHints;
    });
  }

  for (const name in hintProviders) {
    const provider = hintProviders[name];

    (async () => {
      // This will queue all providers at the same time,
      // and update the hints every time each provider finishes.
      //
      // After each iteration, we cache the hints in `previousHints`
      // Every time `getHints()` gets called, it will first send already
      // cached hints (from a previous response).
      // Before adding new hints of each provider, we first remove
      // its cached hints.
      //
      // ^ This all is done to prevent the annoying jitter when the hints
      // update because some providers work slower than others.
      try {
        const provHints = await provider(query, params, {
          isDone: () => currentGetHintsCall != thisCall
        });
        provHints.forEach(h => {
          h.provider = name;
          h.relevance = Math.round(h.relevance);
          if (isNaN(h.relevance)) h.relevance = 0;
          h.navigationReason ||= 'input-url';
        })
        $.mutFilter(provHints, hint => hint.relevance > 0);
        $.mutFilter(hints, hint => hint.provider != name); // Remove all previous hints of this p-er
        hints.push(...provHints);

        safeQueueSort();

      } catch (error) {
        console.warn(`Hint provider "${name}" has thrown an error:`, error);
      }
    })()
  }
}

/** Registers a pedal and returns its ID. A pedal allows to identify and call a main function from the chrome. */
export function registerPedal(callback: Pedal) {
  return (pedalIDMap as Pedal[]).push(callback) - 1;
}

export async function addHintProvider(name: string, provider: HintProvider) {
  if (hintProviders[name]) {
    console.warn(`Hint provider "${name}" was reset without being removed first!`)
  }
  hintProviders[name] = provider;
}

export async function removeHintProvider(name: string) {
  if (!(name in hintProviders)) throw new Error(`The hint provider "${name}" doesn't exist`);
  delete hintProviders[name];
}

function allOccurences(string: string, subString: string) {
  const result: number[] = [];

  let thisIndex = -1;
  while (true) {
    thisIndex = string.indexOf(subString, thisIndex + 1);
    if (thisIndex < 0) break;

    result.push(thisIndex);
  }

  return result;
}

const getWords = (query: string) => $.mutFilter(query.toLowerCase().split(/[\s,]/), item => item);

function findMatches(words: string[], title: string, url: string) {
  const titleMatches: [number, number][] = [];
  const urlMatches: [number, number][] = [];

  title = title.toLocaleLowerCase();
  url = url.toLocaleLowerCase();

  let prevTitleIndex = -1;
  let prevURLIndex = -1;
  words.forEach(wd => {
    const wdTitleIndex = title.indexOf(wd, prevTitleIndex + 1);
    const wdURLIndex = url.indexOf(wd, prevURLIndex + 1);

    if (wdTitleIndex != -1) {
      titleMatches.push([wdTitleIndex, wdTitleIndex + wd.length]);
      prevTitleIndex = wdTitleIndex + wd.length;

    } else {
      // Every word that doesnt match should subtract from the relevance
      titleMatches.push([0, -wd.length])
    }
    if (wdURLIndex != -1) {
      urlMatches.push([wdURLIndex, wdURLIndex + wd.length]);
      prevURLIndex = wdURLIndex + wd.length;

    } else {
      urlMatches.push([0, -wd.length])
    }
  });

  return { titleMatches, urlMatches }
}

function matchReducer(array: [number, number][]) {
  let num = 0;
  array.forEach(([beginning, end]) => num += end - beginning);
  return Math.max(num, 0);
}

export function init() {
  ipcMain.on('triggerPedal', (e, pedalID) => {
    // MAYBE: move this to ipc.ts??
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!isTabWindow(win)) return;
    if (!pedalIDMap[pedalID]) return console.warn(`The pedal ${pedalID} does not exist.`);

    pedalIDMap[pedalID](win);
  })

  addHintProvider("SearchWhatYouTyped", (query) => {
    const configData = config.get();
    const searchCfg = configData.search;

    return [{
      contents: [{ text: query }],
      desc: [{ text: ' - ' + t('ui.hints.search', { engine: searchCfg.available[searchCfg.selectedIndex].name }), gray: true }],
      icon: '::search',
      relevance: 1,
      privileged: true,
      omniboxValue: query,
      url: searchCfg.available[searchCfg.selectedIndex].searchURL.replaceAll('%s', query),
      navigationReason: `searched:${query}`
    }]
  })
  addHintProvider("URLWhatYouTyped", (query) => {
    if ($.isValidURL(query)) {
      const parsed = URLParse(query);

      let url = query;
      if (parsed.protocol == null) {
        url = 'http://' + query
      }

      return [{
        contents: [{ text: query, blue: true, bold: true }],
        desc: [],
        privileged: true,
        icon: URLParse(url).protocol + '//' + URLParse(url).host + '/favicon.ico',
        relevance: 10,
        url, omniboxValue: query
      }]

    } else {
      return [];
    }
  })
  addHintProvider("Search", async (query, params, { isDone }) => {
    const searchCfg = config.get().search;

    const hints = [];
    try {
      let { privacy } = config.get();
      if (!privacy.useSuggestions) return [];

      let searchEngine = searchCfg.available[searchCfg.selectedIndex]
      if (params.isPrivate || query.startsWith('nereid:')) return [];

      let suggestAlgorithm: (res) => (Promise<_SearchAlgorithmResponse> | _SearchAlgorithmResponse) = searchHintAlgorithms[
        searchEngine.suggestAlgorithm == 'google-like' ? 'googleLike' :
          searchEngine.suggestAlgorithm == 'startpage-like' ? 'startpageLike' :
            searchEngine.suggestAlgorithm == 'find' ? 'finder' :
              'error'
      ]

      const response = await fetch(
        searchEngine.suggestURL.replaceAll('%s', encodeURIComponent(query)),
        {
          session: session.fromPartition(privacy.hideSessionForSuggestions ? NO_CACHE_PARTITION : DEFAULT_PARTITION)
        }
      )

      if (isDone()) return [];

      let suggestions: Hint[] = (await suggestAlgorithm(response)).map(({ result, rel }) => {
        const allOccs = allOccurences(result, query);
        const contents: RichText = [];

        let prevIndex = 0;
        allOccs.forEach(occ => {
          contents.push({ text: result.slice(prevIndex, occ), bold: true }); // Add the non-matched text
          contents.push({ text: result.slice(occ, occ + query.length) });

          prevIndex = occ + query.length;
        });
        contents.push({ text: result.slice(prevIndex), bold: true });

        return {
          contents,
          desc: [{ text: ' - ' + t('ui.hints.search', { engine: searchEngine.name }), gray: true }],
          relevance: Math.min(rel ?? 300, 900),
          icon: '::search',
          omniboxValue: result,
          url: searchCfg.available[searchCfg.selectedIndex].searchURL.replaceAll('%s', result),
          navigationReason: `searched:${result}`
        }
      })

      hints.push(...suggestions);

      return hints;

    } catch (e) {
      console.log('There was an error while trying to get hints:', e);
      return [];
    }
  })
  addHintProvider("History", async (query, _, { isDone }) => {
    const entries = await history.get();
    if (!entries) throw "SyntaxError while getting history hints. (long)";

    if (isDone()) return [];

    if (entries.length > maxHistoryHintLength) {
      entries.length = maxHistoryHintLength;
    }
    // We'd use this function on the entire entries array
    // (original length), but it's too slow that way
    $.mutFilter(entries, $.uniqBy((e1, e2) => e1.url == e2.url));

    const words = getWords(query);

    const hints: Hint[] = [];
    entries.forEach(entry => {
      const { titleMatches, urlMatches } = findMatches(words, entry.title, entry.url);

      if (titleMatches.length == 0 && urlMatches.length == 0) return;

      const relevance = (matchReducer(titleMatches) + (matchReducer(urlMatches) * 0.3)) * 100;

      const contents: RichText = [];
      const urlRT: RichText = [];

      $.mutFilter(titleMatches, match => match[1] > 0)
      $.mutFilter(urlMatches, match => match[1] > 0)

      let prevIndex = 0;
      titleMatches.forEach(match => {
        contents.push({ text: entry.title.slice(prevIndex, match[0]) });
        contents.push({ text: entry.title.slice(match[0], match[1]), bold: true });

        prevIndex = match[1];
      })
      contents.push({ text: entry.title.slice(prevIndex) });

      prevIndex = 0;
      urlMatches.forEach(match => {
        urlRT.push({ text: entry.url.slice(prevIndex, match[0]), blue: true });
        urlRT.push({ text: entry.url.slice(match[0], match[1]), bold: true, blue: true });

        prevIndex = match[1];
      })
      urlRT.push({ text: entry.url.slice(prevIndex), blue: true });

      hints.push({
        contents,
        desc: urlRT,
        relevance,
        url: entry.url,
        icon: entry.faviconURL
      })
    })

    return hints;
  })
  addHintProvider("Tabs", (query) => {
    const tabs = getAllTabWindows().map(w => w.tabs).flat();

    const words = getWords(query);

    const hints: Hint[] = [];
    tabs.forEach(tab => {
      const title = tab.isGhost ? tab.title : asRealTab(tab).webContents.getTitle();
      const url = tab.isGhost ? tab.url : asRealTab(tab).webContents.getURL();

      const { titleMatches, urlMatches } = findMatches(words, title, url)

      if (titleMatches.length == 0 && urlMatches.length == 0) return;

      const relevance = (matchReducer(titleMatches) + (matchReducer(urlMatches) * 0.3)) * 75;

      const titleRT: RichText = [];
      const urlRT: RichText = [];

      $.mutFilter(titleMatches, match => match[1] > 0)
      $.mutFilter(urlMatches, match => match[1] > 0)

      let prevIndex = 0;
      titleMatches.forEach(match => {
        titleRT.push({ text: title.slice(prevIndex, match[0]) });
        titleRT.push({ text: title.slice(match[0], match[1]), bold: true });

        prevIndex = match[1];
      })
      titleRT.push({ text: title.slice(prevIndex) });

      prevIndex = 0;
      urlMatches.forEach(match => {
        urlRT.push({ text: url.slice(prevIndex, match[0]), blue: true });
        urlRT.push({ text: url.slice(match[0], match[1]), bold: true, blue: true });

        prevIndex = match[1];
      })
      urlRT.push({ text: url.slice(prevIndex), blue: true });

      hints.push({
        contents: [{ text: t('ui.hints.tabHint.sign') + '  ', gray: true, italic: true }, ...titleRT],
        desc: [...urlRT, { text: ' - ' + t('ui.hints.tabHint.description'), gray: true }],
        relevance,
        url: url,
        pedalID: registerPedal(() => {
          tab.owner?.focus();
          if (tab.owner) selectTab(tab.owner, { tab });
        }),
        icon: tab.faviconURL
      })
    })

    return hints;
  })
}