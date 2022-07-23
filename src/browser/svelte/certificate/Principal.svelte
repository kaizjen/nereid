<script>
  export let value;
</script>

{#each Object.keys(value) as prop}
  <div>
    {prop}: <b style:user-select="text">{value[prop]}</b>
  </div>
{/each}