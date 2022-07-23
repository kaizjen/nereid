<style>
  .main {
    position: absolute;
    top: 0;
    left: 0;
    width: -webkit-fill-available;
    height: -webkit-fill-available;
    z-index: -1;
    padding-inline: 200px;
  }
  .head {
    -webkit-app-region: drag;
    padding-top: 20px;
    margin-bottom: 50px;
  }
  footer {
    display: flex;
    align-items: center;
    bottom: 0;
    position: absolute;
    width: 100%;
    padding-block: 8px;
  }
  @media (prefers-color-scheme: dark) {
    footer {
      background: black;
    }
  }
  @media (prefers-color-scheme: light) {
    footer {
      background: #cacaca;
    }
  }
  .info {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    padding-left: 8px;
  }
  .note {
    margin-top: 50px;
    font-size: small;
    color: gray;
    font-style: italic;
  }
</style>
<script>
  import { Button, ContentDialog, TextBlock } from "fluent-svelte";
  import LanguageList from "./LanguageList.svelte";
  import Codes from "iso-639-1";

  export let next;
  export let config;

  const { t } = window.nereid.i18n;

  let selectedLocale = 'en';
  let selectedLang = 'en';
  let open = false;

  $: {
    let supported = window.nereid.i18n.getSupportedLanguage(selectedLocale);
    selectedLang = supported
  }

  async function endLanguageSelection() {
    if (selectedLang != config.i18n.lang || 
      selectedLocale != config.i18n.locale) {
      requestIdleCallback(() => {
        window.nereid.app.restart();
      })
    }
    config.i18n.lang = selectedLang;
    config.i18n.locale = selectedLocale
    await next(); // next() sets the config
  }
</script>

<ContentDialog style=" overflow: auto; max-height: 100% " bind:open>
  <LanguageList bind:selected={selectedLang} onlyAvailable={true} />
  <svelte:fragment slot="footer">
    <Button on:click={() => open = false}>{t('common.done')}</Button>
  </svelte:fragment>
</ContentDialog>

<div class="main">
  <div class="head">
    <TextBlock variant="titleLarge">{t('pages.welcome.language.title')}</TextBlock>
  </div>

  <div>
    <LanguageList bind:selected={selectedLocale} onlyAvailable={false} />
  </div>

  <div class="note">
    {t('pages.welcome.language.note')}
  </div>

</div>
<footer>
  <div class="info">
    {#if selectedLang != selectedLocale}
      <span> {t('pages.welcome.language.noTranslation')}
      <Button on:click={() => open = true}>{Codes.getNativeName(selectedLang) || `[${selectedLang}]`}</Button></span>
    {/if}
    {#if selectedLang != config.i18n.lang || 
      selectedLocale != config.i18n.locale}
      <span>{t('pages.welcome.language.restartNotice')}</span>
    {/if}
  </div>
  <Button on:click={endLanguageSelection}>
    {t('pages.welcome.common.next')}
  </Button>
</footer>