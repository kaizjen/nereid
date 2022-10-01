<style>
  #addressbar {
    width: -webkit-fill-available;
    transition: box-shadow 0.05s;
    border-radius: 3px;
    display: flex;
    cursor: text;
    overflow: hidden;
    -webkit-app-region: no-drag;
    margin-left: 6px;
    margin-right: 6px;
    padding-right: 2px;
  }
  #addressbar:not(.noborder) {
    box-shadow: 0px 0px 0px 1px #ffffff3d;
  }
  #addressbar:hover {
    box-shadow: none;
    transition: 0s;
  }
  #addressbar.focus {
    outline: none;
    box-shadow: 0px 0px 0px 2px var(--accent-color);
  }
  #addressbar:not(.noborder):hover {
    background: #00000026;
  }
  #addressbar.focus:hover {
    background: inherit;
  }
  .ab-btn {
    display: contents;
  }
  .tab-state {
    height: 20px;
    width: 20px;
    padding: 5px;
    padding-inline: 8px;
    border-radius: 4px;
    transition: 0.10s;
    cursor: default;
    flex-shrink: 0;
  }
  .sec {
    width: 20px;
    height: 15px;
    padding: 8px;
  }
  .tab-state:hover, .tab-state.open {
    background: var(--button-hover);
    transition: 0s;
  }
  .tab-state:active {
    background: var(--button-active);
  }
  #ab-txt {
    margin-left: 2px;
    display: inline-flex;
    font-size: 15px;
    white-space: nowrap;
    flex-grow: 1;
    padding: 5px;
    overflow: hidden;
    cursor: text;
  }
  #ab-input {
    background: transparent;
    border: 0;
    outline: 0;
    color: var(--accent-text);
    width: 100%;
    font-size: 15px;
    font-family: inherit;
    padding-left: 9px;
  }
  #ab-input:focus-visible {
    box-shadow: none; /* box-shadow defined for all elements in index.html */
  }
  #ab-input::placeholder {
    color: var(--trivial-text);
  }

  .wrapper {
    position: absolute;
    width: -webkit-fill-available;
    height: -webkit-fill-available;
    margin-right: 30px;
    margin-left: 30px;
  }
</style>

<script>
  export let tab = {};
  const { ipcRenderer } = window.nereid
  import Hints from "./Hints.svelte"
  import Security from "./popups/Security.svelte"
  import { getContext } from "svelte/internal"
  import ZoomPopup from "./popups/Zoom.svelte";
  import Bookmark from "./popups/Bookmark.svelte";
  import AdBlocker from "./popups/AdBlocker.svelte";

  const { t } = window;
  const _ = {
    PLACEHOLDER: t('ui.addressBar-placeholder'),
    SECURITY: t('ui.security.title'),
    ALT_ZOOM: data => t('ui.zoom.altMessage', data),
    BOOKMARK_ADD: t('ui.bookmarks.add'),
    BOOKMARK_ADD_OR_RM: t('ui.bookmarks.addOrRemove'),
    ADBLOCK_GOOD: t('ui.adblocker.status-good'),
    ADBLOCK_BAD: t('ui.adblocker.status-bad'),
    ADBLOCK_NEUTRAL: t('ui.adblocker.status-neutral'),
  }

  const URLParse = getContext('URLParse')
  const setTop = getContext('setTop')

  const activate = () => {
    if (isActive) return;

    isActive = true;
    setTop(true);
    window.requestAnimationFrame(() => inputRef?.focus());
  }

  let clickHintF;

  let url = {
    protocol: '<unknown>:',
    host: '<none>',
    port: '',
    pathname: '/<none>',
    href: ''
  }
  let isActive = false;
  let inputValue = '';
  let hints = [];
  let inputRef; // before it is referenced, initialize as a dummy object
  let noBorder = false;

  let config = getContext('config');
  let bookmarks = getContext('bookmarks');
  let globalZoom = getContext('globalZoom');
  const colorTheme = getContext('colorTheme');

  let selectedHint = -1

  let securityDialog = false;
  let zoomDialog = false;
  let bookmarkDialog = false;
  let adblockerDialog = false;
  $: anyDialog = securityDialog || zoomDialog || bookmarkDialog || adblockerDialog;

  document.body.addEventListener('keydown', ({ key }) => {
    if (key.length > 1) return;
    if (isActive) return;
    if (!['nereid://private/', 'nereid://newtab/'].includes(tab?.url)) return;

    inputValue += key;
    activate();
  })

  function hover(node) {
    node.addEventListener('mouseover', () => {
      noBorder = true;
    })
    node.addEventListener('mouseout', () => {
      noBorder = false;
    })
  }

  $: {
    console.log('zoom is', $globalZoom, 'default:', $config?.ui.defaultZoomFactor)
  }

  function updateInput() {
    // don't want to update the url when the user is typing something, because this can be frustrating during redirects
    if (isActive || !tab) return
    
    inputValue = tab.url;
    inputRef?.setSelectionRange(0, 0); // the domain should stay in front

    if (['nereid://private/', 'nereid://newtab/'].includes(tab?.url)) {
      url = {
        protocol: '',
        hostname: '',
        port: '',
        path: _.PLACEHOLDER
      }
      inputValue = '';
      
    } else if (tab.url) {
      url = URLParse(tab.url);
      url.path = (url.pathname ?? '') + (url.search ?? '') + (url.hash ?? '');
      url.port = url.port ? ':' + url.port : null;
    }
  }

  function hintToInputValue() {
    if (selectedHint == -1) return;

    const hint = hints[selectedHint];
    if (hint.internal == 'search') {
      inputValue = hint.text

    } else {
      inputValue = hint.url
    }
  }
  /**
   * @param {KeyboardEvent} e
   */
  function handleKeyUp(e) {
    switch (e.key) {
      case 'Enter': {
        if (!hints[selectedHint]) {
          setTop(false);
          ipcRenderer.send('@tab', 'go', inputValue)
          
        } else {
          let hint = hints[selectedHint];
          clickHintF(hint)();
        }
        inputRef?.blur();
        hints = [];
        break;
      }
      case 'ArrowUp': {
        if (selectedHint == -1) {
          selectedHint = hints.length - 1
        } else {
          selectedHint--;
        }
        break;
      }
      case 'ArrowDown': {
        if (selectedHint >= (hints.length - 1)) {
          selectedHint = -1;

        } else {
          selectedHint++;
        }
        break;
      }
      default: {
        if (e.key.length > 1 && e.key != 'Backspace') break;
        if (e.shiftKey || e.ctrlKey) break;
        // key.length > 1 if the key is a special one (like 'Space', but not 'e')

        selectedHint = -1

        ipcRenderer.send('getHints', inputValue);
        ipcRenderer.once('gotHints', (_e, hintArray) => {
          console.log('gotHints', hintArray);
          hints = hintArray;
        })

        break;
      }
    }
    hintToInputValue();
  }

  $: {tab; {
    // watch for tab changes, update when necessary
    updateInput()
  }}

  let isFirstTimeSelecting = true;
  $: if (!isActive) {
    isFirstTimeSelecting = true
  }


  let isInBookmarks = false;
  $: for (const folder in $bookmarks) {
    isInBookmarks = false;
    const elements = $bookmarks[folder];
    if (elements.find(v => new URL(v.url).href == url.href)) {
      isInBookmarks = true;
      break;
    }
  }

  let abError = false;
  let abEnabled = false;
  $: {
    tab;
    void async function () {
      abError = (await ipcRenderer.invoke('getAdblockerStatus')).adBlockerError
      abEnabled = !$config?.privacy.adblockerWhitelist.includes(url.protocol + url.hostname);
    }()
  }
</script>
<div class:noborder={anyDialog || noBorder} id="addressbar" class:focus={isActive}>
  <button use:hover on:click={() => securityDialog = !securityDialog} class="ab-btn">
    <img alt={_.SECURITY} class="tab-state sec"
      src={
        tab.security === true ? `n-res://${$colorTheme}/secure.svg` : 
        tab.security == 'internal' ? `n-res://${$colorTheme}/nereid-monochrome.svg` : 
        tab.security == 'local' ? `n-res://${$colorTheme}/file.svg` :
        `n-res://${$colorTheme}/insecure.svg`
      }
      class:open={securityDialog}
    >
  </button>
  <button id="ab-txt"
    on:mousedown={activate}
    on:keyup={e => e.key == 'Enter' ? activate() : null}
    style:display={isActive ? 'none' : ''}
  >
    <span class="protocol">{url.protocol ?? ''}{url.slashes ? '//' : ''}</span>
    <span class="host">{url.hostname ?? ''}</span>
    <span class="port">{url.port ?? ''}</span>
    <span class="page">{url.path}</span>
  </button>
  <input
    on:blur={() => {
      window.requestAnimationFrame(() => {
        if (!document.activeElement.className.includes('h-link')) { isActive = false; setTop(false) }
        inputRef.setSelectionRange(0, 0);
      })
    }}
    bind:this={inputRef}
    type="text"
    style:display={isActive ? '' : 'none'}
    id="ab-input"
    on:keyup={handleKeyUp}
    bind:value={inputValue}
    placeholder={_.PLACEHOLDER}
    on:mouseup={() => {
      if (inputRef.selectionStart != inputRef.selectionEnd || !isFirstTimeSelecting) return;
      inputRef.select()
      isFirstTimeSelecting = false;
    }}
  >
  {#if $globalZoom != $config?.ui.defaultZoomFactor}
    <button
      class="ab-btn"
      on:click={() => zoomDialog = true}
      use:hover
    >
      <img
        class="tab-state"
        src="n-res://{$colorTheme}/zoom{$globalZoom - $config?.ui.defaultZoomFactor > 0 ? 'in' : 'out'}.svg"
        alt={_.ALT_ZOOM({ zoom: Math.round($globalZoom * 100) })}
        title={_.ALT_ZOOM({ zoom: Math.round($globalZoom * 100) })}
        class:open={zoomDialog}
      >
    </button>
  {/if}
  {#if url.protocol.startsWith('http')}
    <button
      class="ab-btn"
      on:click={() => adblockerDialog = true}
      use:hover
    >
      <img
        class="tab-state"
        src="n-res://{$colorTheme}/shield{(abEnabled && !abError) ? '-good' : '-bad'}.svg"
        alt={(abEnabled && !abError) ? _.ADBLOCK_GOOD : _.ADBLOCK_BAD}
        title={(abEnabled && !abError) ? _.ADBLOCK_GOOD : _.ADBLOCK_BAD}
        class:open={adblockerDialog}
      >
    </button>
  {/if}
  <button
    class="ab-btn"
    on:click={() => bookmarkDialog = true}
    use:hover
  >
    <img
      class="tab-state"
      src="n-res://{$colorTheme}/bookmark{isInBookmarks ? '-selected' : ''}.svg"
      alt={isInBookmarks ? _.BOOKMARK_ADD_OR_RM : _.BOOKMARK_ADD}
      title={isInBookmarks ? _.BOOKMARK_ADD_OR_RM : _.BOOKMARK_ADD}
      class:open={bookmarkDialog}
    >
  </button>
</div>
<div class="wrapper" style="z-index: {anyDialog ? '9' : '-1'};">
  {#if securityDialog}
    <Security bind:isOpen={securityDialog} {tab} />
  {/if}
  {#if zoomDialog}
    <ZoomPopup level={$globalZoom} bind:open={zoomDialog} />
  {/if}
  {#if bookmarkDialog}
    <Bookmark bind:open={bookmarkDialog} {tab} bookmarks={$bookmarks} />
  {/if}
  {#if adblockerDialog}
    <AdBlocker bind:open={adblockerDialog} hostname={url.hostname} protocol={url.protocol} />
  {/if}
</div>

{#if isActive}
  <Hints bind:isActive {hints} isprivate={tab.private} selected={selectedHint} bind:clickHintF />
{/if}