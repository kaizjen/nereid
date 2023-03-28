<style>
  .wrapper {
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100%;
    width: 100%;
  }
  main {
    display: flex;
  }
  aside {
    padding-top: 20px;
    min-width: 7cm;
  }
  .contentwrapper {
    flex-grow: 1;
    padding-block: 12px;
    display: flex;
    justify-content: center;
    height: 100%;
    padding-inline: 30px;
  }
  .content {
    max-width: 20cm;
    flex-grow: 1;
    height: 100%;
    box-sizing: border-box;
    overflow: auto;
    padding-bottom: 40px;
  }
  .addFolder {
    margin: 5px;
  }
  .end {
    display: flex;
    justify-content: end;
  }
  .err {
    color: red;
    font-size: small;
  }
</style>
<script>
  import { Button, ListItem, TextBlock, TextBox } from "fluent-svelte";
  import FolderView from "./Bookmarks/FolderView.svelte";
  import Header from "./common/Header.svelte";
  import * as Icons from "./icons.js";

  window.action = decodeURIComponent(location.hash.slice(1));
  location.hash = '';

  const { t } = window.nereid.i18n;
  function tt(str, ...args) {
    return t(`pages.bookmarks.${str}`, ...args)
  }

  function getFolderName(folderName) {
    if (folderName.startsWith('@')) {
      return t(`common.bookmarkFolders.${folderName.slice(1)}`)

    } else return folderName;
  }

  let promise;
  window.isFirstTime = true;
  function update() {
    promise = new Promise(async y => {
      folders = await window.nereid.userdata.bookmarks.getAllFolders();
      let actionFolder = window.action.split('/')[0];
      if (isFirstTime && folders.includes(actionFolder)) {
        selectedFolder = actionFolder;

      } else {
        selectedFolder = folders[0]
      }
      y();
    })
  }
  update();

  let folders = [];

  let selectedFolder = '';

  let newFolder = false;
  let newFolderName = '';

  let headerElement;
  let headerHeight = 0;
  requestAnimationFrame(() => {
    // im very sad that i had to use js, because css just didn't behave how i wanted it to
    headerHeight = headerElement.getBoundingClientRect().height;
  })

  let inputElement;
  let errorText = '';
  async function addFolder() {
    update();
    await promise;
    if (
      newFolderName == '' ||
      newFolderName.startsWith('@') ||
      folders.includes(newFolderName)
    ) {
      const flashTime = 150;
      // don't look at this ugly mess
      setTimeout(() => {
        inputElement?.focus();
        setTimeout(() => {
          inputElement?.blur();
          setTimeout(() => {
            inputElement?.focus();
            setTimeout(() => {
              inputElement?.blur();
              setTimeout(() => {
                inputElement?.focus();
              }, flashTime)
            }, flashTime)
          }, flashTime)
        }, flashTime)
      }, flashTime)

      errorText = newFolderName == '' ?
        tt('addFolder.error-empty') :
        newFolderName.startsWith('@') ?
          tt('addFolder.error-illegalName') :
          tt('addFolder.error-alreadyExists')
      ;
      setTimeout(() => {
        errorText = '';
      }, 2000);
      return;
    }

    try {
      await window.nereid.userdata.bookmarks.addFolder({ folder: newFolderName });
      update();
      selectedFolder = newFolderName;

      newFolderName = '';
      newFolder = false;
      
    } catch (e) {
      errorText = e;
    }
  }

  function handleKeydown({ key }) {
    if (key == 'Escape' && newFolder) {
      newFolderName = '';
      newFolder = false;
    }
    if (key == 'Enter' && newFolder) {
      addFolder();
    }
  }
</script>

<svelte:head>
  <title>{t('common.bookmarks')}</title>
</svelte:head>

<svelte:body on:keydown={handleKeydown} />

<div class="wrapper">
  <header bind:this={headerElement}>
    <Header name="bookmarks">
      <Icons.Bookmarks />
    </Header>
  </header>
  {#await promise then _}
    <main style:height="calc(100% - {headerHeight}px)">
      <aside>
        <TextBlock variant="subtitle" style="margin-bottom: 20px; padding-left: 17px">{tt('folders')}</TextBlock>
        <br>
        {#each folders as folderName}
          <ListItem
            selected={selectedFolder == folderName}
            on:click={() => selectedFolder = folderName}
          >
            {getFolderName(folderName)}
          </ListItem>
        {/each}
        <div class="separator" />
        {#if !newFolder}
          <!-- svelte-ignore missing-declaration -->
          <ListItem on:click={() => {
            newFolder = true;
            requestAnimationFrame(() => {
              inputElement.focus()
            })
          }}>
            {tt('button-addFolder')}
          </ListItem>
        {:else}
          <div class="addFolder">
            <TextBox bind:value={newFolderName} placeholder={tt('addFolder.placeholder')} bind:inputElement />
            <span class="err">{errorText}</span>
            <div class="end">
              <Button on:click={addFolder}>{tt('addFolder.button-add')}</Button>
            </div>
          </div>
        {/if}
      </aside>
      <div class="contentwrapper">
        <div class="content">
          <FolderView bind:selectedFolder {tt} localizedName={getFolderName(selectedFolder)} {update} isInFolders={folders.includes.bind(folders)} />
        </div>
      </div>
    </main>
  {/await}
</div>