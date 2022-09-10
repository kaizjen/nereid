<style>
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

  .file-image {
    padding-inline: 4px;
  }

  .open-file {
    cursor: pointer;
  }
  .open-file:hover {
    opacity: 0.8;
  }
  .open-file:active {
    opacity: 0.6;
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
</style>

<script>
  import { getContext, createEventDispatcher } from "svelte/internal";
  const { sendInternal, shell, basename } = window.nereid;

  export let download;
  export let index;

  const { t } = window;
  const _ = {
    act: {
      AGAIN: t('ui.tools.downloads.again'),
      DELETE: t('ui.tools.downloads.delete'),
    },
    status: {
      COMPLETED: t('ui.tools.downloads.status-completed'),
      INTERRUPTED: t('ui.tools.downloads.status-interrupted')
    }
  }

  let downloadsAPI = getContext('downloads')
  const colorTheme = getContext('colorTheme')

  const dispath = createEventDispatcher()

  function openFile() {
    shell.openPath(download.savePath);
  }

  let image = '';

  void async function () {
    image = 'data:image/png;base64,' + await sendInternal('getFileIcon', download.savePath)
  }()
</script>

<div class="dl-wrapper">
  <div class="file-image">
    <img src={image} alt="">
  </div>
  <div class="download">
    <b class="open-file" on:click={openFile}>
      {basename(download.savePath)}
    </b><br>
    <span class="url">{download.url}</span><br>
    <span class="more-info"> {download.status == 'completed' ? _.status.COMPLETED : _.status.INTERRUPTED} </span>
  </div>
  <div class="dl-buttons">
    <button class="mini-btn" on:click={() => {
      downloadsAPI.create(index)
    }}>
      <img src="n-res://{$colorTheme}/redo.svg" alt={_.act.AGAIN}>
    </button>
    <button class="mini-btn" on:click={() => dispath('delete')}>
      <img src="n-res://{$colorTheme}/cross.svg" alt={_.act.DELETE}>
    </button>
  </div>
</div>