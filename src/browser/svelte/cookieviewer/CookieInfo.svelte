<style>
  table {
    display: block;
    overflow: auto;
    margin-bottom: 15px;
    max-height: 40vh;
    white-space: nowrap;
  }
  .val {
    user-select: text;
    color: var(--gray-9);
  }
  ::selection {
    background: var(--accent-3);
  }
  div {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
  }

  @media (prefers-color-scheme: light) {
    .val {
      color: var(--gray-2);
    }
    ::selection {
      background: var(--accent-8);
    }
  }
</style>
<script>
  import { createEventDispatcher } from "svelte";
  import Button from "//lib/Button.svelte"

  const dispatch = createEventDispatcher()

  export let cookie;
  export let tt;

  const dtf = new Intl.DateTimeFormat(navigator.language, { dateStyle: 'medium', timeStyle: 'medium' });

  function formatProperty(prop) {
    const value = cookie[prop];
    switch (prop) {
      case 'expirationDate': {
        return dtf.format(value)
      }
      case 'sameSite': {
        return tt(`sameSite.${value}`)
      }
    
      default: return value
    }
  }

  function copyJSON() {
    window.nereid.sendInternalSync('clipboard', 'writeText', JSON.stringify(cookie))
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<table tabindex="0">
  {#each Object.keys(cookie) as prop}
    <tr>
      <td class="prop">{tt(`props.${prop}`)}</td><td class="val">{formatProperty(prop)}</td>
    </tr>
  {/each}
</table>
<div>
  <Button on:click={() => dispatch('delete')}>{tt('remove')}</Button>
  <Button on:click={copyJSON}>{tt('copyJSON')}</Button>
</div>