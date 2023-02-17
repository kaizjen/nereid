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
  .folder-icon {
    height: 2rem;
    width: 2rem; /* width is necessary because for a split second before the icon loads,
    the animation will glitch and it's gonna be really clunky */
    margin-right: .4rem;
  }
  .bottom {
    display: flex;
    justify-content: flex-end;
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
    NEW_FOLDER: t('ui.bookmarks.create.newFolder'),
    NAME: t('ui.bookmarks.create.name'),
    NEXT: t('ui.bookmarks.create.next'),
    LOADING: t('common.loading'),
    ERROR_EXISTS: t('ui.bookmarks.create.error-alreadyExists'),
    ERROR_EMPTY: t('ui.bookmarks.create.error-empty'),
    ERROR_ILLEGAL: t('ui.bookmarks.create.error-illegalName'),
  }

  setTop(true)

  export let bookmarks;
  export let selectedFolder;
  export let thisBookmark;
  export let selectedBookmarkIndex;
  export let page;
  export let isPage2Returning;

  let name = '';

  let loading = false;

  async function proceed() {
    if (name == '') return error = _.ERROR_EMPTY;
    if (name.startsWith('@')) return error = _.ERROR_ILLEGAL;
    if (bookmarks[name]) return error = _.ERROR_EXISTS;

    error = '';

    selectedFolder = name;
    selectedBookmarkIndex = 0;
    isPage2Returning = true;

    loading = true;

    try {
      await sendInternal('userData', 'bookmarks:addFolder', { folder: name })
      await sendInternal('userData', 'bookmarks:setFolder', { folder: name, value: [ thisBookmark ] })
      
    } catch (error) {
      error = error + '';
    }


    page = 1;
  }
  
  let error = '';
</script>

<div class="topbar">
  <button class="tool" on:click={() => page = 0}>
    <img style:transform="rotate(180deg)" src="n-res://{$colorTheme}/arrow.svg" alt="{_.BACK}">
  </button>
  <b>
    {_.NEW_FOLDER}
  </b>
  <div></div>
</div>
<div class="main">
  <img class="folder-icon" src="n-res://{$colorTheme}/folder.svg" alt="">
  <input class="input" type="text" placeholder={_.NAME} bind:value={name}>
</div>
<div class="err">
  {error}
</div>
<div class="bottom">
  <Button on:click={proceed}>{loading ? _.LOADING : _.NEXT}</Button>
</div>