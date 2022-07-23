<script>
  import { TextBlock } from "fluent-svelte";
  import BySession from "./BySession.svelte";

  export let date;
  export let entries;

  const fmt = Intl.DateTimeFormat(navigator.language, { dateStyle: 'long' })

  let sortedEntries = {};
  function sortEntriesBySession() {
    entries.forEach(e => {
      const { sessionUUID } = e;

      if (sessionUUID in sortedEntries) {
        sortedEntries[sessionUUID].push(e)

      } else {
        sortedEntries[sessionUUID] = [ e ]
      }
    })
  }
  $: {entries; sortEntriesBySession()}
</script>

<TextBlock variant="title">
  {fmt.format(date)}
</TextBlock>
<pre>
  {#each Object.keys(sortedEntries) as UUID}
    <BySession list={sortedEntries[UUID]} />
  {/each}
</pre>