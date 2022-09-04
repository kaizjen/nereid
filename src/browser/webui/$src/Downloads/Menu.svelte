<script>
  import { MenuFlyoutDivider, MenuFlyoutItem } from "fluent-svelte";

  export let download;
  export let i;

  const { t } = window.nereid.i18n;
  function tt(str, ...args) {
    return t('pages.downloads.'+str, ...args)
  }
</script>

{#if download.status == 'completed'}
  <MenuFlyoutItem on:click={() => window.nereid.shell.openPath(download.savePath)}>
    {tt('alt-openFile', { file: download.savePath.replaceAll('\\', '/').split('/').at(-1) })}
  </MenuFlyoutItem>
  <MenuFlyoutItem on:click={() => window.nereid.shell.showItemInFolder(download.savePath)}>
    {tt('button-showInFolder')}
  </MenuFlyoutItem>
  <MenuFlyoutDivider />
{/if}
<MenuFlyoutItem on:click={() => window.nereid.clipboard.writeText(download.url)}>
  {tt('menu.copyDownloadURL')}
</MenuFlyoutItem>
<MenuFlyoutItem on:click={() => window.nereid.clipboard.writeText(download.savePath)}>
  {tt('menu.copySavePath')}
</MenuFlyoutItem>
<MenuFlyoutDivider />
<MenuFlyoutItem on:click={() => window.nereid.userdata.downloads.start(i)}>
  {tt('menu.redownload')}
</MenuFlyoutItem>