<style>
  .topbar {
    display: flex;
    justify-content: flex-start;
    padding-bottom: 0.2rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--gray-1);
    align-items: center;
  }
  .topbar b {
    display: block;
    margin-left: .4rem;
  }
  .main {
    display: flex;
    align-items: center;
    margin-block: .4rem;
  }
  img.favicon {
    height: 2rem;
    width: 2rem; /* width is necessary because for a split second before the icon loads,
    the animation will glitch and it's gonna be really clunky */
    margin-right: .4rem;
  }
  .urlinput {
    margin-bottom: 1.2rem;
  }
  .bottom {
    display: flex;
    justify-content: flex-end;
  }
  .confirm-message {
    white-space: pre-wrap;
    overflow: hidden;
    margin-bottom: .5rem;
  }

  @media (prefers-color-scheme: light) {
    .topbar {
      border-bottom-color: var(--gray-9);
    }
  }
</style>
<script>
  const { sendInternal } = window.nereid;
  import { getContext } from "svelte";
  import Button from "//lib/Button.svelte";

  const setTop = getContext('setTop');
  const colorTheme = getContext('colorTheme');

  const { t } = window;
  const _ = {
    BACK: t('common.back'),
    CANCEL: t('common.cancel'),
    SITE_ICON: t('ui.bookmarks.edit.siteIcon'),
    NAME: t('ui.bookmarks.edit.name'),
    URL: t('ui.bookmarks.edit.URL'),
    DELETE: t('ui.bookmarks.edit.delete'),
    CONFIRM: t('ui.bookmarks.edit.confirmation'),
  }

  setTop(true)

  export let bookmarks;
  export let selectedFolder;
  export let selectedBookmarkIndex;
  export let page;

  const BUTTON_STYLE = 'margin-inline: .1rem;';

  if (!selectedFolder) {
    alert("Error: no folder selected")
  }

  $: thisBookmark = bookmarks[selectedFolder][selectedBookmarkIndex] || {};

  $: previewSrc = thisBookmark.iconURL ? ('get:' + thisBookmark.iconURL) : `n-res://${$colorTheme}/webpage.svg`;

  function getFolderName(rawName) {
    if (rawName.startsWith('@')) {
      return t('common.bookmarkFolders.'+rawName.slice(1))

    } else {
      return rawName;
    }
  }

  let confirmation = false;

  function update() {
    sendInternal('userData.bookmarks.setFolder', { folder: selectedFolder, value: bookmarks[selectedFolder] })
  }

  function del() {
    bookmarks[selectedFolder].splice(selectedBookmarkIndex, 1);
    update()
    page = 0;
  }
</script>

<div class="topbar">
  <button class="tool" on:click={() => page = 0}>
    <img style:transform="rotate(180deg)" src="n-res://{$colorTheme}/arrow.svg" alt="{_.BACK}">
  </button>
  <b>
    {getFolderName(selectedFolder)}
  </b>
  <div></div>
</div>
<div class="main">
  <img class="favicon" src="{previewSrc}" alt="{_.SITE_ICON}">
  <input class="input" type="text" placeholder={_.NAME} bind:value={bookmarks[selectedFolder][selectedBookmarkIndex].name} on:input={update}>
</div>
<div class="urlinput">
  <input class="input" type="text" placeholder={_.URL} bind:value={bookmarks[selectedFolder][selectedBookmarkIndex].url} on:input={update}>
</div>
{#if confirmation}
  <div class="confirm-message">
    {_.CONFIRM}
  </div>
  <div class="bottom">
    <Button style={BUTTON_STYLE} on:click={() => confirmation = false}>{_.CANCEL}</Button>
    <Button style={BUTTON_STYLE} on:click={del}>{_.DELETE}</Button>
  </div>
{:else}
  <div class="bottom">
    <Button on:click={() => confirmation = true}>{_.DELETE}</Button>
  </div>
{/if}