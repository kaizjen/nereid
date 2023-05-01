<style>
  .bold { font-weight: bold; }
  .italic { font-style: italic; }
  .underline { text-decoration: underline; }
  .gray { color: gray }
  .blue { color: var(--accent-5) }

  span {
    white-space: pre;
  }
</style>

<script>
  export let value;
</script>

{#each value as rt}
  <span
    class:bold={rt.bold}
    class:italic={rt.italic}
    class:underline={rt.underline}
    class:gray={rt.gray}
    class:blue={rt.blue}
  >{rt.text}</span>
{/each}