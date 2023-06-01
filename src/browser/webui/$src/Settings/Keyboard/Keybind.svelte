<style>
  kbd.style {
    background: #8080808c;
    border: 1px solid var(--fds-text-tertiary);
    padding: 2px;
    border-radius: 3px;
    font-family: monospace;
  }
  kbd:not(.style) {
    font-family: inherit;
  }
</style>

<script>
  import { stringFromSegment, getSegments } from "./accelerator-parser.js";

  export let style = true;
  export let accelerator = '';

  // Gets all the contents of accelerators, allows for such accelerators as "Ctrl++"
  $: segments = getSegments(accelerator);

  $: noKeybind = !accelerator;

  const nkbText = window.nereid.i18n.t('pages.settings.keyboard.rebind.noKeybind');
</script>

{#if noKeybind}
  {#if style}
    ({nkbText})
  {:else}
    {nkbText}
  {/if}
{:else}
  {#each segments as segm, i}
    {#if i != 0}
      +
    {/if}
    <kbd class:style>{stringFromSegment(segm)}</kbd>
  {/each}
{/if}