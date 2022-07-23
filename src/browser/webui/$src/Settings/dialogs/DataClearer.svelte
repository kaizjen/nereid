<script>
  import { ContentDialog, Button, Checkbox, TextBlock } from "fluent-svelte"
  import { getContext } from "svelte/internal";
  export let open = false;

  const { session, userdata } = window.nereid;
  const config = getContext('config')

  const { t } = window.nereid.i18n;

  let isLoading = false;

  let clear = {
    cache: true,
    cookies: true,
    storages: false,
    history: false,
    downs: false,
    siteSettings: false,
  }

  async function clearSelected() {
    isLoading = true;
    let clearObj = {}

    if (clear.cache) {
      clearObj.appcache = true
      clearObj.shadercache = true
      clearObj.cachestorage = true
    }
    if (clear.cookies) {
      clearObj.cookies = true
    }
    if (clear.storages) {
      clearObj.filesystem = true
      clearObj.indexdb = true
      clearObj.localstorage = true
      clearObj.websql = true
    }

    await session.clearData(clearObj)

    if (clear.history) {
      userdata.history.set([])
    }
    if (clear.downs) {
      let dls = await userdata.downloads.get();
      dls.forEach((_, i) => {
        userdata.downloads.delete(i)
      });
    }
    if (clear.siteSettings) {
      $config.privacy.sitePermissions = {};
      userdata.config.set({ privacy: $config.privacy });
    }
    isLoading = false;
    open = false;
  }
</script>

<ContentDialog size="max" title={t('pages.settings.privacy.clearData.dialog.title')} append={document.body} bind:open closable={false}>
  <Checkbox bind:checked={clear.cache}>{t('pages.settings.privacy.clearData.dialog.cache')}</Checkbox><br>
  <Checkbox bind:checked={clear.cookies}>{t('pages.settings.privacy.clearData.dialog.cookies')}</Checkbox><br>
  <Checkbox bind:checked={clear.storages}>{t('pages.settings.privacy.clearData.dialog.storages')}</Checkbox><br>
  <Checkbox bind:checked={clear.history}>{t('pages.settings.privacy.clearData.dialog.history')}</Checkbox><br>
  <Checkbox bind:checked={clear.downs}>{t('pages.settings.privacy.clearData.dialog.downloads')}</Checkbox><br>
  <TextBlock variant="caption" style="color: gray;">
    {t('pages.settings.privacy.clearData.dialog.notice')}
  </TextBlock>
  <Checkbox bind:checked={clear.siteSettings}>{t('pages.settings.privacy.clearData.dialog.permissions')}</Checkbox><br>

  <svelte:fragment slot="footer">
    <Button on:click={() => open = false}>{t('common.cancel')}</Button>
    <Button on:click={clearSelected} variant="accent" disabled={isLoading}>{isLoading ? t('common.loading') : t('pages.settings.privacy.clearData.dialog.clear-button')}</Button>
  </svelte:fragment>
</ContentDialog>