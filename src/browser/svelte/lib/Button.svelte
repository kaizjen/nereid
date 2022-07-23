<style>
  button {
    padding: 6px;
    min-width: 80px;
    border-radius: 4px;
    transition: .2s;
  }
  button.with-bg {
    background: var(--button-background);
  }
  button:hover {
    background: var(--button-hover);
    transition: .05s;
    outline-color: var(--button-hover) !important;
  }
  button:active {
    background: var(--button-active);
    outline-color: white !important;
  }
  button.call-to-action {
    background: var(--accent-color);
    color: white;
  }
  button.call-to-action:hover {
    background: var(--accent-hover);
  }
  button.call-to-action:active {
    background: var(--accent-active);
  }
</style>
<script>
  import { createEventDispatcher } from "svelte/internal";
  export let background = true;
  export let callToAction = false;
  export let outline = false;
  export let style = '';

  const emit = createEventDispatcher();
</script>
<button
  {style}
  style:outline={outline ? '1px solid var(--trivial-color)' : ''}
  class:call-to-action={callToAction}
  class:with-bg={background}
  on:click={e => emit('click', e)}
  on:mousedown={e => emit('mousedown', e)}
  on:mouseup={e => emit('mouseup', e)}
  on:mouseover={e => emit('mouseover', e)}
  on:focus={e => emit('focus', e)}
  on:mouseout={e => emit('mouseout', e)}
  on:blur={e => emit('blur', e)}
>
  <slot></slot>
</button>