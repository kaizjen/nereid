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
  const { ipcRenderer, sendInternal } = window.nereid;
  import Head from "./Head.svelte"
  import Tools from "./Tools.svelte";
  import { writable } from "svelte/store"
  import { setContext } from "svelte/internal"
  import PagePopup from "./PagePopup.svelte";
  import PermissionAccessor from "./PermissionAccessor.svelte";
  import FindInPage from "./FindInPage.svelte";
  import BookmarkBar from "./BookmarkBar.svelte";
  import PaneDivider from "./PaneDivider.svelte";

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
        ], '')
      }
    };
  })()

  function easeOutExpo(base = 2) {
    return t => t === 1.0 ? t : 1.0 - Math.pow(base, -10.0 * t)
  }

  setContext('URLParse', URLParse)
  window.t = (arg1, arg2) => ipcRenderer.sendSync('t', arg1, arg2);

  let tabs = [];
  let currentTabIndex = 0;

  let tabGroups = [];

  let pinnedTabsEndIndex = 0;

  let config = writable()
  setContext('config', config)

  let bookmarks = writable()
  setContext('bookmarks', bookmarks)

  let globalZoom = writable(1);
  setContext('globalZoom', globalZoom)

  let keypressesLocked = writable(false);
  setContext('keypressesLocked', keypressesLocked)

  const media = matchMedia('(prefers-color-scheme: dark)');
  let colorTheme = writable(media.matches ? 'dark' : 'light');
  setContext('colorTheme', colorTheme);
  media.addEventListener('change', (m) => {
    $colorTheme = m.matches ? 'dark' : 'light';
  })

  window.flyoutProperties = { y: -4, duration: 200, easing: easeOutExpo(3), opacity: 0 };

  requestAnimationFrame(() => {
    ipcRenderer.send('chrome.setHeight', document.body.getBoundingClientRect().height)
  })
  
  let changeToSetHeadHeight = {};

  ipcRenderer.on('adjustHeight', () => {
    ipcRenderer.send('chrome.setHeight', document.body.getBoundingClientRect().height)
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
      return sendInternal('userData.downloads.get')
    },
    delete(index) {
      return sendInternal('userData.downloads.del', index)
    },
    create(index) {
      return sendInternal('userData.downloads.start', index)
    }
  })


  function me_redirector(type, obj) {
    let el = document.elementFromPoint(obj.x, obj.y);
    if (!el || el.className.includes('blocker') || el == document.documentElement || el == document.body) {
      // means the mouse is not over any of the chrome's UI elements
      ipcRenderer.send('currentTab.inputEvent', type, obj)
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
    ipcRenderer.send('chrome.setTop', isTop)
  })

  ipcRenderer.on('tabCursorChange', (_e, cursor) => {
    // change the cursor of the document in order to imitate non-blocking fuctionality
    if (isCurrentlyOnTop) {
      document.body.style.cursor = cursor;
    }
  })

  ipcRenderer.on('addTab', (_e, opts, chromeData = {}) => {
    console.log('added', opts);
    tabs.splice(opts.position ?? tabs.length, 0, {
      background: opts.background,
      url: opts.url,
      title: opts.initialTitle || opts.url,
      favicon: opts.initialFavicon?.startsWith('http') ? ('get:' + opts.initialFavicon) : opts.initialFavicon,
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
      isMuted: false,
      chromeData
    })
    tabs = tabs;

    if (opts.position <= currentTabIndex && tabs.length > 1) {
      currentTabIndex += 1;
    }
  })
  ipcRenderer.on('removeTab', (_e, index) => {
    console.log('removed', index);
    tabs.splice(index, 1)
    if (currentTabIndex > index) {
      currentTabIndex -= 1;
    }
    tabs = tabs;
  })
  ipcRenderer.on('tabChange', (_e, index) => {
    console.log('got', index);
    currentTabIndex = index;
  })
  ipcRenderer.on('tabUpdate', (_e, { index, state }) => {
    console.log('updating tab %o with state %o', index, state);
    if (index == -1) {
      return console.warn('update not registered: index is -1 (ignored)');
    }
    Object.assign(tabs[index], state)
    tabs = tabs;
  })

  ipcRenderer.on('zoomUpdate', (_e, factor) => {
    $globalZoom = factor;
  })

  ipcRenderer.on('addTabGroup', (_e, group) => {
    console.log('tab group added', group);
    tabGroups.push(group)
    tabGroups = tabGroups;
  })
  ipcRenderer.on('tabGroupUpdate', (_e, group) => {
    console.log('tab group updated', group);
    Object.assign(tabGroups[tabGroups.findIndex(g => g.id == group.id)], group)
    tabGroups = tabGroups;
    tabs = tabs;
  })
  ipcRenderer.on('removeTabGroup', (_e, groupID) => {
    console.log('tab group removed', groupID);
    tabGroups.splice(tabGroups.findIndex(g => g.id == groupID), 1);
    tabGroups = tabGroups;
  })

  ipcRenderer.on('pinnedTabsEndIndexUpdate', (_e, ptei) => {
    console.log('pinnedTabsEndIndex is', ptei);
    pinnedTabsEndIndex = ptei;
  })


  $: if (tabs[currentTabIndex]?.chromeData.alert) ipcRenderer.send('setTop', true)
  else ipcRenderer.send('setTop', false)

  let wco = {}
  ipcRenderer.on('wco', (_e, bounds) => {
    console.log('WCO bounds', bounds);
    wco.left = bounds.left + 'px'
    wco.right = bounds.right + 'px'
    wco = wco;
  })

  function finishNereidSetupF(isKey) {
    return (e) => {
      if (isKey && e.key != "Enter") return;
      ipcRenderer.send('newTab', { url: 'nereid://welcome/' })
    }
  }
</script>

<!--svelte:head>
  <title> {tabs[currentTab]?.title ?? '(unknown)'} — Nereid </title>
</svelte:head-->

<div
  style="
    display: contents;{
      tabs[currentTabIndex]?.private ?
      ($colorTheme == 'light' ? "--active-background: var(--purple-9);" : "--active-background: var(--purple-2);")
      : ''
    }
    --titlebar-left: {wco.left};
    --titlebar-right: {wco.right};
    font-size: 0.9rem;
  "
>

<Head {tabs} {currentTabIndex} {tabGroups} {pinnedTabsEndIndex} bind:changeToSetHeadHeight />
<div class="wrapper" style="{
    tabs[currentTabIndex]?.private ? 
    ($colorTheme == 'light' ? "border-bottom-color: var(--purple-8);" : "border-bottom-color: var(--purple-1);")
    : ''
  }">
  {#if tabs[currentTabIndex]?.chromeData.alert}
    <PagePopup tab={tabs[currentTabIndex]} dialog={tabs[currentTabIndex]?.chromeData.alert} />
  {/if}
  <Tools tab={tabs[currentTabIndex]} />
  <BookmarkBar pageURL={tabs[currentTabIndex]?.url} />
  <PermissionAccessor tab={tabs[currentTabIndex]} />
  <FindInPage {currentTabIndex} {tabs} />
  {#if $config?.welcomePhase <= 4}
    <div class="dropdown-box">
      <span>
        {window.t('ui.nereidSetupNotification.text')}&nbsp;
        <!-- svelte-ignore a11y-missing-attribute -->
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <a tabindex="0" on:click={finishNereidSetupF(false)} on:keypress={finishNereidSetupF(true)}>
          {window.t('ui.nereidSetupNotification.link')}
        </a>
      </span>
    </div>
  {/if}
</div>
</div>
<PaneDivider />