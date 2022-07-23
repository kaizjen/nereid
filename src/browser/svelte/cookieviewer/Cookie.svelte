<style>
  li {
    display: block;
    padding: 3px;
    padding-inline: 8px;
  }
  .gray {
    color: var(--trivial-color);
    margin-left: 20px;
  }
  .selected {
    background: var(--accent-active);
  }
</style>
<script>
  export let cookie;
  export let i;
  export let selected;
</script>

<li class:selected={i == selected} on:click={() => selected = i}>
  <b>{cookie.name}</b>
  <span class="gray">{cookie.domain}</span>
</li>