import { t } from "./i18n";
import $ from "./common";
import { config, control, history } from "./userdata";
import type TypeFuse from "fuse.js";
import fetch from "electron-fetch";
import { session } from "electron";
import { DEFAULT_PARTITION, NO_CACHE_PARTITION } from "./sessions";
import { History, NavigationReason } from "./types";

// must use require here because these libraries, when require()d, don't have a .default property.
const Fuse = require('fuse.js') as typeof TypeFuse;

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
}
type HintProvider = (query: string, params: GetHintsParams, util: { isDone(): boolean }) => Hint[] | Promise<Hint[]>

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

      return json.suggestions.map(s => s.text)
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

/** Queues the manipulation of hints so that if
 * multiple hint providers finish at the same time, 
 * the hints would be sent only once. */
const queueSort = (() => {
  let isQueued = false;
  let hints: Hint[] = [];

  return function(newHints: Hint[], updateHints: (hints: Hint[]) => any) {
    hints = newHints;
    if (isQueued) return;

    isQueued = true;
    setImmediate(() => {
      isQueued = false;

      hints = hints.sort(({ relevance: rel1, privileged: p1 }, { relevance: rel2, privileged: p2 }) => {
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
      previousHints = hints;
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
          isDone: () => currentGetHintsCall == thisCall
        });
        provHints.forEach(h => {
          h.provider = name;
          h.relevance = Math.round(h.relevance);
          if (isNaN(h.relevance)) h.relevance = 0;
          h.navigationReason ||= 'input-url';
        })
        $.mutFilter(hints, hint => hint.provider != name); // Remove all previous hints of this p-er
        hints.push(...provHints);

        safeQueueSort();

      } catch (error) {
        console.warn(`Hint provider "${name}" has thrown an error:`, error);
      }
    })()
  }
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

/** Multiply the relevance by this number */
const HISTORY_HINT_MULTIPLIER = 950
/**
 * After that length, the query will be considered "long".
 * MUST NOT BE > 32 because of a Fuse.js bug with `includeMatches`
 */
const MAX_SHORT_QUERY_LEN = 25
export function init() {
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
  addHintProvider("Search", async (query, params) => {
    const searchCfg = config.get().search;

    const hints = [];
    try {
      let { privacy } = config.get();
      if (!privacy.useSuggestions) throw "";

      let searchEngine = searchCfg.available[searchCfg.selectedIndex]
      if (params.isPrivate || query.startsWith('nereid:')) throw "";

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
          relevance: Math.min(rel, 900),
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
  addHintProvider("History", async (query) => {
    const hints: Hint[] = [];

    if (query.length > MAX_SHORT_QUERY_LEN) {
      // Long queries are handled by HistoryLong for perf reasons
      return [];
    }

    try {
      let entries = await history.get();

      if (entries.length > maxHistoryHintLength) {
        entries.length = maxHistoryHintLength;
      }

      let fuseInstance = new Fuse(entries, {
        shouldSort: false,
        ignoreLocation: true,
        includeMatches: true,
        includeScore: true,
        keys: ['url', 'title'],
        threshold: 0.3,
        minMatchCharLength: 2,
        ignoreFieldNorm: true
      })

      let matches = fuseInstance.search(query);

      let merged: Hint[] = $.mutFilter(
        matches.map(({ item, score, matches }): Hint => {
          const contents: RichText = [];

          if (item.reason.startsWith('searched:')) {
            // TODO: move this section to a different provider so that these results
            // don't come up when the query is the search engine URL
            const text = item.reason.slice("searched:".length);

            const allOccs = allOccurences(text, query);

            let prevIndex = 0;
            allOccs.forEach(occ => {
              contents.push({ text: text.slice(prevIndex, occ), bold: true });
              contents.push({ text: text.slice(occ, occ + query.length) });

              prevIndex = occ + query.length;
            });
            contents.push({ text: text.slice(prevIndex), bold: true });

            return {
              contents,
              desc: [{ text: ' - ' + t('ui.hints.prev-search', { site: URLParse(item.url).hostname }), gray: true }],
              icon: '::search',
              url: item.url,
              omniboxValue: text,
              relevance: (1 - score) * HISTORY_HINT_MULTIPLIER * 1.45, // amplify this even further
              navigationReason: `searched:${text}`
            }
          }

          const urlRT: RichText = []

          const titleMatches = matches.find(m => m.key == 'title');
          const urlMatches = matches.find(m => m.key == 'url');

          if (titleMatches) {
            let prevIndex = 0;
            titleMatches.indices.forEach(match => {
              contents.push({ text: titleMatches.value.slice(prevIndex, match[0]) });
              contents.push({ text: titleMatches.value.slice(match[0], match[1] + 1), bold: true });

              prevIndex = match[1] + 1;
            })
            contents.push({ text: titleMatches.value.slice(prevIndex) });

          } else {
            contents.push({ text: item.title })
          }

          if (urlMatches) {
            let prevIndex = 0;
            urlMatches.indices.forEach(match => {
              urlRT.push({ text: urlMatches.value.slice(prevIndex, match[0]), blue: true });
              urlRT.push({ text: urlMatches.value.slice(match[0], match[1] + 1), bold: true, blue: true });

              prevIndex = match[1] + 1;
            })
            urlRT.push({ text: urlMatches.value.slice(prevIndex), blue: true });

          } else {
            urlRT.push({ text: item.url, blue: true })
          }

          return {
            contents,
            desc: urlRT,
            url: item.url,
            icon: item.faviconURL,
            relevance: (1 - score) * HISTORY_HINT_MULTIPLIER
          }
        }),
        $.uniqBy((val1, val2) =>
          val1.url == val2.url
        )
      );

      hints.push(...merged)

      return hints;

    } catch (e) {
      console.log('There was an error while trying to get history-based hints:', e);
      return [];
    }
  })
  addHintProvider("HistoryLong", async (query) => {
    // This provider only handles long queries
    // and uses plain indexOf() search instead of the fuzzy seach
    // algorithm as it gets really slow (~500 ms/query) on long queries.
    if (query.length <= MAX_SHORT_QUERY_LEN) return [];

    const entries = await history.get();

    if (entries.length > maxHistoryHintLength) {
      entries.length = maxHistoryHintLength;
    }

    const words = $.mutFilter(query.toLowerCase().split(/\s/), item => item);

    const hints: Hint[] = [];
    entries.forEach(entry => {
      const titleMatches: [number, number][] = [];
      const urlMatches: [number, number][] = [];

      let prevTitleIndex = -1;
      let prevURLIndex = -1;
      words.forEach(wd => {
        const wdTitleIndex = entry.title.toLowerCase().indexOf(wd, prevTitleIndex + 1);
        const wdURLIndex = entry.url.toLowerCase().indexOf(wd, prevURLIndex + 1);

        if (wdTitleIndex != -1) {
          titleMatches.push([wdTitleIndex, wdTitleIndex + wd.length]);
          prevTitleIndex = wdTitleIndex + wd.length;
        }
        if (wdURLIndex != -1) {
          urlMatches.push([wdURLIndex, wdURLIndex + wd.length]);
          prevURLIndex = wdURLIndex + wd.length;
        }
      });
      if (titleMatches.length == 0 && urlMatches.length == 0) return;

      const relevance = ((titleMatches.length + urlMatches.length) / 2) * 75;
      if (relevance < 300) return;

      const contents: RichText = [];
      const urlRT: RichText = [];

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
}