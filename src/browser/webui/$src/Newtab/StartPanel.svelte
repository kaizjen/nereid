<style>
  .title {
    max-width: 30cm;
    flex-grow: 1;
  }
  .flex {
    display: flex;
    justify-content: center;
    color: white;
    padding-inline: 40px;
  }
  .grow {
    max-width: 30cm;
    flex-grow: 1;
  }
  .startpanel {
    margin-top: 20px;
  }
  .editpanel {
    background: #3232326b;
    padding-block: 10px;
  }  
  @media (prefers-color-scheme: light) {
    .flex {
      color: black;
      text-shadow: 0 2px 2px white;
    }
    .editpanel {
      background: #ffffff6b;
    }
  }
  .editpanel > * > * {
    margin-block: 10px
  }
  .editheader {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }
  .bookmarkdata {
    display: flex;
  }
  .bookmarkdata * {
    margin-right: 20px;
  }
  .buttoncontainer {
    display: flex;
    justify-content: right;
  }
</style>

<script>
  import Bookmark from "./Bookmark.svelte";
  import { Button, IconButton, TextBox } from "fluent-svelte";
  import * as Icons from "../icons.js";

  const { t } = window.nereid.i18n
  let bookmarks = [];
  const promise = window.nereid.userdata.bookmarks.getFolder({ folder: '@startPanel' }).then(bms => bookmarks = bms);
  function tt(str, ...args) {
    return t(`pages.newtab.startPanel.${str}`, ...args)
  }

  const isDark = matchMedia(`(prefers-color-scheme: dark)`).matches;

  const MODE_NONE = 0;
  const MODE_EDITING = 1;
  const MODE_CREATING = 2;

  let mode = MODE_NONE;

  let editTargetIndex = -1;
  let currentName = '';
  let currentURL = '';

  function isSameSite(url1, url2) {
    try {
      return new URL(url1).hostname == new URL(url2).hostname;
    } catch (_) {
      return false;
    }
  }

  function editF(i) {
    return function () {
      editTargetIndex = i;
      currentName = bookmarks[i].name;
      currentURL = bookmarks[i].url;
      mode = MODE_EDITING;
      window.lockKeyEvents()
    }
  }

  function deleteF(i) {
    return async function () {
      bookmarks.splice(i, 1);
      await window.nereid.userdata.bookmarks.setFolder({ folder: '@startPanel', value: bookmarks });
      bookmarks = bookmarks;
    }
  }

  async function handleSave() {
    if (mode == MODE_EDITING) {
      const prevURL = bookmarks[editTargetIndex].url
      bookmarks[editTargetIndex] = {
        name: currentName, url: currentURL,
        iconURL: isSameSite(prevURL, currentURL) ? bookmarks[editTargetIndex].iconURL : null,
        thumbnailURL: null
      };

    } else {
      bookmarks.push({
        name: currentName, url: currentURL
      })
    }

    currentName = '';
    currentURL = '';

    await window.nereid.userdata.bookmarks.setFolder({ folder: '@startPanel', value: bookmarks });
    bookmarks = bookmarks;
    mode = MODE_NONE;
  }
</script>

{#if mode > MODE_NONE}
  <div class="flex editpanel">
    <div class="grow">
      <div class="editheader">
        <b class="title">
          {mode == MODE_EDITING ? tt('edit-panel', { name: bookmarks[editTargetIndex].name }) : tt('add-panel')}
        </b>
        <IconButton on:click={() => { mode = MODE_NONE; window.unlockKeyEvents() }}>
          <Icons.Close />
        </IconButton>
      </div>
      <div class="bookmarkdata">
        <span>{tt('edit.name')}</span>
        <TextBox bind:value={currentName} />
      </div>
      <div class="bookmarkdata">
        <span>{tt('edit.url')}</span>
        <TextBox bind:value={currentURL} />
      </div>
      <div class="buttoncontainer">
        <Button variant="accent" on:click={handleSave}>
          {tt('button-save')}
        </Button>
      </div>
    </div>
  </div>
{:else}
  <div class="flex">
    <b class="title">{t('common.bookmarkFolders.startPanel')}</b>
  </div>
  <div class="flex">
    <div class="startpanel grow">
      {#await promise then _}
        {#each bookmarks as bookmark, i}
          <Bookmark {bookmark} on:edit={editF(i)} on:delete={deleteF(i)} />
        {/each}
          <Bookmark bookmark={{
            url: '#',
            iconURL: `//res/plus-${isDark ? 'white' : 'black'}.svg`,
            name: tt('addItem')
            }} i={-1} isReal={false} on:click={() => { mode = MODE_CREATING; window.lockKeyEvents(); }} />
      {/await}
    </div>
  </div>
{/if}