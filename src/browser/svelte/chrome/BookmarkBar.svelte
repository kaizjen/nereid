<style>
  .dropdown-box {
    padding-block: 0;
    position: relative;
  }
  .bar {
    display: flex;
    padding-bottom: 4px;
    width: 100%;
  }
  .suggestion {
    padding: 4px;
    padding-left: 16px;
  }
  .bookmark {
    flex-shrink: 1;
    padding: 4px;
    border-radius: 4px;
    max-width: 200px;
    min-width: 50px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    transition: .1s;
    display: flex;
    align-items: center;
    margin-inline: 4px;
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
    width: 16px;
    height: 16px;
    margin-right: 6px;
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
</script>
{#if $config?.ui.showBookmarks && !['nereid://bookmarks', 'nereid://bookmarks/'].includes(pageURL)}
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