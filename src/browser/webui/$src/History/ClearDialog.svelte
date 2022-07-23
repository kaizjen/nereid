<script>
  import { Button, ContentDialog, RadioButton, TextBlock } from "fluent-svelte";
  import { getContext } from "svelte";
  
  export let open;
  export let clearAllOnThisPage;

  let isLoading = false;
  
  const { t } = window.nereid.i18n;
  function tt(str, ...args) {
    return t(`pages.history.${str}`, ...args)
  }
  
  const update = getContext('update');

  async function clear() {
    const HOURS = 60 * 60 * 1000

    if (group == 'page') {
      isLoading = true;
      await clearAllOnThisPage();

    } else {
      let timestamp;
      switch (group) {
        case 'hour': {
          timestamp = Date.now() - (1 * HOURS);
          break;
        }
        case 'day': {
          timestamp = Date.now() - (24 * HOURS);
          break;
        }
        case 'week': {
          timestamp = Date.now() - (7 * 24 * HOURS);
          break;
        }
        case 'all': {
          timestamp = 0;
          break;
        }
        default: throw "?"
      }

      isLoading = true;

      const indexes = await window.nereid.userdata.history.find({ type: 'date', compare: 'gt', date: timestamp });
      let i = 0;
      for (const index of indexes) {
        await window.nereid.userdata.history.delAt({ index: index - i })
        i++;
      }
      update()

    }
    isLoading = false;
    open = false;
  }
  let group = "page"
</script>

<ContentDialog bind:open append={document.body} title={tt('dialog.title')}>
  <RadioButton bind:group value="page">
    {tt('dialog.clearOnThisPage-button')}
  </RadioButton>
  <br><br>
  <TextBlock variant="bodyStrong">
    {tt('dialog.timePeriod')}
  </TextBlock><br>
  {#each ['hour', 'day', 'week', 'all'] as value}
    <RadioButton bind:group {value}>
      {tt('dialog.option-'+value)}
    </RadioButton><br>
  {/each}

  <svelte:fragment slot="footer">
    <Button on:click={() => open = false}>
      {t('common.cancel')}
    </Button>
    <Button on:click={clear} variant="accent" disabled={isLoading}>
      {isLoading ? t('common.loading') : tt('dialog.clear-button')}
    </Button>
  </svelte:fragment>
</ContentDialog>