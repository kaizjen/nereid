<style>
  .dialog {
    right: 10px;
  }
  .preview-container {
    background: #00000031;
    width: 5cm;
    height: 3cm;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
    border-radius: 6px;
    overflow: hidden;
  }
  input {
    margin-bottom: 20px;
  }
  .preview {
    width: inherit;
    height: inherit;
    object-fit: cover;
  }
  .folder {
    display: flex;
    align-items: center;
    padding: 4px;
    padding-inline: 10px;
    border-radius: 4px;
    transition: .1s;
  }
  .folder:hover {
    background: var(--button-hover);
    transition: 0s;
  }
  .folder:active {
    background: var(--button-active);
  }
  .footer {
    margin-top: 20px;
    display: flex;
    justify-content: end;
  }
</style>
<script>
  const { ipcRenderer, sendInternal } = window.nereid
  import { getContext } from "svelte"
  import { fly } from "svelte/transition"
  import Button from "//lib/Button.svelte"

  const setTop = getContext('setTop');
  const colorTheme = getContext('colorTheme');

  const { t } = window;
  const _ = {
    BMS_LIST: t('ui.bookmarks.list'),
    ADD_TO_FOLDER: t('ui.bookmarks.addToFolder'),
    REMOVE_FROM_FOLDER: t('ui.bookmarks.removeFromFolder'),
    DONE: t('common.done'),
  }

  setTop(true)

  export let open;
  export let tab;
  export let bookmarks;

  let previewSrc = 'n-res://dark/webpage.svg';

  void async function () {
    let src = await ipcRenderer.invoke('getPageImageURL', 'preview', tab.uid);
    if (!src.startsWith('data:')) src = 'get:' + src;

    previewSrc = src;
  }()

  let iconURL;
  ipcRenderer.invoke('getPageImageURL', 'favicon', tab.uid).then(url => iconURL = url)

  let thumbnailURL;
  ipcRenderer.invoke('getPageImageURL', 'thumbnail', tab.uid).then(url => thumbnailURL = url)

  let bookmarkTitle = tab.title;
  const bookmarkURL = tab.url;

  function compareURLs(url1, url2) {
    try {
      return new URL(url1).href == new URL(url2).href

    } catch (_) {
      return false
    }
  }

  function getFolderName(rawName) {
    if (rawName.startsWith('@')) {
      return t('common.bookmarkFolders.'+rawName.slice(1))

    } else {
      return rawName;
    }
  }

  function addOrRemoveF(folderName) {
    const folder = bookmarks[folderName];

    if (folder.find(v => compareURLs(v.url, bookmarkURL))) {
      folder.splice(folder.findIndex(v => compareURLs(v.url, bookmarkURL)), 1);

    } else {
      console.log('adding bm', {
        url: bookmarkURL,
        name: bookmarkTitle,
        iconURL, thumbnailURL,
      });
      folder.unshift({
        url: bookmarkURL,
        name: bookmarkTitle,
        iconURL, thumbnailURL,
      })
    }

    sendInternal('userData', 'bookmarks:setFolder', { folder: folderName, value: folder })
  }
</script>
<div class="dialog" in:fly={window.flyoutProperties}>
  <div class="preview-container">
    <img class="preview" src={previewSrc} alt="">
  </div>
  <div>
    <input class="input" type="text" bind:value={bookmarkTitle}>
  </div>
  <b>{_.BMS_LIST}</b>
  {#each Object.keys(bookmarks) as folderName}
    {@const folder = bookmarks[folderName]}
    <button
      class="folder"
      on:click={addOrRemoveF(folderName)}
      title={folder.find(v => compareURLs(v.url, bookmarkURL)) ? _.REMOVE_FROM_FOLDER : _.ADD_TO_FOLDER}
    >
      <img
        src="n-res://{$colorTheme}/{folder.find(v => compareURLs(v.url, bookmarkURL)) ? 'cross' : 'plus'}.svg"
        alt={folder.find(v => compareURLs(v.url, bookmarkURL)) ? _.REMOVE_FROM_FOLDER : _.ADD_TO_FOLDER}
      >
      <span>{getFolderName(folderName)}</span>
    </button>
  {:else}
    :(
  {/each}
  <div class="footer">
    <Button on:click={() => {setTop(false); open = false}}>
      {_.DONE}
    </Button>
  </div>
</div>
<div class="blocker" on:click={() => {setTop(false); open = false}}></div>