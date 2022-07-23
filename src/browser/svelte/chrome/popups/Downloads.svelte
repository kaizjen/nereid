<style>
  .blocker {
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 9;
    top: 0;
    left: 0;
  }
  .dialog {
    z-index: 10;
    background: var(--dialog-background);
    border: 1px solid var(--trivial-color);
    display: block;
    position: absolute;
    border-radius: 8px;
    max-width: 380px;
    padding: 12px;
    top: 110%;
    right: 0;
    overflow: hidden;
    cursor: default;
  }
  h3 {
    margin-top: 0.5em;
  }

  .empty {
    width: 380px;
    text-align: center;
    color: var(--trivial-text);
  }

  .dl-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .dl-wrapper:not(:last-child) {
    border-bottom: var(--trivial-color) 1px solid;
  }
  .download {
    padding: 4px;
    overflow: hidden;
  }

  .dl-buttons {
    margin-left: 16px;
    display: flex;
  }
  .mini-btn {
    padding: 14px;
    width: 15px;
    height: 15px;
    overflow: hidden;
    display: inline-flex;
    border-radius: 50%;
    align-items: center;
    justify-content: center;
    transition: 0.15s;
  }
  .mini-btn:hover {
    background: #ffffff59;
    transition: 0s;
  }
  .mini-btn:active {
    background: #ffffff94;
    transition: .15s;
  }
  .mini-btn > img {
    width: inherit;
    height: inherit;
  }
  .url {
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--trivial-text);
  }
  .more-info {
    font-size: small;
    color: var(--trivial-text);
  }
  .btn-container {
    display: flex;
    justify-content: space-between;
    margin-top: 15px;
  }
</style>

<script>
  export let open = true;
  export let downloadInfo;
  export let downloadPercent;
  import { getContext } from "svelte/internal";
  const { ipcRenderer, shell, basename } = window.nereid;
  import { fly } from "svelte/transition";
  import Button from "//lib/Button.svelte";

  const { t } = window;
  const _ = {
    LOADING: t('common.loading'),
    TITLE: t('ui.tools.downloads.title'),
    CURRENT: t('ui.tools.downloads.current'),
    act: {
      RESUME: t('ui.tools.downloads.resume'),
      PAUSE: t('ui.tools.downloads.pause'),
      CANCEL: t('ui.tools.downloads.cancel'),
      AGAIN: t('ui.tools.downloads.again'),
      DELETE: t('ui.tools.downloads.delete'),
    },
    status: {
      COMPLETED: t('ui.tools.downloads.status-completed'),
      INTERRUPTED: t('ui.tools.downloads.status-interrupted')
    },
    EMPTY: t('ui.tools.downloads.empty'),
    OPEN_PAGE: t('ui.tools.downloads.open-downloads'),
    OPEN_FOLDER: t('ui.tools.downloads.open-folder')
  }

  const setTop = getContext('setTop')
  const colorTheme = getContext('colorTheme')

  setTop(true)

  let downloadsAPI = getContext('downloads')
  let config = getContext('config')

  let downloadsProm = downloadsAPI.get().then(allDls => allDls.slice(0, 8))

  $: {downloadInfo; {
    downloadsProm = downloadsAPI.get().then(allDls => allDls.slice(0, 8))
  }}
</script>

<div class="dialog" in:fly={window.flyoutProperties}>
  {#if downloadInfo}
    <h3>{_.CURRENT}</h3>
    <div class="dl-wrapper">
      <div class="download">
        <span>{basename(downloadInfo.path)}</span> <br>
        <span class="url"> {downloadInfo.url} </span><br>
        <span class="more-info"> {downloadPercent.toString().slice(0, 4)}% downloaded </span> <!-- "10.723" => "10.7" -->
      </div>
      <div class="dl-buttons">
        <button class="mini-btn" on:click={() => {
          if (downloadInfo.paused) {
            ipcRenderer.send('dl:resume');
            downloadInfo.paused = false
            downloadInfo = downloadInfo;
            
          } else {
            ipcRenderer.send('dl:pause');
            downloadInfo.paused = true
            downloadInfo = downloadInfo;
          }
        }}>
          <img src="n-res://{$colorTheme}/tools_dls_{downloadInfo.paused ? 'resume' : 'pause'}.svg"
          alt="{downloadInfo.paused ? _.act.RESUME : _.act.PAUSE}">
        </button>
        <button class="mini-btn" on:click={() => {
          ipcRenderer.send('dl:cancel');
          downloadsProm = downloadsAPI.get().then(allDls => allDls.slice(0, 8));
          // update the already done downloads
        }}>
          <img src="n-res://{$colorTheme}/tools_dls_cancel.svg" alt={_.act.CANCEL}>
        </button>
      </div>
    </div>
  {/if}

  <h3>{_.TITLE}</h3>

  <div>
    {#await downloadsProm}
      <div class="empty"> {_.LOADING} </div>
    {:then downloads}
      {#each downloads as download, index}
        <div class="dl-wrapper">
          <div class="download">
            <b>{basename(download.savePath)}</b><br>
            <span class="url">{download.url}</span><br>
            <span class="more-info"> {download.status == 'completed' ? _.status.COMPLETED : _.status.INTERRUPTED} </span>
          </div>
          <div class="dl-buttons">
            <button class="mini-btn" on:click={() => {
              downloadsAPI.create(index)
            }}>
              <img src="n-res://{$colorTheme}/tools_dls_redownload.svg" alt={_.act.AGAIN}>
            </button>
            <button class="mini-btn" on:click={async() => {
              await downloadsAPI.delete(index);
              downloads.splice(index, 1);
              downloads = downloads; // update
            }}>
              <img src="n-res://{$colorTheme}/tools_dls_delete.svg" alt={_.act.DELETE}>
            </button>
          </div>
        </div>
      {:else}
        <div class="empty"> {_.EMPTY} </div>
      {/each}
    {/await}
  </div>

  <div class="btn-container">
    <Button outline={true} on:click={() => {
      ipcRenderer.send('newTab', { url: 'nereid://downloads' });
      open = false;
      setTop(false)
    }}>
      {_.OPEN_PAGE}
    </Button>
    {#if $config?.behaviour.downloadPath}
      <Button outline={true} on:click={() => {
        shell.openPath(($config?.behaviour.downloadPath).replaceAll('%s', ''))
      }}>
      {_.OPEN_FOLDER}
    </Button>
    {/if}
  </div>
</div>

<div class="blocker" on:click={() => {open = false; setTop(false)}}></div>
