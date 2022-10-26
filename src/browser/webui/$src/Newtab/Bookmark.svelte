<style>
  .bookmark {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    text-decoration: none;
    width: 5cm;
  }
  @media (prefers-color-scheme: light) {
    .bookmark {
      color: black;
      text-shadow: 0 2px 2px white;
    }
  }
  .thumbnail {
    background: #00000031;
    width: 100%;
    height: 3cm;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 6px;
    overflow: hidden;
    transition: .1s;
  }
  .bookmark:hover .thumbnail {
    filter: brightness(0.7)
  }
  img {
    width: inherit;
    height: inherit;
  }
  .full {
    object-fit: cover;
  }
  .icon {
    object-fit: scale-down;
  }
  .name {
    width: 100%;
    text-align: center;
  }
</style>

<script>
  import { ContextMenu, MenuFlyoutItem, MenuFlyoutDivider, ContentDialog, Button } from "fluent-svelte"
  import { createEventDispatcher } from "svelte";
  export let isReal = true;

  export let bookmark;
  
  let deleteDialog = false;

  const dispatch = createEventDispatcher()

  const { t } = window.nereid.i18n;

  function handleClick() {
    if (isReal) {
      nereid.tab.go(bookmark.url)
      
    } else {
      dispatch('click')
    }
  }
</script>

<ContentDialog
  bind:open={deleteDialog}
  append={document.body}
  title={t('pages.newtab.startPanel.delete.title', { name: bookmark.name })}
>
  <svelte:fragment slot="footer">
    <Button on:click={() => {deleteDialog = false; window.unlockKeyEvents()}}>
      {t('common.cancel')}
    </Button>
    <Button variant="accent" on:click={() => {deleteDialog = false; window.unlockKeyEvents(); dispatch('delete')}}>
      {t('pages.newtab.startPanel.delete.button-delete')}
    </Button>
  </svelte:fragment>
</ContentDialog>
<ContextMenu>
  <a href={bookmark.url} on:click|preventDefault={handleClick} class="bookmark">
    <div class="thumbnail">
      <img class={bookmark.thumbnailURL ? 'full' : 'icon'} src="{isReal ? 'get:' : ''}{bookmark.thumbnailURL || bookmark.iconURL}" alt="">
    </div>
    <div class="name">
      {bookmark.name}
    </div>
  </a>

  <svelte:fragment slot="flyout">
    {#if isReal}
      <MenuFlyoutItem on:click={() => window.nereid.tab.create(bookmark.url)}>
        {t('menu.contextMenu.open.newTab')}
      </MenuFlyoutItem>
      <MenuFlyoutItem on:click={handleClick}>
        {t('menu.contextMenu.open.thisTab')}
      </MenuFlyoutItem>
      <MenuFlyoutDivider />
      <MenuFlyoutItem on:click={() => dispatch('edit')}>
        {t('pages.newtab.startPanel.button-edit')}
      </MenuFlyoutItem>
      <MenuFlyoutItem on:click={() => {deleteDialog = true; window.lockKeyEvents()}}>
        {t('pages.newtab.startPanel.button-delete')}
      </MenuFlyoutItem>
    {:else}
      <MenuFlyoutItem on:click={() => dispatch('click')}>
        {bookmark.name}
      </MenuFlyoutItem>
    {/if}
  </svelte:fragment>
</ContextMenu>