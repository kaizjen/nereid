<style>
  .download {
    padding: 14px;
    border-radius: 4px;
    border: 1px solid #80808073;
    display: flex;
    margin-bottom: 15px;
    align-items: center;
  }
  .icon {
    padding: 8px;
  }
  .info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex-grow: 1;
    overflow: hidden;
  }
  .file-link {
    background: none;
    outline: none;
    border: none;
    cursor: pointer;
    font-weight: bolder;
    padding: 3px;
    color: inherit;
  }
  .file-link-disabled {
    font-weight: bolder;
    padding: 3px;
    font-size: small;
  }
  .file-link:hover {
    text-decoration: underline;
  }
  .interrupted {
    color: #d51d1d;
    font-size: x-small;
    font-weight: 100;
  }
  .mini {
    color: gray;
    font-size: x-small;
    padding-inline: 3px;
    white-space: nowrap;
  }
  .btn-container {
    margin-top: 10px;
  }
</style>
<script>
  import { Button, ContextMenu, IconButton, MenuFlyout } from "fluent-svelte";
  import { createEventDispatcher } from "svelte";
  import * as Icons from "../icons.js"
  import Menu from "./Menu.svelte";

  export let download;
  export let i;

  const { t } = window.nereid.i18n;
  function tt(str, ...args) {
    return t('pages.downloads.'+str, ...args)
  }

  let image = '';
  void async function () {
    image = 'data:image/png;base64,' + await nereid.shell.getFileIcon(download.savePath)
  }()

  function showInFolder() {
    try {
      window.nereid.shell.showItemInFolder(download.savePath)
    } catch (_) {}
  }

  const dispatch = createEventDispatcher()
</script>

<ContextMenu>
<div class="download">
  <div class="icon">
    <img src={image} alt="">
  </div>
  <div class="info">
    {#if download.status == 'completed'}
      <button
        class="file-link"
        title="{tt('alt-openFile', { file: download.savePath.replaceAll('\\', '/').split('/').at(-1) })}"
        on:click={() => window.nereid.shell.openPath(download.savePath)}
      >
        {download.savePath.replaceAll('\\', '/').split('/').at(-1)}
      </button>
    {:else}
      <span class="file-link-disabled">
        {download.savePath.replaceAll('\\', '/').split('/').at(-1)}
        <span class="interrupted">
          {tt('status-interrupted')}
        </span>
      </span>
    {/if}
    <span class="mini">
      {tt('downloadedFrom', { url: download.url })}
    </span>
    {#if download.status == 'completed'}
      <div class="btn-container">
        <Button variant="hyperlink" on:click={showInFolder}>{tt('button-showInFolder')}</Button>
      </div>
      <span class="mini">
        {download.savePath}
      </span>
    {/if}
  </div>
  <div class="buttons">
    <IconButton on:click={() => dispatch('delete')}>
      <Icons.Delete title={tt('alt-button-delete')} />
    </IconButton>
    <MenuFlyout placement="right" alignment="start">
      <IconButton>
        <Icons.More />
      </IconButton>
      <Menu slot="flyout" {download} {i} />
    </MenuFlyout>
  </div>
</div>
<Menu slot="flyout" {download} {i} />
</ContextMenu>