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
    border-radius: 0.25rem;
    max-width: 12.5rem;
    min-width: 3.125rem;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    transition: .1s;
    display: flex;
    align-items: center;
    margin-inline: 0.25rem;
  }
  .bookmark:hover {
    background: var(--button-hover);
    transition: 0s;
  }
  .bookmark:active {
    background: var(--button-active);
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
      await nereid.sendInternal('userData', 'bookmarks:addFolder', { folder: '@bookmarkBar' })
    }
  }
  ipcRenderer.on('userData/bookmarks', (_, arg) => update(arg))

  const setHeight = () => ipcRenderer.send('chrome:setHeight', document.body.getBoundingClientRect().height)
  $: {
    $config?.ui.showBookmarks;
    pageURL;
    setHeight();
    requestAnimationFrame(setHeight);
  }

  $: console.log('cfg', $config)

  function ctxMenuF(bookmark, i) {
    return function () {
      ipcRenderer.send('chrome:menu-of-bookmark', bookmark, i)
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
          on:click={() => ipcRenderer.send('@tab', 'navigate-hint', bm.url)}
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