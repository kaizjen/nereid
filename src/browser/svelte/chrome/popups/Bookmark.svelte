<style>
  .dialog {
    right: 10px;
  }
  .preview-container {
    background: var(--t-black-6);
    width: 100%;
    height: 7rem;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 1.25rem;
    border-radius: 0.375rem;
    overflow: hidden;
  }
  input {
    margin-bottom: 1.25rem;
  }
  .preview {
    width: inherit;
    height: inherit;
    object-fit: cover;
  }
  b {
    display: block;
    margin-bottom: 0.75rem;
  }
  .folder {
    display: flex;
    width: 100%;
    align-items: center;
    padding: 0.25rem;
    padding-inline: 0.625rem;
    border-radius: 0.25rem;
    transition: .1s;
  }
  .folder:hover {
    background: var(--t-white-3);
  }
  .folder:hover:active {
    background: var(--t-white-5);
    transition: 0s;
  }
  .footer {
    margin-top: 1.25rem;
    display: flex;
    justify-content: end;
  }

  @media (prefers-color-scheme: light) {
    .preview-container {
      background: var(--t-black-2);
    }
    .folder:hover {
      background: var(--t-black-2);
    }
    .folder:hover:active {
      background: var(--t-black-3);
    }
  }
</style>
<script>
  const { ipcRenderer, sendInternal } = window.nereid;
  import { getContext } from "svelte";
  import { fly } from "svelte/transition";
  import { appear } from "//lib/transition.js";
  import Button from "//lib/Button.svelte";

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
      folder.push({
        url: bookmarkURL,
        name: bookmarkTitle,
        iconURL, thumbnailURL,
      })
    }

    sendInternal('userData', 'bookmarks:setFolder', { folder: folderName, value: folder })
  }
</script>
<div class="dialog" in:appear={window.flyoutProperties} out:fly={window.flyoutProperties} on:outroend={() => setTop(false)}>
  <div class="dialog-content">
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
      <Button on:click={() => {open = false}}>
        {_.DONE}
      </Button>
    </div>
  </div>
</div>
<div class="blocker" on:click={() => {open = false}}></div>