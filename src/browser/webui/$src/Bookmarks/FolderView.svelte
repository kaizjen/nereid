<style>
  .title {
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
<script>
  import { Button, Flyout, IconButton, ProgressRing, TextBlock, TextBox } from "fluent-svelte";
  import Bookmark from "./Bookmark.svelte";
  import * as Icons from "../icons.js"
  import EditBookmark from "./EditBookmark.svelte";

  export let selectedFolder = '';
  const { t } = window.nereid.i18n
  export let tt;
  export let localizedName;
  export let update;
  export let isInFolders;

  let bookmarks = [];

  let editFlyout = false;
  let deleteFlyout = false;
  let addDialog = false;

  $: promise = new Promise(async y => {
    bookmarks = await window.nereid.userdata.bookmarks.getFolder({ folder: selectedFolder });
    y();
  })

  function delF(i) {
    return async () => {
      bookmarks.splice(i, 1);
      await window.nereid.userdata.bookmarks.setFolder({ folder: selectedFolder, value: bookmarks });
      bookmarks = bookmarks;
    }
  }

  async function deleteFolder() {
    await window.nereid.userdata.bookmarks.delFolder({ folder: selectedFolder });
    update()
  }

  $: newFolderName = selectedFolder;
  async function rename() {
    if (newFolderName == '') return alert(tt('addFolder.error-empty'));
    if (newFolderName.startsWith('@')) return alert(tt('addFolder.error-illegalName'));
    if (isInFolders(newFolderName)) return alert(tt('addFolder.error-alreadyExists'));

    await window.nereid.userdata.bookmarks.renFolder({ folder: selectedFolder, name: newFolderName });
    await update()
    selectedFolder = newFolderName;
  }

  async function addNew({ detail: { name, url } }) {
    bookmarks.unshift({ name, url });
    await window.nereid.userdata.bookmarks.setFolder({ folder: selectedFolder, value: bookmarks });
    bookmarks = bookmarks;
    addDialog = false;
  }

  function editF(i) {
    return async function ({ detail: { name, url } }) {
      bookmarks[i].name = name;
      bookmarks[i].url = url;
      await window.nereid.userdata.bookmarks.setFolder({ folder: selectedFolder, value: bookmarks });
      bookmarks = bookmarks;
    }
  }
</script>

{#await promise}
  <ProgressRing />
{:then _}
  <div class="title">
    <TextBlock variant="title">{localizedName}</TextBlock>
    <div class="actions">
      {#if !selectedFolder.startsWith('@')}
        <Flyout placement="bottom" bind:open={editFlyout}>
          <IconButton>
            <Icons.Edit title={tt('folder.rename')} />
          </IconButton>
          <svelte:fragment slot="flyout">
            <TextBox bind:value={newFolderName} />
            <br>
            <Button on:click={rename}>{t('common.ok')}</Button>
          </svelte:fragment>
        </Flyout>
        <Flyout placement="bottom" bind:open={deleteFlyout}>
          <IconButton>
            <Icons.Delete title={tt('folder.delete')} />
          </IconButton>
          <svelte:fragment slot="flyout">
            <TextBlock variant="bodyStrong">{tt('folder.confirmDelete')}</TextBlock><br><br>
            <Button on:click={() => deleteFlyout = false}>
              {t('common.cancel')}
            </Button>
            <Button on:click={deleteFolder} variant="accent">
              {tt('folder.button-confirm')}
            </Button>
          </svelte:fragment>
        </Flyout>
      {/if}
      
      <IconButton on:click={() => addDialog = true}>
        <Icons.Add title={tt('button-addBookmark')} />
      </IconButton>
      <EditBookmark bind:open={addDialog} on:click={addNew} {tt} buttonText={tt('bookmark.button-create')} />
    </div>
  </div>
  {#each bookmarks as bookmark, i}
    <Bookmark {bookmark} {tt} del={delF(i)} on:edit={editF(i)} index={i} />
  {/each}
{/await}