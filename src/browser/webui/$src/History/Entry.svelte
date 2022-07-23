<style>
  .item {
    display: flex;
  }
  .item:hover {
    background: #80808073;
  }
  .item > a {
    padding: 10px;
    padding-inline: 20px;
    flex-grow: 1;
    color: inherit;
    text-decoration: none;
    display: flex;
    align-items: center;
    overflow: hidden;
  }

  .wrapper {
    white-space: nowrap;
  }
  .wrapper:not(:last-child) {
    border-bottom: 1px solid #80808073;
  }

  .host {
    color: gray;
    margin-right: 10px;
    width: 3.5cm;
    overflow: hidden;
    flex-shrink: 0;
  }

  .favicon {
    width: 16px;
    height: 16px;
    margin-right: 8px;
  }
</style>

<script>
  import { TextBlock, ContextMenu, MenuFlyoutItem, MenuFlyoutDivider, IconButton } from "fluent-svelte";
  import { getContext } from "svelte";
  import * as Icons from "../icons.js";

  export let entry;
  const update = getContext('update')

  const { t } = window.nereid.i18n;
  function tt(str, ...args) {
    return t(`pages.history.${str}`, ...args)
  }

  function getTime() {
    function smartToString(num) {
      num = num.toString()
      if (num.length < 2) {
        num = '0' + num;
        return smartToString(num)
      }
      return num
    }

    const date = new Date(entry.timestamp);
    return `${smartToString(date.getHours())}:${smartToString(date.getMinutes())}`
  }

  function getHostname(url) {
    try {
      return (new URL(url)).hostname

    } catch (_) {
      return null;
    }
  }

  async function del() {
    console.log("del", entry.originalIndex);
    await window.nereid.userdata.history.delAt({ index: entry.originalIndex })
    update();
  }
</script>

<div class="wrapper">
  <ContextMenu style="white-space: nowrap;">
    <div class="item">
      <a href={entry.url}>
        <TextBlock variant="caption" style="margin-right: 10px">
            {getTime()}
        </TextBlock>
        {#if entry.faviconURL}
          <img class="favicon" src={'get:' + entry.faviconURL} alt={tt('favicon')}>
        {/if}
        <span class="host" style:width={entry.faviconURL ? "calc(3.5cm - 16px - 8px)" : ''}>
          <TextBlock variant="caption">
            {getHostname(entry.url)}
          </TextBlock>
        </span>
        <TextBlock>
          {entry.title}
        </TextBlock>
      </a>
      <IconButton on:click={del}>
        <Icons.Delete title={tt('deleteEntry')}></Icons.Delete>
      </IconButton>
    </div>
  
    <svelte:fragment slot="flyout">
      <MenuFlyoutItem on:click={() => window.nereid.tab.create(entry.url)}>
        {t('menu.contextMenu.open.newTab')}
      </MenuFlyoutItem>
      <MenuFlyoutItem on:click={() => window.nereid.tab.go(entry.url)}>
        {t('menu.contextMenu.open.thisTab')}
      </MenuFlyoutItem>
      <MenuFlyoutDivider />
      <MenuFlyoutItem on:click={del}>
        {tt('deleteEntry')}
      </MenuFlyoutItem>
    </svelte:fragment>
  </ContextMenu>
</div>