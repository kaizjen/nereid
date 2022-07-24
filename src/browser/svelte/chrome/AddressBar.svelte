<style>
  #addressbar {
    width: -webkit-fill-available;
    transition: 0.1s;
    border-radius: 3px;
    display: flex;
    cursor: text;
    overflow: hidden;
    -webkit-app-region: no-drag;
    margin-left: 6px;
    margin-right: 6px;
    box-shadow: 0px 0px 0px 1px #ffffff40;
  }
  #addressbar:hover {
    box-shadow: none;
  }
  #addressbar.focus {
    outline: none;
    box-shadow: 0px 0px 0px 2px var(--accent-color);
  }
  #addressbar:not(.abignore):hover {
    background: #00000042;
  }
  #addressbar.focus:hover {
    background: inherit;
  }
  #sec {
    width: 15px;
    height: 15px;
    padding: 8px;
    cursor: default;
    border-radius: 4px;
    transition: 0.15s;
  }
  .tab-state {
    height: 20px;
    width: 20px;
    padding: 5px;
    border-radius: 4px;
    transition: 0.15s;
    cursor: default;
  }
  #sec:hover, .tab-state:hover {
    background: var(--button-hover);
  }
  #sec:active, .tab-state:active {
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
    padding-left: 7px;
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

  const { t } = window;
  const _ = {
    PLACEHOLDER: t('ui.addressBar-placeholder'),
    SECURITY: t('ui.security.title'),
    ALT_ZOOM: data => t('ui.zoom.altMessage', data)
  }

  const URLParse = getContext('URLParse')
  const setTop = getContext('setTop')

  const activate = () => {
    if (isActive) return;

    isActive = true;
    setTop(true);
    window.requestAnimationFrame(() => inputRef.focus());
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
  let inputRef = { blur(){}, focus(){} }; // before it is referenced, initialize as a dummy object
  let abignore = false;

  let config = getContext('config');
  let globalZoom = getContext('globalZoom');
  const colorTheme = getContext('colorTheme');

  let selectedHint = -1

  let securityDialog = false;
  let zoomDialog = false;
  $: anyDialog = securityDialog || zoomDialog;

  $: if (!securityDialog) { setTop(false) }

  function hover(node) {
    node.addEventListener('mouseover', () => {
      abignore = true;
    })
    node.addEventListener('mouseout', () => {
      abignore = false;
    })
  }

  $: {
    console.log('zoom is', $globalZoom, 'default:', $config?.ui.defaultZoomFactor)
  }

  function updateInput() {
    // don't want to update the url when the user is typing something, because this can be frustrating during redirects
    if (isActive || !tab) return
    
    inputValue = tab.url;

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
        if (selectedHint == -1) {
          setTop(false);
          ipcRenderer.send('@tab', 'go', inputValue)
          inputRef.blur();
          
        } else {
          let hint = hints[selectedHint];
          clickHintF(hint)();
          inputRef.blur();
        }
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

</script>
<div class:abignore id="addressbar" class:focus={isActive}>
  <button use:hover on:click={() => securityDialog = !securityDialog} style="display: contents;">
    <img alt={_.SECURITY} id="sec"
      src={
        tab.security === true ? `n-res://${$colorTheme}/secure.svg` : 
        tab.security == 'internal' ? `n-res://${$colorTheme}/nereid-monochrome.svg` : 
        tab.security == 'local' ? `n-res://${$colorTheme}/file.svg` :
        `n-res://${$colorTheme}/insecure.svg`
      }
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
    <span class="page">{decodeURI(url.path)}</span>
  </button>
  <input
    on:blur={() => {
      window.requestAnimationFrame(() => {
        if (!document.activeElement.className.includes('h-link')) { isActive = false; setTop(false) }
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
    style="display: contents;"
    on:click={() => zoomDialog = true}
    use:hover
  >
    <img
      class="tab-state"
      src="n-res://{$colorTheme}/zoom{$globalZoom - $config?.ui.defaultZoomFactor > 0 ? 'in' : 'out'}.svg"
      alt={_.ALT_ZOOM({ zoom: Math.round($globalZoom * 100) })}
    >
  </button>
  {/if}
</div>
<div class="wrapper" style="z-index: {anyDialog ? '9' : '-1'};">
  {#if securityDialog}
    <Security bind:isOpen={securityDialog} {tab} />
  {/if}
  {#if zoomDialog}
    <ZoomPopup level={$globalZoom} bind:open={zoomDialog} />
  {/if}
</div>

{#if isActive}
  <Hints bind:isActive {hints} isprivate={tab.private} selected={selectedHint} bind:clickHintF />
{/if}