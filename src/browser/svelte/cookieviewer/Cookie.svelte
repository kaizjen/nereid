<style>
  li {
    display: block;
    padding: 3px;
    padding-inline: 8px;
  }
  .gray {
    color: var(--gray-8);
    margin-left: 20px;
  }
  .selected {
    background: var(--accent-9);
  }

  .selected > .gray {
    color: var(--accent-1);
  }

  @media (prefers-color-scheme: light) {
    .gray {
      color: var(--gray-3);
    }
    .selected {
      background: var(--accent-9);
    }

    .selected > .gray {
      color: var(--accent-1);
    }
  }
</style>
<script>
  export let cookie;
  export let i;
  export let selected;
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<li tabindex="0" class:selected={i == selected} on:click={() => selected = i} on:keypress={e => e.key == "Enter" ? selected = i : null}>
  <b>{cookie.name}</b>
  <span class="gray">{cookie.domain}</span>
</li>