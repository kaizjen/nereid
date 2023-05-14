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
  export let style = true;
  export let accelerator = '';

  // Gets all the contents of accelerators, allows for such accelerators as "Ctrl++"
  $: segments = (accelerator || '').split('+')
    .map(str => str == '' ? '+' : str)
    .filter((item, i, arr) => item != '+' || arr[i + 1] != '+')
  ;

  $: noKeybind = !accelerator;

  function stringFromSegment(segment) {
    if (segment == "CmdOrCtrl" || segment == "CommandOrControl") {
      return nereid.app.os == 'darwin' ? "⌘" : "Ctrl";
    }
    if (segment == "Control") return "Ctrl";
    if (segment == "Command") return "⌘";
    if (segment == "Super" || segment == "Meta") {
      return nereid.app.os == 'darwin' ?
        "⌘" :
        (nereid.app.os == 'win32' ?
          "⊞ Win" :
          ("❖ " + segment)
        )
      ;
    }

    if (segment == "Option" || (segment == "Alt" && nereid.app.os == 'darwin')) {
      return "⌥ Option"
    }

    if (segment == "Escape") {
      return "Esc"
    }

    if (segment == "Return" || segment == "Enter") {
      return "↩ " + segment
    }

    return segment;
  }

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