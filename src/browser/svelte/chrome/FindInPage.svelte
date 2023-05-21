<style>
  .up {
    transform: rotate(-90deg);
  }
  .down {
    transform: rotate(90deg);
  }
  .case-toggle {
    padding: 0.25rem;
    padding-inline: 0.5rem;
    width: fit-content;
    height: fit-content;
    margin-right: 0.625rem;
    font-size: 0.93rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.2rem;
    border: 1px solid var(--t-white-3);
    transition: .2s;
  }
  .case-toggle:hover {
    background: var(--t-white-5);
    border-color: transparent;
  }
  .case-toggle:hover:active {
    background: var(--t-white-7);
    transition: 0s;
  }
  .active {
    color: var(--accent-2);
    background: var(--accent-8);
    border-color: transparent;
  }
  .active:hover {
    background: var(--accent-9);
  }
  .active:hover:active {
    background: var(--accent-6);
  }
  .results {
    color: var(--gray-7);
    margin-inline: 0.625rem;
  }
  .results.null {
    color: red;
  }
  .bar {
    background: transparent;
    border: none;
    color: var(--text);
    flex-grow: 1;
  }
  .bar:focus-visible {
    box-shadow: none;
  }

  @media (prefers-color-scheme: light) {
    .case-toggle {
      border-color: var(--t-black-3);
    }
    .case-toggle:hover {
      background: var(--t-black-2);
      border-color: transparent;
    }
    .case-toggle:hover:active {
      background: var(--t-black-5);
    }
    .active {
      color: var(--accent-2);
      background: var(--accent-8);
      border-color: transparent;
    }
    .active:hover {
      background: var(--accent-9);
    }
    .active:hover:active {
      background: var(--accent-6);
    }
    .results {
      color: var(--gray-3);
    }
    .results.null {
      color: red;
    }
    .bar {
      color: var(--text);
    }
  }
</style>
<script>
  import { getContext } from "svelte";

  export let currentTabIndex;
  export let tabs;

  const { ipcRenderer } = window.nereid;
  const colorTheme = getContext('colorTheme')
  const { t } = window;
  const _ = {
    PLACEHOLDER: t('ui.inPageSearch.placeholder'),
    PREV: t('ui.inPageSearch.prev'),
    NEXT: t('ui.inPageSearch.next'),
    MATCH_CASE: t('ui.inPageSearch.caseSensitive'),
    DONE: t('common.done'),
    LOADING: t('common.loading')
  }
  $: chromeData = tabs[currentTabIndex]?.chromeData || {};
  $: findInPage = chromeData.findInPage || {};
  let caseSensitive = false;

  let inputRef;

  let shouldStop = false;

  function stop(clear = false) {
    ipcRenderer.send('currentTab.stopFind', clear)
    shouldStop = true;
  }

  function toggle() {
    if (findInPage?.active) {
      chromeData.findInPage.active = false;

    } else {
      if (chromeData.findInPage) {
        chromeData.findInPage.active = true

      } else {
        chromeData.findInPage = { active: true, value: '' }
      }
      requestAnimationFrame(() => {
        inputRef.focus();
        inputRef.select();
      })
    }
    ipcRenderer.send('chrome.saveData', tabs[currentTabIndex].uid, { findInPage })
  }

  ipcRenderer.on('toggleFindInPage', toggle)

  document.addEventListener('keyup', e => {
    if (e.key == 'Escape' && findInPage?.active) {
      toggle()
    }
  })

  $: if (findInPage?.value == '') {
    stop(true)
  }

  ipcRenderer.on('found', (_e, idx, { activeMatchOrdinal, matches }) => {
    if (idx != currentTabIndex) return;

    if (shouldStop) stop()
    // sometimes, user says stop before the find request completes

    findInPage.ordinal = activeMatchOrdinal;
    findInPage.total = matches;

    ipcRenderer.send('chrome.saveData', tabs[currentTabIndex].uid, { findInPage })
  })

  $: {
    if (!findInPage?.active) {
      stop()
    }
    requestAnimationFrame(() => {
      ipcRenderer.send('chrome.setHeight', document.body.getBoundingClientRect().height)
    })
  }

  function startSearch() {
    if (!findInPage.value) return;

    shouldStop = false;
    ipcRenderer.send('currentTab.find', findInPage.value, { newSearch: true, caseSensitive })
  }
  function findNextF(forward) {
    return () => {
      if (!findInPage.value) return;

      ipcRenderer.send('currentTab.find', findInPage.value, { forward, newSearch: false, caseSensitive })
    }
  }

  $: {caseSensitive; startSearch()}
</script>

{#if findInPage?.active}
  <div class="dropdown-box">
    <button
      class="case-toggle"
      class:active={caseSensitive}
      on:click={() => caseSensitive = !caseSensitive}
      title={_.MATCH_CASE}
    >
      <b aria-hidden>Aa</b>
    </button>
    <input
      class="bar" type="text"
      bind:value={findInPage.value} bind:this={inputRef}
      on:input={startSearch} placeholder={_.PLACEHOLDER}
    >
    <span class="results" class:null={findInPage.total == 0}>
      {#if findInPage.value}
        {findInPage.ordinal} / {findInPage.total}
      {/if}
    </span>
    <button class="tool" on:click={findNextF(false)}>
      <img src="n-res://{$colorTheme}/arrow.svg" class="up" alt="{_.PREV}">
    </button>
    <button class="tool" on:click={findNextF(true)}>
      <img src="n-res://{$colorTheme}/arrow.svg" class="down" alt="{_.NEXT}">
    </button>
    <button class="tool" style="margin-left: 10px" on:click={toggle}>
      <img src="n-res://{$colorTheme}/cross.svg" alt="{_.DONE}">
    </button>
  </div>
{/if}