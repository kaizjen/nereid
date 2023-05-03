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
  /** Gets unique values from an array by comparing them to each other using `compareFn`. */
  uniqBy<T extends ReadonlyArray<unknown>>(compareFn: (val1: T[0], val2: T[0], obj: T) => boolean) {
    // will be passed to Array.prototype.filter()
    return function uniq(firstValue: T[0], firstIndex: number, self: T) {
      return self.findIndex(secondValue => compareFn(firstValue, secondValue, self)) === firstIndex;
    }
  },
  /** Filters items in an array with mutating the array, not creating a new one. Returns the reference to the array. */
  mutFilter<T extends unknown[]>(array: T, predicate: (arg: T[0], index: number, array: T) => any) {
    let i = -1;
    while (++i < array.length) {
      if (!predicate(array[i], i, array))
        array.splice(i--, 1)
        // Decrease the i because we've decreased the array length
      ;
    }
    return array;
  }
}