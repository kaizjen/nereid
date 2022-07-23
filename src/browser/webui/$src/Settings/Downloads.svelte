<style>
  
</style>

<script>
  import { RadioButton, TextBlock, Button } from "fluent-svelte"
  import { getContext } from "svelte/internal"

  export let update;

  const { t } = window.nereid.i18n;

  function tt(key, ...args) {
    return t(`pages.settings.downloads.${key}`, ...args)
  }

  let config = getContext('config');
  let group = $config.behaviour.downloadPath == null ? 'unknown' : 'known'

  function selectUnknown() {
    console.log('selecting unknown');
    $config.behaviour.downloadPath = null
    update()
  }

  async function selectFolder() {
    console.log('selecting fld');
    let dialogResponse = await window.nereid.dialog.selectDirectory({
      defaultPath: $config.behaviour.downloadPath ?? '/',
      title: tt('dialog.title'),
      buttonLabel: tt('dialog.button-choose')
    })

    if (dialogResponse.canceled) return;

    let path = dialogResponse.filePaths[0];
    $config.behaviour.downloadPath = path;
    update()
  }
</script>

<div class="s-option">
  <TextBlock variant="subtitle">{tt('subtitle')}</TextBlock>
</div>
<div class="s-option">
  <RadioButton bind:group value="unknown" on:click={selectUnknown}>
    <div>
      <TextBlock> {tt('ask')} </TextBlock>
    </div>
  </RadioButton>
</div>
<div class="s-option">
  <RadioButton bind:group value="known">
    <div>
      <TextBlock> {tt('choose')} </TextBlock>
      {#if group == 'known'}
        <br><TextBlock style="color: gray;">{$config.behaviour.downloadPath ?? tt('noPath')}</TextBlock>
      {/if}
    </div>
  </RadioButton>
  <Button variant="accent" disabled={group != 'known'} on:click={selectFolder}> {tt('button-select')} </Button>
</div>
<div class="separator"></div>
<div class="s-option">
  <Button
    disabled={$config.behaviour.downloadPath == null}
    variant="hyperlink"
    on:click={() => { window.nereid.shell.openPath($config.behaviour.downloadPath) }}
  > {tt('openFolder')} </Button>
  <Button variant="hyperlink" href="nereid://downloads" target="_blank">
    {tt('allDownloads')}
  </Button>
</div>