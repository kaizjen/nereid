<style>
  kbd {
    background: #8080808c;
    border: 1px solid var(--fds-text-tertiary);
    padding: 2px;
    border-radius: 3px;
  }
</style>

<script>
  import { TextBlock, ToggleSwitch } from "fluent-svelte";
  import noFirstTime from "nereid://js/nft.js"
  import { getContext } from "svelte/internal";

  export let update;

  const { t } = window.nereid.i18n;

  function tt(key, ...args) {
    return t(`pages.settings.keyboard.${key}`, ...args)
  }

  let config = getContext('config');

  const openTabNearbyTTitle = tt('ctrlTOpensTabNearby.title', { shortcut: "$$SH" });
  const openTabNearbyTDesc = tt('ctrlTOpensTabNearby.description', { shortcut: "$$SH" });
  let openTabNearby = $config.behaviour.keyboardOpensTabNearby;
  const updateOpenTabNearby = noFirstTime(() => {
    $config.behaviour.keyboardOpensTabNearby = openTabNearby;
    update()
  })
  $: {openTabNearby; updateOpenTabNearby()}

  // TODO: Ability to change keyboard shortcuts
</script>


<div class="s-option">
  <TextBlock variant="body">
    <span>
      {#each openTabNearbyTTitle.split('$$SH') as segment, i}
        {#if i != 0}
          <kbd>{window.nereid.app.os == 'darwin' ? "⌘" : "Ctrl"}</kbd>+<kbd>T</kbd>
        {/if}
        {segment}
      {/each}
    </span>
    <br>
    <TextBlock variant="caption" style="color: gray;">
      {#each openTabNearbyTDesc.split('$$SH') as segment, i}
        {#if i != 0}
          <kbd>{window.nereid.app.os == 'darwin' ? "⌘" : "Ctrl"}</kbd>+<kbd>T</kbd>
        {/if}
        {segment}
      {/each}
    </TextBlock>
  </TextBlock>
  <ToggleSwitch bind:checked={openTabNearby} />
</div>