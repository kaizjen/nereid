<style>
  .hints {
    display: flex;
    flex-direction: column;
    background: var(--dark-1);
    width: 100%;
    overflow: hidden;
    z-index: 1;
    -webkit-app-region: no-drag;
    padding-top: 0.2rem;
  }
  .hint {
    padding-block: 0.65rem;
    padding-inline-start: 0.08rem;
    display: flex;
    text-align: left;
    white-space: nowrap;
    position: relative;
    align-items: center;
  }
  .hint.sel {
    background: var(--t-white-2);
  }
  .hint.sel::before {
    content: '';
    background: var(--accent-5);
    left: 0;
    height: calc(100% - 0.2rem);
    width: 0.3rem;
    border-radius: 0 1rem 1rem 0;
    margin-block: 0.1rem;
    position: absolute;
  }
  .icon {
    padding-inline: 0.95rem;
    width: 0.98rem;
    height: 0.98rem;
  }
  .hint:hover {
    background: var(--t-white-3);
  }
  .hint:active {
    background: var(--t-white-1);
  }
  .content {
    display: inline-flex;
    margin-inline-start: 0.2rem;
  }

  @media (prefers-color-scheme: light) {
    .hints {
      background: var(--light-9);
    }
    .hint.sel {
      background: var(--t-black-2);
    }
    .hint:hover {
      background: var(--t-black-2);
    }
    .hint:active {
      background: var(--t-black-1);
    }
  }
</style>

<script>
  export let hints;
  export let selected = 0;
  export let clickHint;
  export let getRealImageURL;
  import { fade } from 'svelte/transition'
  import RichText from './RichText.svelte';
  import { getContext } from 'svelte';

  const colorTheme = getContext('colorTheme');

  function clickHintF(hint) {
    return () => clickHint(hint)
  }

  let imageURLs = []

  function updateImageURLs() {
    imageURLs = hints.map(getRealImageURL)
  }

  $: {
    hints, updateImageURLs()
  }
</script>

<div class="hints" in:fade={{ duration: 80 }}>
  {#each hints as hint, index}
    <button
      tabindex="0"
      on:click={clickHintF(hint)}
      class:sel={selected == index}
      class="hint"
    >
      <img
        class="icon"
        src="{imageURLs[index]}"
        alt=""
        on:error={() => imageURLs[index] = `n-res://${$colorTheme}/webpage.svg`}
      >
      <span class="h-body content">
        <RichText value={hint.contents} />
      </span>
      <span class="content">
        <RichText value={hint.desc} />
      </span>
    </button>
  {/each}
</div>