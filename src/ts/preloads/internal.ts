import { ipcRenderer } from "electron";

function expose(apiKey: string, obj: any) {
  window[apiKey] = obj;
}

expose('nereid', {
  ipcRenderer,
  shell: new Proxy({}, {
    get(_, p) {
      return (arg: any) => ipcRenderer.invoke('internal:shell', p, arg)
    },
  }),
  sendInternal(channel: string, ...args: any[]) {
    return ipcRenderer.invoke(`internal:${channel}`, ...args)
  },
  sendInternalSync(channel: string, ...args: any[]) {
    return ipcRenderer.sendSync(`internal:${channel}`, ...args)
  },
  basename(path, ext) {
    // "borrowed" from node.js' path

    let start = 0;
    let end = -1;
    let matchedSlash = true;

    // Check for a drive letter prefix so as not to mistake the following
    // path separator as an extra separator at the end of the path that can be
    // disregarded
    if (path.length >= 2 &&
      isWindowsDeviceRoot(String.prototype.charCodeAt.call(path, 0)) &&
      String.prototype.charCodeAt.call(path, 1) === ':'.charCodeAt(0)) {
      start = 2;
    }

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext === path)
        return '';
      let extIdx = ext.length - 1;
      let firstNonSlashEnd = -1;
      for (let i = path.length - 1; i >= start; --i) {
        const code = String.prototype.charCodeAt.call(path, i);
        if (isPathSeparator(code)) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === String.prototype.charCodeAt.call(ext, extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end)
        end = firstNonSlashEnd;
      else if (end === -1)
        end = path.length;
      return String.prototype.slice.call(path, start, end);
    }
    for (let i = path.length - 1; i >= start; --i) {
      if (isPathSeparator(String.prototype.charCodeAt.call(path, i))) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // path component
        matchedSlash = false;
        end = i + 1;
      }
    }

    if (end === -1)
      return '';
    return String.prototype.slice.call(path, start, end);
  }
})
expose('process', {
  platform: process.platform
})

function isWindowsDeviceRoot(code: number) {
  return (code >= 'A'.charCodeAt(0) && code <= 'Z'.charCodeAt(0)) ||
         (code >= 'a'.charCodeAt(0) && code <= 'z'.charCodeAt(0));
}


function isPathSeparator(code: any) {
  return code === '/'.charCodeAt(0) || code === '\\'.charCodeAt(0)
}