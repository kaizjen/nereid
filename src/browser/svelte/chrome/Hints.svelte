<style>
  .hints {
    position: absolute;
    display: flex;
    flex-direction: column;
    background: var(--active-background);
    top: 100%;
    left: 0;
    width: 100%;
    /* border-radius: 0 0 10px 10px; */
    overflow: hidden;
    z-index: 1;
    -webkit-app-region: no-drag;
  }
  .h-link {
    padding: 8px;
    padding-left: 120px;
    display: block;
    text-align: left;
    white-space: nowrap;
  }
  .h-link:hover {
    background: var(--t-white-4);
  }
  .h-link:active {
    background: var(--t-white-6);
  }
  .h-link.sel {
    background: var(--t-white-4);
  }
  span.h-body {
    display: inline-flex;
  }
  span.h-more {
    color: var(--t-white-7);
  }

  @media (prefers-color-scheme: light) {
    .hints {
      background: var(--active-background);
    }
    .h-link:hover {
      background: var(--t-black-3);
    }
    .h-link:active {
      background: var(--t-black-5);
    }
    .h-link.sel {
      background: var(--t-black-3);
    }
    span.h-more {
      color: var(--t-black-7);
    }
  }
</style>

<script>
  export let isActive;
  export let isprivate = false;
  export let hints;
  export let selected = -1;
  const { ipcRenderer } = window.nereid
  import { fade } from 'svelte/transition'
  import { getContext } from 'svelte/internal'

  const URLParse = getContext('URLParse')
  const setTop = getContext('setTop')

  const getURL = (function(){
    let memStr = '';
    let memResult = {};
    return function (str) {
      if (memStr != str) {
        memResult = URLParse(str)
        memStr = str;
      }
      return memResult;
    }
  })()

  export function clickHintF(hint) {
    return function () {
      isActive = false;
      setTop(false);
      if (hint.internal == 'url') {
        ipcRenderer.send('currentTab.navigate', hint.url, true);
        
      } else {
        ipcRenderer.send('currentTab.search', hint.text);
      }
    }
  }
  function getFullPath(url) {
    return (url.pathname ?? '') + (url.search ?? '') + (url.hash ?? '')
  }
  function isValidURL(url) {
    try {
      new URL(url)
      return true;

    } catch (e) {
      return false;
    }
  }
  //$: console.log(hints, selected)
</script>

<div class="hints" in:fade={{ duration: 80 }} class:isprivate>
  {#each hints as hint, index}
    <button
      tabindex="0"
      on:click={clickHintF(hint)}
      class:sel={selected == index}
      class="h-link"
    >
      {#if hint.internal == 'search'}
        <span class="h-body">{hint.text}</span> <span class="h-more">— {hint.type}</span>
      {:else}
        {#if hint.title}
          <span class="h-body"> {hint.title} </span> <span class="h-more">— {hint.url}</span>
        {:else}
          <span class="h-body">
            <span class="protocol">{ getURL(hint.url).protocol }{ getURL(hint.url).slashes ? '//' : '' }</span>
            <span class="host">{ getURL(hint.url).host }</span>
            <span class="page">{ getFullPath(getURL(hint.url)) }</span>
          </span> <span class="h-more">— URL</span>
        {/if}
      {/if}
    </button>
  {/each}
</div>