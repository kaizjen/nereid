<style>
  div {
    display: flex;
    padding: 8px;
  }
</style>
<svelte:options immutable={true} />
<script>
  import { IconButton, TextBlock, MenuFlyout, MenuFlyoutItem } from "fluent-svelte";
  import * as Icons from "../icons.js";

  export let name = "<???>";

  const { t } = window.nereid.i18n

  function gotoF(page) {
    return function () {
      window.location = 'nereid://'+page
    }
  }
</script>

<div>
  <MenuFlyout placement="bottom" alignment="start">
    <IconButton style="margin-right: 10px">
      <slot></slot>
    </IconButton>
    <svelte:fragment slot="flyout">

      <MenuFlyoutItem on:click={gotoF('settings')}>
        <Icons.Settings slot="icon" />
        {t('common.settings')}
      </MenuFlyoutItem>

      <MenuFlyoutItem on:click={gotoF('history')}>
        <Icons.History slot="icon" />
        {t('common.history')}
      </MenuFlyoutItem>

      <MenuFlyoutItem on:click={gotoF('bookmarks')}>
        <Icons.Bookmarks slot="icon" />
        {t('common.bookmarks')}
      </MenuFlyoutItem>

      <MenuFlyoutItem on:click={gotoF('about')}>
        <Icons.About slot="icon" />
        {t('common.about')}
      </MenuFlyoutItem>

    </svelte:fragment>
  </MenuFlyout>
  <TextBlock variant="subtitle">
    {t('common.'+name)}
  </TextBlock>
</div>