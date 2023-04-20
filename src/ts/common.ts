import type { Response } from "electron-fetch";
import { ParsedURL } from "./types";
import { parse as legacyParse } from "url"
import { BrowserWindowConstructorOptions } from "electron";

// here are all the things that don't belong to a specific aspect of the browser and are used by everything
// except for searchHintAlgorithms

const slashesRegex = /^[A-Za-z][A-Za-z0-9+-.]*:\/\//;

// The URL parser
function setToValue(array: string[], val: any): { [prop: string]: typeof val } {
  let o = {};
  array.forEach(prop => {
    o[prop] = val
  })
  return o
}
function getAllProps<T extends Object>(o: T): T {
  let result = {};
  for (const key in o) {
    result[key as any] = o[key];
  }

  return result as T;
}
function URLParse(str: string): ParsedURL {
  if (legacyParse(str).protocol == null) {
    // parse url's without protocols
    str = 'null:' + str
  }
  try {
    let urlObj = getAllProps(new URL(str));

    let slashes = slashesRegex.test(str);
    let origin = urlObj.origin == null ? '' : urlObj.origin
    let protocol = urlObj.protocol == 'null:' ? null : urlObj.protocol;

    return {
      ...urlObj,
      slashes, origin, protocol
    };

  } catch (e) {
    console.log('invalid url %o because %s', str, e);

    return setToValue([
      'hash', 'slashes', 'host', 'hostname', 'href',
      'origin', 'protocol', 'username', 'password', 'port',
      'pathname', 'search', 'searchParams'
    ], null) as any
  }
};

// The window.open features parser
// Code taken from https://github.com/electron/electron/blob/main/lib/browser/parse-features-string.ts
const keysOfTypeNumber = [
  'top', 'left', 'x', 'y', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'opacity'
];
function coerce(key: string, value: string): string | number | boolean {
  if (keysOfTypeNumber.includes(key)) {
    return parseInt(value, 10);
  }

  switch (value) {
    case 'true':
    case '1':
    case 'yes':
    case undefined:
      return true;
    case 'false':
    case '0':
    case 'no':
      return false;
    default:
      return value;
  }
}
const allowedWebPreferences = ['zoomFactor', 'javascript'] as const;
type AllowedWebPreference = (typeof allowedWebPreferences)[number];
/**
 * Parses a feature string that has the format used in window.open().
 */
function parseWindowOpenFeatures(features: string) {
  const parsed = {} as { [key: string]: any };
  for (const keyValuePair of features.split(',')) {
    const [key, value] = keyValuePair.split('=').map(str => str.trim());
    if (key) parsed[key] = coerce(key, value);
  }

  const webPreferences: { [K in AllowedWebPreference]?: any } = {};
  allowedWebPreferences.forEach((key) => {
    if (parsed[key] === undefined) return;
    webPreferences[key] = parsed[key];
    delete parsed[key];
  });

  if (parsed.left !== undefined) parsed.x = parsed.left;
  if (parsed.top !== undefined) parsed.y = parsed.top;

  return {
    windowOptions: parsed as Omit<BrowserWindowConstructorOptions, 'webPreferences'>,
    webPreferences
  };
}

export default {
  // TODO: when extensions are implemented, move this to an appropriate file
  newTabUrl: 'nereid://newtab',
  searchHintAlgorithms: {
    // TODO: move this to a new file, 'omnibox.ts'
    async googleLike(res: Response): Promise<string[]> {
      const json: string[][] = await res.json();

      return json[1]
    },
    async startpageLike(res: Response): Promise<string[]> {
      const json: any = await res.json();

      return json.suggestions.map(s => s.text)
    },
    error(): string[] {
      return [
        "⚠ Something went wrong while trying to get hints. Check your config.json5 file."
      ]
    },
    async finder(res: Response): Promise<string[]> {
      // tries to understand which fields of request are valid hints.

      let text = await res.text();
      try {
        const json = JSON.parse(text);

        if (Array.isArray(json)) {
          if (json.every(v => typeof v == 'string')) {
            return json;
          }
          if (json.every(v => typeof v == 'object' && v != null)) {
            let a = json.map((o) => {
              return o.value || o.text || o.string || o.hint || o.suggestion || null
            });
            if (a.every(v => v == null)) return []
            return a.map(String)
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
                return a.map(String)
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
            return Object.keys(suggs)

          } else if (typeof suggs == 'string') {
            let semiC = suggs.split(';')
            let comma = suggs.split(',')

            if (semiC.length < 2 && comma.length > 3) return comma;
            if (semiC.length > 1) return semiC;
            if (semiC.length == 1 && comma.length == 1) return semiC;

          } else return []

        } else return []

      } catch (e) {
        return [];
      }
    }
  },
  isValidURL(url: string) {
    let urlPattern = /^(?:([a-z]+):)(\/{0,3})([0-9.\-a-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?|([0-9\-A-Z]+)\.[A-Z]+/gmi;
    if (urlPattern.test(url)) {
      try {
        new URL(url);
        return true;

      } catch (_) {
        try {
          new URL('http://' + url);
          return true;

        } catch (_) {
          return false;
        }
      }
    } else return false
  },
  URLParse,
  parseWindowOpenFeatures,
  /**
   * Gets unique values from an array by comparing them to each other using `compareFn`.
   */
  uniqBy<T extends ReadonlyArray<unknown>>(compareFn: (val1: T[0], val2: T[0], obj: T) => boolean) {
    // will be passed to Array.prototype.filter()
    return function uniq(firstValue: T[0], firstIndex: number, self: T) {
      return self.findIndex(secondValue => compareFn(firstValue, secondValue, self)) === firstIndex;
    }
  }
}