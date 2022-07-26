<script>
  import { Button, ContentDialog, TextBox } from "fluent-svelte";
  import { createEventDispatcher } from "svelte";

  export let title = undefined;
  export let buttonText;
  export let open;
  const { t } = window.nereid.i18n;
  export let tt;

  const dispatch = createEventDispatcher()

  export let name = '';
  export let url = '';

  function isValidURL(url) {
    try {
      new URL(url);
      return true;

    } catch (_) {
      return false;
    }
  }

  let urlProxy = url;

  $: if (isValidURL(urlProxy)) {
    url = urlProxy
  }
</script>

<ContentDialog bind:open append={document.body} {title}>
  <TextBox bind:value={name} placeholder={tt('bookmark.name')} /><br>
  <TextBox bind:value={urlProxy} placeholder={tt('bookmark.url')} />
  <svelte:fragment slot="footer">
    <Button on:click={() => open = false}>
      {t('common.cancel')}
    </Button>
    <Button disabled={!isValidURL(urlProxy)} variant="accent" on:click={() => {
      if (urlProxy != url) return;
      dispatch('click', { name, url })
    }}>
      {buttonText}
    </Button>
  </svelte:fragment>
</ContentDialog>