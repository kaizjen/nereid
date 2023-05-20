<style>
  .tools {
    background: var(--active-background);
    padding: 0.3rem;
    height: 2.3rem;
    display: flex;
    align-items: flex-start;
    -webkit-app-region: no-drag;
    position: relative;
    border-top: 1px solid var(--t-white-5);
  }
  .tool {
    padding: 0.4rem;
    padding-inline: 0.76rem;
  }
  .tool.wide {
    /* Some icons have their natural padding, this class accounts for it (TODO: remove this?) */
    padding-inline: 0.86rem;
  }
  .tool img {
    height: 1.35rem;
  }
  :global([dir=rtl]) .arrow-img {
    transform: rotate(180deg);
  }
  .disabled {
    opacity: 0.5;
  }
  .progressbar-container {
    position: relative;
  }
  .progress-bar {
    position: absolute;
    bottom: 0;
    margin-bottom: 2px;
    background: #3b3b3b70;
    width: 80%;
    height: 3px;
    overflow: hidden;
    border-radius: 2px;
  }
  .progress {
    background: var(--accent-5);
    height: 100%;
  }
  .nav.disabled:hover {
    background: transparent;
  }
  .rotated {
    transform: rotate(180deg);
  }

  @media (prefers-color-scheme: light) {
    .tools {
      background: var(--active-background);
      border-top-color: var(--t-black-6);
    }
    .progress-bar {
      background: #3b3b3b70;
    }
    .progress {
      background: var(--accent-5);
    }
  }
</style>

<script>
  export let tab = {};
  const { ipcRenderer } = window.nereid;
  import Omnibox from "./Omnibox.svelte"
  import { getContext } from "svelte/internal";
  import Downloads from "./popups/Downloads.svelte";

  const { t } = window;
  const _ = {
    BACK: t('navigation.back'),
    FWD: t('navigation.forward'),
    STOPLOAD: t('ui.tools.load-stop'),
    REFRESHLOAD: t('ui.tools.load-refresh'),
    DOWNLOADS: t('ui.tools.downloads.title'),
    MORE: t('ui.tools.more'),
  }
  
  const colorTheme = getContext('colorTheme')

  let downloadPercent = 0;
  let downloadInfo;

  let downloadsDialog = false;

  ipcRenderer.on('downloadStatus', (_e, { state, recieved, total }) => {
    if (state == 'interrupted' || state == 'cancelled' || state == 'completed') {
      downloadPercent = 0;
      downloadInfo = null;
    } else downloadPercent = recieved / total * 100
  })
  ipcRenderer.on('downloadStart', (_e, i) => {
    downloadInfo = { ...i, paused: false };
  })

  function navBack() {
    ipcRenderer.send('currentTab.back')
  }
  function navFwd() {
    ipcRenderer.send('currentTab.forward')
  }
  function refreshOrStop(e) {
    if (tab.isLoading) {
      ipcRenderer.send('currentTab.stop')

    } else {
      ipcRenderer.send((e.shiftKey || e.ctrlKey) ? 'currentTab.hardRefresh' : 'currentTab.refresh')
    }
  }
</script>

<svelte:window on:keydown={e => {
  if (e.key != "Escape" || !downloadsDialog) return;
  downloadsDialog = false;
}} />
<div class="tools" class:private={tab.private}>
  {#if !window.isSingleTab}
    <button class="tool nav arrow-img" class:disabled={!tab.nav?.canGoBack} on:click={navBack}><img alt={_.BACK} src="n-res://{$colorTheme}/arrow.svg" class="rotated"></button>
    <button class="tool nav arrow-img" class:disabled={!tab.nav?.canGoFwd} on:click={navFwd}><img alt={_.FWD} src="n-res://{$colorTheme}/arrow.svg"></button>
    <button class="tool nav wide" on:click={refreshOrStop}><img alt={tab.isLoading ? _.STOPLOAD : _.REFRESHLOAD} src={tab.isLoading ? `n-res://${$colorTheme}/cross.svg` : `n-res://${$colorTheme}/redo.svg`}></button>
  {/if}
  <Omnibox {tab} disabled={window.isSingleTab} />
  <button
    class="tool wide progressbar-container"
    class:open={downloadsDialog}
    on:click={({ currentTarget }) => downloadsDialog = downloadsDialog ? false : currentTarget.getBoundingClientRect()}
  >
    <img src="n-res://{$colorTheme}/downloads.svg" alt={_.DOWNLOADS}>
    {#if downloadInfo}
      <div class="progress-bar">
        <div class="progress" style="width: {downloadPercent}%;" />
      </div>
    {/if}
  </button>
  {#if !window.isSingleTab}
    <button class="tool" on:click={(e) => {
      let { bottom, left } = e.currentTarget.getBoundingClientRect()
      ipcRenderer.send('chrome.browserMenu', {
        x: left, y: bottom
      })
    }}><img alt={_.MORE} src="n-res://{$colorTheme}/more.svg"></button>
  {/if}
  {#if downloadsDialog}
    <Downloads bind:open={downloadsDialog} {downloadPercent} {downloadInfo} triggerRect={downloadsDialog} />
  {/if}
</div>