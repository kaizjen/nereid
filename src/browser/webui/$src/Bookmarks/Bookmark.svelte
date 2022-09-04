<style>
  .item {
    display: flex;
  }
  .b-link {
    border-radius: 8px;
    padding: 10px;
    padding-inline: 20px;
    flex-grow: 1;
    color: inherit;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .b-link:hover {
    background: var(--fds-subtle-fill-secondary);
  }
  .b-link:active {
    background: var(--fds-control-fill-secondary);
    transition: .15s;
  }
  .title {
    display: flex;
    align-items: center;
  }
  .url {
    color: var(--default-gray);
  }
  .icon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
  }
</style>
<script>
  import { ContextMenu, TextBlock, IconButton, MenuFlyoutItem, MenuFlyoutDivider } from "fluent-svelte";
  import { createEventDispatcher } from "svelte";
  import * as Icons from "../icons.js"
  import EditBookmark from "./EditBookmark.svelte";

  export let bookmark;
  const { t } = window.nereid.i18n
  export let tt;
  export let del;
  export let index;

  let actionText = window.action.split('/')[1];
  let editIndex = actionText?.startsWith('edit:') ? actionText.replace('edit:', '') : '';
  let editDialog = editIndex && Number(editIndex) == index && window.isFirstTime;

  if (editDialog) {
    window.isFirstTime = false;
  }

  if (actionText && !editIndex) {
    let num = Number(actionText);
    if (num == index) {
      // TODO: scroll
    }
    window.isFirstTime = false;
  }

  const dispatch = createEventDispatcher()

  function recieveEdit({ detail }) {
    dispatch('edit', detail)
    editDialog = false;
  }
</script>

<EditBookmark
  bind:open={editDialog}
  {tt}
  buttonText={t('common.done')}
  on:click={recieveEdit}
  name={bookmark.name}
  url={bookmark.url}
/>

<ContextMenu style="white-space: nowrap;">
  <div class="item">
    <a class="b-link" href={bookmark.url}>
      <div class="title">
        {#if bookmark.iconURL}
          <img class="icon" src={'get:' + bookmark.iconURL} alt={tt('favicon')}>
        {/if}
        <TextBlock>
          {bookmark.name}
        </TextBlock>
      </div>
      <span class="url">
        <TextBlock variant="caption">
          {bookmark.url}
        </TextBlock>
      </span>
    </a>
    <IconButton on:click={del}>
      <Icons.Delete title={tt('bookmark.delete')}></Icons.Delete>
    </IconButton>
  </div>

  <svelte:fragment slot="flyout">
    <MenuFlyoutItem on:click={() => window.nereid.tab.create(bookmark.url)}>
      {t('menu.contextMenu.open.newTab')}
    </MenuFlyoutItem>
    <MenuFlyoutItem on:click={() => window.nereid.tab.go(bookmark.url)}>
      {t('menu.contextMenu.open.thisTab')}
    </MenuFlyoutItem>
    <MenuFlyoutDivider />
    <MenuFlyoutItem on:click={() => editDialog = true}>
      {tt('bookmark.button-edit')}
    </MenuFlyoutItem>
    <MenuFlyoutItem on:click={del}>
      {tt('bookmark.button-delete')}
    </MenuFlyoutItem>
  </svelte:fragment>
</ContextMenu>