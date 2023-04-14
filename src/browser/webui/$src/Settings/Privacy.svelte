<script>
  import { ListItem, TextBlock, ContentDialog, Button, ToggleSwitch } from "fluent-svelte";
  import { getContext } from "svelte/internal";
  import noFirstTime from "nereid://js/nft.js"
  import SiteSettings from "./dialogs/SiteSettings.svelte";

  import DataClearer from "./dialogs/DataClearer.svelte";

  let config = getContext('config');

  const { t } = window.nereid.i18n;

  export let update;

  let clearDialog = false;
  let siteSettingsDialog = location.hash.startsWith('#siteSettings');

  window.addEventListener('hashchange', () => {
    siteSettingsDialog = location.hash.startsWith('#siteSettings');
  })

  let noCOPermissions = $config.privacy.denyCrossOriginPermissions;
  const updateCOPs = noFirstTime(() => {
    $config.privacy.denyCrossOriginPermissions = noCOPermissions;
    update()
  })
  $: {noCOPermissions; updateCOPs()}

  let useHintingService = $config.privacy.useSuggestions;
  const updateHintingService = noFirstTime(() => {
    $config.privacy.useSuggestions = useHintingService;
    update()
  })
  $: {useHintingService; updateHintingService()}

  let maskSessionWhenHints = $config.privacy.hideSessionForSuggestions;
  const updateMask = noFirstTime(() => {
    $config.privacy.hideSessionForSuggestions = maskSessionWhenHints;
    update()
  })
  $: {maskSessionWhenHints; updateMask()}

  let useHTTPSOnly = $config.privacy.httpsOnly;
  const updateHTTPSOnly = noFirstTime(() => {
    $config.privacy.httpsOnly = useHTTPSOnly;
    update()
  })
  $: {useHTTPSOnly; updateHTTPSOnly()}
</script>

<DataClearer bind:open={clearDialog} />

<ContentDialog size="max" append={document.body} bind:open={siteSettingsDialog} closable={false} style="max-height: 100%; overflow: auto;">
  <SiteSettings {update} />
  <svelte:fragment slot="footer">
    <Button on:click={() => {siteSettingsDialog = false; location.hash = ''}}>{t('common.done')}</Button>
  </svelte:fragment>
</ContentDialog>


<ListItem on:click={() => clearDialog = true} style="block-size: 57px;">
  <TextBlock variant="body">{t('pages.settings.privacy.clearData.title')}</TextBlock><br>
  <TextBlock variant="caption" style="color: gray;">{t('pages.settings.privacy.clearData.description')}</TextBlock>
</ListItem>
<div class="separator"></div>

<ListItem on:click={() => {siteSettingsDialog = true; location.hash = '#siteSettings'}} style="block-size: 57px;">
  <TextBlock variant="body">{t('pages.settings.privacy.siteSettings.title')}</TextBlock><br>
  <TextBlock variant="caption" style="color: gray;">{t('pages.settings.privacy.siteSettings.description')}</TextBlock>
</ListItem>
<div class="s-option">
  <TextBlock>
    {t('pages.settings.privacy.denyCrossOriginPermissions.title')} <br>
    <TextBlock variant="caption" style="color: gray;">
      {t('pages.settings.privacy.denyCrossOriginPermissions.description')}
    </TextBlock>
  </TextBlock>
  <ToggleSwitch bind:checked={noCOPermissions} />
</div>
<div class="separator"></div>

<div class="s-option">
  <TextBlock>
    {t('pages.settings.privacy.useHintingService.title')} <br>
    <TextBlock variant="caption" style="color: gray;">
      {t('pages.settings.privacy.useHintingService.description')}
    </TextBlock>
  </TextBlock>
  <ToggleSwitch bind:checked={useHintingService} />
</div>
<div class="s-option">
  <TextBlock>
    {t('pages.settings.privacy.hideSessionForHints.title')} <br>
    <TextBlock variant="caption" style="color: gray;">
      {t('pages.settings.privacy.hideSessionForHints.description')}
    </TextBlock>
  </TextBlock>
  <ToggleSwitch bind:checked={maskSessionWhenHints} />
</div>
<div class="separator"></div>
<div class="s-option">
  <TextBlock>
    {t('pages.settings.privacy.httpsOnly')}
  </TextBlock>
  <ToggleSwitch bind:checked={useHTTPSOnly} />
</div>