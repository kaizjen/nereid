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
    border-radius: 0.25rem;
    overflow: hidden;
  }
  input {
    margin-bottom: 1.25rem;
  }
  .preview {
    width: inherit;
    height: inherit;
    object-fit: cover;
    aspect-ratio: 2;
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
    transition: .25s;
  }
  .folder:hover {
    background: var(--t-white-3);
  }
  .folder:hover:active {
    background: var(--t-white-5);
    transition: 0s;
  }
  .folder.create {
    margin-top: 1rem;
  }
  .folder > img {
    margin-right: 0.1rem;
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
  import { appear, modalPageAnimations } from "//lib/transition.js";
  import Button from "//lib/Button.svelte";
  import Bookmark from "./Bookmark/Bookmark.svelte";
  import { cubicOut } from "svelte/easing";
  import CreateFolder from "./Bookmark/CreateFolder.svelte";

  const setTop = getContext('setTop');
  const colorTheme = getContext('colorTheme');

  const { t } = window;
  const _ = {
    BMS_LIST: t('ui.bookmarks.list'),
    ADD_TO_FOLDER: t('ui.bookmarks.addToFolder'),
    EDIT: t('ui.bookmarks.editBookmark'),
    CREATE: t('ui.bookmarks.createFolder'),
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

  let selectedFolder = null;
  let selectedBookmarkIndex = 0;
  let page = 0;

  let animationControls = {};
  let noAnimation = true;
  let page0;
  let page1;
  let page2;
  let isPage2Returning = false;

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
      selectedFolder = folderName;
      selectedBookmarkIndex = folder.findIndex(v => compareURLs(v.url, bookmarkURL));
      page = 1;

    } else {
      folder.push({
        url: bookmarkURL,
        name: bookmarkTitle,
        iconURL, thumbnailURL,
      })
    }

    sendInternal('userData.bookmarks.setFolder', { folder: folderName, value: folder })
  }

</script>
<div
  class="dialog"
  in:appear={{...window.flyoutProperties, isStatic: true}}
  out:fly={window.flyoutProperties}
  on:outroend={() => setTop(false)}
  use:modalPageAnimations={{ animationControls, duration: 200, easing: 'cubic-bezier(0,.5,.44,.85)' }}
>
  {#if page == 0}
    <!--
      For some reason, svelte only allows dynamic parameters in in: and out: attrubutes
      and not in the transition: attribute.
    -->
    <div
      class="dialog-content"
      in:fly={noAnimation ? { duration: 0 } : { duration: 200, x: -50, easing: cubicOut }}
      out:fly={noAnimation ? { duration: 0 } : { duration: 200, x: -50, easing: cubicOut }}
      bind:this={page0}
      on:introstart={() => {
        if (noAnimation) return noAnimation = false;
        animationControls.setLastSize(page0.getBoundingClientRect());
        animationControls.transition();
      }}
      on:outrostart={() => {
        if (noAnimation) return;
        animationControls.setFirstSize(page0.getBoundingClientRect());
        page0.style.position = 'absolute';
      }}
    >
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
          title={folder.find(v => compareURLs(v.url, bookmarkURL)) ? _.EDIT : _.ADD_TO_FOLDER}
        >
          <img
            src="n-res://{$colorTheme}/{folder.find(v => compareURLs(v.url, bookmarkURL)) ? 'pen' : 'plus'}.svg"
            alt={folder.find(v => compareURLs(v.url, bookmarkURL)) ? _.EDIT : _.ADD_TO_FOLDER}
          >
          <span>{getFolderName(folderName)}</span>
        </button>
      {:else}
        :(
      {/each}
      <button
        class="folder create"
        on:click={() => {page = 2; isPage2Returning = false}}
      >
        <img src="n-res://{$colorTheme}/folder-plus.svg" alt="">
        <span>{_.CREATE}</span>
      </button>
      <div class="footer">
        <Button on:click={() => {noAnimation = true; open = false}}>
          {_.DONE}
        </Button>
      </div>
    </div>
  {:else if page == 1}
    <div
      class="dialog-content"
      transition:fly={{ duration: 200, x: 50, easing: cubicOut }}
      bind:this={page1}
      on:introstart={() => {
        animationControls.setLastSize(page1.getBoundingClientRect());
        animationControls.transition();
      }}
      on:outrostart={() => {
        if (noAnimation) return;
        animationControls.setFirstSize(page1.getBoundingClientRect());
        page1.style.position = 'absolute';
      }}
    >
      <Bookmark {selectedBookmarkIndex} {selectedFolder} bind:bookmarks bind:page />
    </div>
  {:else if page == 2}
    <!-- See above for why both in: and out: are here. -->
    <div
      class="dialog-content"
      in:fly={{ duration: 200, x: 50, easing: cubicOut }}
      out:fly={{ duration: 200, x: isPage2Returning ? -50 : 50, easing: cubicOut }}
      bind:this={page2}
      on:introstart={() => {
        animationControls.setLastSize(page2.getBoundingClientRect());
        animationControls.transition();
      }}
      on:outrostart={() => {
        if (noAnimation) return;
        animationControls.setFirstSize(page2.getBoundingClientRect());
        page2.style.position = 'absolute';
      }}
    >
      <CreateFolder
        bind:bookmarks
        bind:page
        bind:isPage2Returning
        bind:selectedFolder
        bind:selectedBookmarkIndex
        thisBookmark={{ url: bookmarkURL, name: bookmarkTitle, iconURL, thumbnailURL }}
      />
    </div>
  {/if}
</div>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="blocker" on:click={() => {noAnimation = true; open = false}}></div>