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
  export let allowNewLines = true;

  function sanitize(text) {
    if (!allowNewLines) {
      text = text.replaceAll('\n', '  ')
    }
    return text;
  }
</script>

{#each value as rt}
  <span
    class:bold={rt.bold}
    class:italic={rt.italic}
    class:underline={rt.underline}
    class:gray={rt.gray}
    class:blue={rt.blue}
  >{sanitize(rt.text, allowNewLines)}</span>
{/each}