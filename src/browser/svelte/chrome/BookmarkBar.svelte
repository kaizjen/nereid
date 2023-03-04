<style>
  .dropdown-box {
    padding-block: 0;
    position: relative;
  }
  .bar {
    display: flex;
    padding-bottom: 0.25rem;
    width: 100%;
  }
  .suggestion {
    padding: 0.25rem;
    padding-left: 1rem;
  }
  .bookmark {
    flex-shrink: 1;
    padding: 0.25rem;
    padding-inline: 0.35rem;
    border-radius: 0.25rem;
    max-width: 12.5rem;
    min-width: 3.125rem;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    transition: .25s;
    display: flex;
    align-items: center;
    margin-inline: 0.25rem;
  }
  .bookmark:hover {
    background: var(--t-white-2);
  }
  .bookmark:hover:active {
    background: var(--t-white-4);
    transition: 0s;
  }
  .bookmark span {
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .icon {
    width: 1rem;
    height: 1rem;
    margin-right: 0.375rem;
  }

  @media (prefers-color-scheme: light) {
    .bookmark:hover {
      background: var(--t-black-2);
    }
    .bookmark:active {
      background: var(--t-black-3);
    }
  }
</style>
<script>
  import { getContext } from "svelte";

  export let pageURL;

  const config = getContext('config')
  const { t } = window;
  const { ipcRenderer } = nereid;

  const _ = {
    SUGGESTION: t('ui.bookmarkBar.suggestion')
  }

  let bookmarks = [];
  async function update(tree) {
    if ('@bookmarkBar' in tree) {
      bookmarks = tree['@bookmarkBar']

    } else {
      await nereid.sendInternal('userData.bookmarks.addFolder', { folder: '@bookmarkBar' })
    }
  }
  ipcRenderer.on('userData/bookmarks', (_, arg) => update(arg))

  const setHeight = () => ipcRenderer.send('chrome.setHeight', document.body.getBoundingClientRect().height)
  $: {
    $config?.ui.showBookmarks;
    pageURL;
    setHeight();
    requestAnimationFrame(setHeight);
  }

  $: console.log('cfg', $config)

  function ctxMenuF(bookmark, i) {
    return function () {
      ipcRenderer.send('chrome.menuOfBookmark', bookmark, i)
    }
  }

  let shouldShowBookmarks;
  $: shouldShowBookmarks = (
    $config?.ui.showBookmarks == 'all' ||
    ($config?.ui.showBookmarks == 'newtab' && pageURL?.startsWith('nereid://newtab'))
  )
</script>
{#if shouldShowBookmarks}
  <div class="dropdown-box">
    <div class="bar">
      {#each bookmarks as bm, i}
        <button
          class="bookmark"
          title={bm.url}
          on:click={() => ipcRenderer.send('currentTab.navigate', bm.url, true)}
          on:contextmenu|preventDefault={ctxMenuF(bm, i)}
        >
          {#if bm.iconURL}
            <img class="icon" src={'get:' + bm.iconURL} alt="" />
          {/if}
          <span>
            {bm.name}
          </span>
        </button>
      {:else}
        <span class="suggestion">{_.SUGGESTION}</span>
      {/each}
    </div>
  </div>
{/if}