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
    transition: .15s;
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

  export let index;
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
  let tabsWithSearchActive = [];
  let values = {};
  let caseSensitive = false;

  let inputRef;

  let shouldStop = false;

  let totalMatchesPerTab = {};
  let matchIndexes = {};

  function stop(clear = false) {
    ipcRenderer.send('@tab', 'stopFind', clear)
    shouldStop = true;
  }

  ipcRenderer.on('toggleFindInPage', () => {
    if (tabsWithSearchActive.includes(index)) {
      tabsWithSearchActive.splice(tabsWithSearchActive.indexOf(index), 1);
      
    } else {
      tabsWithSearchActive.push(index);
      requestAnimationFrame(() => {
        inputRef.focus();
      })
    }
    tabsWithSearchActive = tabsWithSearchActive;
  })

  document.addEventListener('keyup', e => {
    if (e.key == 'Escape' && tabsWithSearchActive.includes(index)) {
      tabsWithSearchActive.splice(tabsWithSearchActive.indexOf(index), 1);
      tabsWithSearchActive = tabsWithSearchActive;
    }
  })

  $: {
    tabsWithSearchActive.forEach((i, index2) => {
      if (!tabs[i]) {
        tabsWithSearchActive.splice(index2, 1)
        delete values[i];
        delete totalMatchesPerTab[i];
        delete matchIndexes[i];
      }
    })
  }

  $: if (values[index] == '') {
    stop(true)
  }

  ipcRenderer.on('found', (_e, idx, { activeMatchOrdinal, matches }) => {
    if (idx != index) return;

    if (shouldStop) stop()
    // sometimes, user says stop before the find request completes

    matchIndexes[index] = activeMatchOrdinal;
    totalMatchesPerTab[index] = matches;
  })

  $: {
    if (!tabsWithSearchActive.includes(index)) {
      stop()
    }
    requestAnimationFrame(() => {
      ipcRenderer.send('chrome:setHeight', document.body.getBoundingClientRect().height)
    })
  }

  function startSearch() {
    if (!values[index]) return;

    shouldStop = false;
    ipcRenderer.send('@tab', 'find', values[index], { newSearch: true, caseSensitive })
  }
  function findNextF(forward) {
    return () => {
      if (!values[index]) return;
      ipcRenderer.send('@tab', 'find', values[index], { forward, newSearch: false, caseSensitive })
    }
  }

  $: {caseSensitive; startSearch()}
</script>

{#if tabsWithSearchActive.includes(index)}
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
      bind:value={values[index]} bind:this={inputRef}
      on:input={startSearch} placeholder={_.PLACEHOLDER}
    >
    <span class="results" class:null={totalMatchesPerTab[index] == 0}>
      {#if values[index]}
        {matchIndexes[index]} / {totalMatchesPerTab[index]}
      {/if}
    </span>
    <button class="tool" on:click={findNextF(false)}>
      <img src="n-res://{$colorTheme}/arrow.svg" class="up" alt="{_.PREV}">
    </button>
    <button class="tool" on:click={findNextF(true)}>
      <img src="n-res://{$colorTheme}/arrow.svg" class="down" alt="{_.NEXT}">
    </button>
    <button class="tool" style="margin-left: 10px" on:click={() => {
      tabsWithSearchActive.splice(tabsWithSearchActive.indexOf(index), 1);
      tabsWithSearchActive = tabsWithSearchActive;
    }}>
      <img src="n-res://{$colorTheme}/cross.svg" alt="{_.DONE}">
    </button>
  </div>
{/if}