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
</script>

<ContentDialog bind:open append={document.body} {title}>
  <TextBox bind:value={name} placeholder={tt('bookmark.name')} /><br>
  <TextBox bind:value={url} placeholder={tt('bookmark.url')} />
  <svelte:fragment slot="footer">
    <Button on:click={() => open = false}>
      {t('common.cancel')}
    </Button>
    <Button variant="accent" on:click={() => dispatch('click', { name, url })}>
      {buttonText}
    </Button>
  </svelte:fragment>
</ContentDialog>