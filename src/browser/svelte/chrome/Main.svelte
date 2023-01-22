<style>
  .wrapper {
    position: relative;
    border-bottom: 1px solid var(--dark-6);
  }
  @media (prefers-color-scheme: light) {
    .wrapper {
      border-bottom: 1px solid var(--light-6);
    }
  }
</style>
<script>
  const { ipcRenderer } = window.nereid;
  import Head from "./Head.svelte"
  import Tools from "./Tools.svelte";
  import { writable } from "svelte/store"
  import { setContext } from "svelte/internal"
  import PagePopup from "./PagePopup.svelte";
  import PermissionAccessor from "./PermissionAccessor.svelte";
  import FindInPage from "./FindInPage.svelte";
  import BookmarkBar from "./BookmarkBar.svelte";

  const URLParse = (function(){
    const slashesRegex = /^[A-Za-z][A-Za-z0-9+-.]*:\/\//;

    function setToValue(array, val) {
      let o = {};
      array.forEach(prop => {
        o[prop] = val
      })
      return o
    }
    function getAllProps(o) {
      let result = {};
      for (const key in o) {
        result[key] = o[key];
      }
    
      return result;
    }
    
    return function URLParse(str) {
      try {
        let urlObj = getAllProps(new URL(str));
        
        let slashes = slashesRegex.test(str);
        let origin = urlObj.origin == 'null' ? '' : urlObj.origin
    
        return {
          ...urlObj,
          slashes, origin
        };
    
      } catch (e) {
        console.log('invalid url %o because %s', str, e);
        
        return setToValue([
          'hash', 'slashes', 'host', 'hostname', 'href',
          'origin', 'protocol', 'username', 'password', 'port',
          'pathname', 'search', 'searchParams'
        ], null)
      }
    };
  })()

  function easeOutExpo(base = 2) {
    return t => t === 1.0 ? t : 1.0 - Math.pow(base, -10.0 * t)
  }

  setContext('URLParse', URLParse)
  window.t = (arg1, arg2) => ipcRenderer.sendSync('t', arg1, arg2);

  let tabs = [];
  let currentTab = 0;

  let config = writable()
  setContext('config', config)

  let bookmarks = writable()
  setContext('bookmarks', bookmarks)

  let globalZoom = writable(1);
  setContext('globalZoom', globalZoom)

  const media = matchMedia('(prefers-color-scheme: dark)');
  let colorTheme = writable(media.matches ? 'dark' : 'light');
  setContext('colorTheme', colorTheme);
  media.addEventListener('change', (m) => {
    $colorTheme = m.matches ? 'dark' : 'light';
  })

  window.flyoutProperties = { y: -4, duration: 200, easing: easeOutExpo(3), opacity: 0 };

  requestAnimationFrame(() => {
    ipcRenderer.send('chrome:setHeight', document.body.getBoundingClientRect().height)
  })
  
  let changeToSetHeadHeight = {};

  ipcRenderer.on('adjustHeight', () => {
    ipcRenderer.send('chrome:setHeight', document.body.getBoundingClientRect().height)
    changeToSetHeadHeight = {};
  })

  ipcRenderer.on('userData/config', (_e, conf) => {
    $config = conf;
  })
  ipcRenderer.on('userData/bookmarks', (_e, bms) => {
    $bookmarks = bms;
  })
  setContext('downloads', {
    get() {
      return ipcRenderer.invoke('userData/downloads', 'get')
    },
    delete(index) {
      return ipcRenderer.invoke('userData/downloads', 'del', index)
    },
    create(index) {
      return ipcRenderer.invoke('userData/downloads', 'start', index)
    }
  })


  function me_redirector(type, obj) {
    let el = document.elementFromPoint(obj.x, obj.y);
    if (!el || el.className.includes('blocker') || el == document.documentElement || el == document.body) {
      // means the mouse is not over any of the chrome's UI elements
      ipcRenderer.send('@tab', 'inputEvent', type, obj)
    }
  }
  const redirectMouseEvents = {
    /**
     * @param e {MouseEvent}
     */
    mousemove(e) {
      me_redirector('mouseMove', {
        x: e.x,
        y: e.y
      })
    },
    /**
     * @param e {MouseEvent}
     */
    mouseup(e) {
      me_redirector('mouseUp', {
        x: e.x,
        y: e.y,
        button: e.button
      })
    },
    /**
     * @param e {MouseEvent}
     */
    mousedown(e) {
      me_redirector('mouseDown', {
        x: e.x,
        y: e.y,
        button: e.button
      })
    },
    /**
     * @param e {WheelEvent}
     */
    mousewheel(e) {
      me_redirector('mouseWheel', {
        deltaX: -e.deltaX,
        deltaY: -e.deltaY,
        accelX: e.movementX,
        accelY: e.movementY,
        x: e.x,
        y: e.y
      })
    }
  }
  let isCurrentlyOnTop = false;
  setContext('setTop', (isTop) => {
    if (isTop) {
      for (const evName in redirectMouseEvents) {
        const listener = redirectMouseEvents[evName];

        document.addEventListener(evName, listener, { passive: true })
      }
    } else {
      document.body.style.cursor = '';
      for (const evName in redirectMouseEvents) {
        const listener = redirectMouseEvents[evName];

        document.removeEventListener(evName, listener)
      }
    }
    isCurrentlyOnTop = isTop;
    ipcRenderer.send('chrome:setTop', isTop)
  })

  ipcRenderer.on('tabCursorChange', (_e, cursor) => {
    // change the cursor of the document in order to imitate non-blocking fuctionality
    if (isCurrentlyOnTop) {
      document.body.style.cursor = cursor;
    }
  })

  ipcRenderer.on('addTab', (_e, opts) => {
    console.log('added', opts);
    tabs.splice(opts.position ?? tabs.length, 0, {
      background: opts.background,
      url: opts.url,
      title: opts.url,
      favicon: opts.initialFavicon,
      private: opts.private,
      security: opts.security,
      isLoading: false,
      nav: {
        canGoBack: false,
        canGoFwd: false
      },
      uid: opts.uid ?? NaN,
      crashDetails: null,
      isPlaying: false,
      isMuted: false
    })
    tabs = tabs;

    if (opts.position <= currentTab) {
      currentTab += 1;
    }
  })
  ipcRenderer.on('removeTab', (_e, id) => {
    console.log('removed', id);
    tabs.splice(id, 1)
    if (currentTab > id) {
      currentTab -= 1;
    }
    tabs = tabs;
  })
  ipcRenderer.on('tabChange', (_e, id) => {
    console.log('got', id);
    currentTab = id;
  })

  ipcRenderer.on('tabUpdate', (_e, { type, id, value }) => {
    console.log('updating %o %s %o', id, type, value);
    switch (type) {
      case 'title':
        tabs[id].title = value;
        break;
      case 'url':
        tabs[id].url = value;
        break;
      case 'favicon':
        tabs[id].favicon = value;
        break;
      case 'status':
        tabs[id].isLoading = value;
        break;
      case 'crash':
        tabs[id].crashDetails = value
        break;
      case 'sec':
        tabs[id].security = value
        break;
      case 'nav':
        tabs[id].nav = value
        break;
      case 'playing':
        tabs[id].isPlaying = value
        break;
      case 'muted':
        tabs[id].isMuted = value
        break;
    
      default:
        alert("Error: tabUpdate: unknown type " + type)
        break;
    }
    tabs = tabs;
  })

  ipcRenderer.on('zoomUpdate', (_e, factor) => {
    $globalZoom = factor;
  })


  let dialogsMap = {};

  ipcRenderer.on('dialog-open', (_e, uID, type, arg) => {
    console.log('openDialog', uID, type, arg);
    dialogsMap[uID] = {
      type, arg
    }
    dialogsMap = dialogsMap;

    ipcRenderer.send('chrome:setTop', true) // needs to not actually capture any mouse events
  })
  ipcRenderer.on('dialog-close', (_e, uID) => {
    console.log('closeDialog', uID);
    delete dialogsMap[uID];
    dialogsMap = dialogsMap;

    ipcRenderer.send('chrome:setTop', false)
  })

  let wco = {}
  ipcRenderer.on('wco', (_e, bounds) => {
    console.log('WCO bounds', bounds);
    wco.left = bounds.left + 'px'
    wco.right = bounds.right + 'px'
    wco = wco;
  })

</script>

<!--svelte:head>
  <title> {tabs[currentTab]?.title ?? '(unknown)'} — Nereid </title>
</svelte:head-->

<div
  style="
    display: contents;{
      tabs[currentTab]?.private ?
      ($colorTheme == 'light' ? "--active-background: var(--purple-9);" : "--active-background: var(--purple-2);")
      : ''
    }
    --titlebar-left: {wco.left};
    --titlebar-right: {wco.right};
    font-size: 0.9rem;
  "
>

<Head {tabs} {currentTab} bind:changeToSetHeadHeight />
<div class="wrapper" style="{
    tabs[currentTab]?.private ? 
    ($colorTheme == 'light' ? "border-bottom-color: var(--purple-8);" : "border-bottom-color: var(--purple-1);")
    : ''
  }">
  {#if tabs[currentTab]?.uid in dialogsMap}
  <PagePopup tab={tabs[currentTab]} dialog={dialogsMap[tabs[currentTab]?.uid]} />
  {/if}
  <Tools tab={tabs[currentTab]} />
  <BookmarkBar pageURL={tabs[currentTab]?.url} />
  <PermissionAccessor tab={tabs[currentTab]} />
  <FindInPage index={currentTab} {tabs} />
</div>
</div>