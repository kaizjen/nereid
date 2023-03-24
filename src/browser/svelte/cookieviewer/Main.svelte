<style>
  div {
    user-select: none;
    font-family: system-ui;
    font-size: small;
  }
  .cookielist {
    padding: 0;
    border: 1px solid var(--gray-2);
    height: 30vh;
    overflow: auto;
  }
  @media (prefers-color-scheme: light) {
    .cookielist {
      border: 1px solid var(--gray-8);
    }
  }
</style>
<script>
  import Cookie from "./Cookie.svelte";
  import CookieInfo from "./CookieInfo.svelte";

  const { sendInternal, ipcRenderer } = window.nereid;

  const t = (str, ...args) => ipcRenderer.sendSync('t', str, ...args);
  const tt = (str, ...args) => t(`windows.cookieViewer.${str}`, ...args)

  const page = location.hash.slice(1);
  let cookies = [];
  let selectedIndex = -1;

  function getHostname(url) {
    try {
      return new URL(url).hostname;

    } catch (_) {
      return url;
    }
  }
  function getProtocol(url) {
    try {
      return new URL(url).protocol;

    } catch (_) {
      return 'http';
    }
  }

  $: console.log(selectedIndex)

  let promise = new Promise(async resolve => {
    cookies = await sendInternal('cookies.get', { url: page })
    console.log('cookies', cookies);
    window.cookies = cookies
    resolve()
  })

  async function deleteSelected() {
    const cookie = cookies[selectedIndex];
    console.log('rm', {
      url: `${getProtocol(page)}//${cookie.domain}${cookie.path}`,
      name: cookie.name
    });
    await sendInternal('cookies.remove', {
      url: `${getProtocol(page)}//${cookie.domain}${cookie.path}`,
      name: cookie.name
    })
    cookies.splice(selectedIndex, 1);
    if (cookies.length < 1) {
      selectedIndex = -1;
    }
    if (selectedIndex >= cookies.length) {
      selectedIndex--;
    }
    cookies = cookies;
  }
</script>

<svelte:head>
  <title>{tt('title', { hostname: getHostname(page) })}</title>
</svelte:head>

<div class="main">
  {#await promise}
      <span class="center">
        {t('common.loading')}
      </span>
    {:then _} 
      <ul class="cookielist">
        {#each cookies as cookie, i}
          <Cookie {cookie} bind:selected={selectedIndex} {i} />
        {/each}
      </ul>
      {#if selectedIndex > -1}
        <CookieInfo {tt} cookie={cookies[selectedIndex]} on:delete={deleteSelected} />
      {/if}
  {/await}
</div>