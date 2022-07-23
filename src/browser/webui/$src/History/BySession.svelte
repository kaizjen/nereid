<style>
  .list {
    border-radius: 4px;
    overflow: hidden;
    background: #80808033;
    margin-bottom: 10px;
  }
</style>
<script>
  import Entry from "./Entry.svelte";

  export let list;

  let formattedList = list.filter((item, index) => {
    return list.findIndex(e => e.url == item.url) == index;
  })
</script>

<div class="list">
  {#each formattedList as entry}
    <Entry {entry} />
  {/each}
</div>