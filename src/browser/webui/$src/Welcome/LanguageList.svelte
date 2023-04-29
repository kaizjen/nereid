<script>
  import { AutoSuggestBox, TextBlock } from "fluent-svelte";
  import Codes from "iso-639-1";

  export let selected;
  export let onlyAvailable = false;

  const languages = onlyAvailable ? 
    window.nereid.i18n.getAvailableTranslations() :
    Codes.getAllCodes()
  ;

  let value = Codes.getNativeName(selected);
  $: value_proxy = value ?? ''; // sometimes <AutoSuggestBox> gives null
  let error = false;

  $: {
    if (!Codes.getCode(value_proxy)) {
      error = true

    } else {
      selected = Codes.getCode(value_proxy);
      error = false;
    }
    if (!languages.includes(selected)) {
      console.log('%o no inc %o', languages, selected);
      error = true;
    }
  }


  function uniq(value, index, self) {
    return self.indexOf(value) === index;
  }
</script>

<!-- {#each languages as lang}
  <RadioButton bind:group={selected} value={lang}>{Codes.getNativeName(lang)}</RadioButton>
{/each} -->

<AutoSuggestBox bind:value items={languages.map(Codes.getNativeName).filter(uniq)} />

{#if error}
  <TextBlock variant="bodyStrong">Invalid or unsupported language</TextBlock>
{/if}