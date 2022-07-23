<script>
  import { RadioButton, TextBlock, TextBox, Button } from "fluent-svelte"
  import { getContext } from "svelte/internal";
  import noFirstTime from "nereid://js/nft.js"

  export let update;

  const { t } = window.nereid.i18n;

  function tt(key, ...args) {
    return t(`pages.settings.on-start.${key}`, ...args)
  }

  let config = getContext('config');

  let group = $config.behaviour.onStart.type;
  let currentUrl = $config.behaviour.onStart.url ?? '';

  function handleSave() {
    $config.behaviour.onStart = {
      type: 'page',
      url: currentUrl
    };
    update()
  }

  const onGroupChange = noFirstTime(() => {
    if (group == 'page') return; // 'page' is handled by handleSave()
  
    $config.behaviour.onStart = { type: group };
    update()
  })

  function isValidURL(url) {
    try {
      new URL(url);

      return true

    } catch (e) {
      return false
    }
  }

  $: {group; onGroupChange()}
</script>

<div class="s-option">
  <RadioButton bind:group value="new-tab">
    <div>
      <TextBlock> {tt('newTab')} </TextBlock>
    </div>
  </RadioButton>
</div>
<div class="s-option">
  <RadioButton bind:group value="last-tabs">
    <div>
      <TextBlock> {tt('previousTabs')} </TextBlock>
    </div>
  </RadioButton>
</div>
<div class="s-option">
  <RadioButton bind:group value="page">
    <div>
      <TextBlock> {tt('specificPage')} </TextBlock>
    </div>
  </RadioButton>
</div>
{#if group == 'page'}
  <div class="s-option" style="margin-left: 25px;">
    <TextBox bind:value={currentUrl} placeholder={tt('specificPageURL')} />
    <Button variant="accent" on:click={handleSave} style="margin-left: 20px;" disabled={!isValidURL(currentUrl)}>{tt('button-save')}</Button>
  </div>
{/if}