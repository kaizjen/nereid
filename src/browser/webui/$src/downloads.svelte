<style>
  main {
    width: 100%;
    margin-top: 40px;
    display: flex;
    justify-content: center;
  }
  .container {
    flex-grow: 1;
    max-width: 24cm;
  }
</style>

<script>
  import { ProgressRing } from "fluent-svelte";
  import Header from "./common/Header.svelte";
  import Download from "./Downloads/Download.svelte";
  import * as Icons from "./icons.js"

  const { t } = window.nereid.i18n;

  let downloads;
  const promise = new Promise(async(y) => {
    downloads = await nereid.userdata.downloads.get();
    y()
  })
</script>

<svelte:head>
  <title>{t('common.downloads')}</title>
</svelte:head>

<header>
  <Header name="downloads">
    <Icons.Downloads />
  </Header>
</header>

<main>
  <div class="container">
    {#await promise}
      <ProgressRing />
    {:then _}
      {#each downloads as download, i (download)}
        <Download {download} {i} on:delete={async() => {
          await window.nereid.userdata.downloads.delete(i)

          downloads.splice(i, 1);
          downloads = downloads;
        }} />
      {/each}
    {/await}
  </div>
</main>