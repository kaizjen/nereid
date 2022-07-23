<style>
  
</style>

<script>
  import { RadioButton, TextBlock, Button, ContentDialog, InfoBar } from "fluent-svelte";
  import { getContext } from "svelte/internal";
  import Codes from "iso-639-1";

  export let update;

  const { t } = window.nereid.i18n;
  const available = window.nereid.i18n.getAvailableTranslations();
  const all = Codes.getAllCodes()

  function tt(key, ...args) {
    return t(`pages.settings.languages.${key}`, ...args)
  }

  let config = getContext('config');

  let allDialog = location.hash.startsWith('#languagePicker')
  let availableDialog = location.hash.startsWith('#language-for-nereid')

  let needsRestart = false;

  function selectNereidLanguageF(code) {
    return function () {
      $config.i18n.lang = code;
      update()

      needsRestart = true;
      availableDialog = false;
    }
  }
  function selectChromiumLanguageF(code) {
    return function () {
      $config.i18n.locale = code;
      if (window.nereid.i18n.getSupportedLanguage(code) == code) {
        $config.i18n.lang = code;
      }
      update()

      needsRestart = true;
      allDialog = false;
    }
  }
</script>

<ContentDialog bind:open={availableDialog} style="max-height: 100%; overflow: auto;" title={tt('dialog')}>
  {#each available as code}
    <RadioButton group={$config.i18n.lang} value={code} on:input={selectNereidLanguageF(code)}>
      {Codes.getNativeName(code)}
    </RadioButton><br>
  {/each}
  
  <Button slot="footer" on:click={() => availableDialog = false}>
    {t('common.done')}
  </Button>
</ContentDialog>

<ContentDialog bind:open={allDialog} style="max-height: 100%; overflow: auto;" title={tt('dialog')}>
  {#each all as code}
    <RadioButton group={$config.i18n.locale} value={code} on:input={selectChromiumLanguageF(code)}>
      {Codes.getNativeName(code)}
    </RadioButton><br>
  {/each}
  
  <Button slot="footer" on:click={() => allDialog = false}>
    {t('common.done')}
  </Button>
</ContentDialog>

<div class="s-option">
  <TextBlock>{tt('label-all')}</TextBlock>
  <Button on:click={() => allDialog = true}>
    {Codes.getNativeName($config.i18n.locale)}
  </Button>
</div>
<div class="s-option">
  <TextBlock variant="caption">
    {tt('notice')}
  </TextBlock>
</div>
<div class="s-option">
  <TextBlock>{tt('label-nereid')}</TextBlock>
  <Button on:click={() => availableDialog = true}>
    {Codes.getNativeName($config.i18n.lang)}
  </Button>
</div>

{#if needsRestart}
  <div class="s-option">
    <InfoBar severity="caution" title={tt('restart-notification')}>
      <Button slot="action" variant="accent" on:click={window.nereid.app.restart}>
        {tt('restart-button')}
      </Button>
    </InfoBar>
  </div>
{/if}