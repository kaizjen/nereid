<style>
  button {
    padding: 0.5rem;
    padding-inline: 0.7rem;
    min-width: 80px;
    border-radius: 0.2rem;
    transition: .25s;
  }
  button.with-bg {
    background: var(--t-white-base);
  }
  button:hover {
    background: var(--t-white-5);
  }
  button:hover:active {
    background: var(--t-white-6);
    transition: 0s;
  }
  button.call-to-action {
    background: var(--accent-5);
    color: var(--text);
  }
  button.call-to-action:hover {
    background: var(--accent-6);
  }
  button.call-to-action:hover:active {
    background: var(--accent-8);
  }

  button:disabled {
    opacity: 0.8;
  }

  @media (prefers-color-scheme: light) {
    button.with-bg {
      background: var(--t-black-base);
    }
    button:hover {
      background: var(--t-black-3);
    }
    button:hover:active {
      background: var(--t-black-4);
    }
    button.call-to-action {
      background: var(--accent-6);
      color: var(--text);
    }
    button.call-to-action:hover {
      background: var(--accent-8);
    }
    button.call-to-action:hover:active {
      background: var(--accent-9);
    }
  }
</style>
<script>
  import { createEventDispatcher } from "svelte/internal";
  export let background = true;
  export let callToAction = false;
  export let disabled = false;
  export let style = '';

  const emit = createEventDispatcher();
</script>
<button
  {style}
  class:call-to-action={callToAction}
  class:with-bg={background}
  {disabled}
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