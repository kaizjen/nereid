<style>
  .info {
    display: flex;
    font-weight: bold;
    padding: 0.375rem;
    justify-content: center;
    align-items: center;
  }
  .info > * {
    margin-left: 0.25rem;
  }
  .more_info {
    padding: 0.375rem;
    opacity: 0.7;
    font-size: small;
  }
  .separator {
    background: var(--t-white-6);
    padding: 1px;
    margin-bottom: 1.25rem;
    margin-top: 0.937rem;
  }
  button {
    display: flex;
    padding: 0.5rem;
    align-items: center;
    border-radius: 0.25rem;
    transition: .25s;
    opacity: 0.85;
    width: -webkit-fill-available;
  }
  button:hover {
    background: var(--t-white-3);
  }
  button:hover:active {
    background: var(--t-white-5);
    transition: 0s;
  }
  button > img {
    margin-right: 0.5rem;
  }
  .perm-title {
    margin-bottom: 0.5rem;
  }

  @media (prefers-color-scheme: light) {
    .separator {
      background: var(--t-black-3);
    }
    .more_info {
      opacity: 1;
    }
    button:hover {
      background: var(--t-black-2);
    }
    button:hover:active {
      background: var(--t-black-4);
    }
  }
</style>

<script>
  export let isOpen;
  export let tab;
  const { ipcRenderer, sendInternal } = window.nereid
  import { getContext } from 'svelte/internal';
  import { fly } from 'svelte/transition';
  import { appear } from "//lib/transition.js";
  import Permission from './Security/Permission.svelte';

  const GREEN_COLOR = '74b22b';

  const { t } = window;
  const _ = {
    TITLE: t('ui.security.title'),
    msg: {
      SECURE: t('ui.security.message-secure'),
      INTERNAL: t('ui.security.message-internal'),
      LOCAL: t('ui.security.message-local'),
      INSECURE: t('ui.security.message-insecure'),
    },
    desc: {
      SECURE: t('ui.security.description-secure'),
      INSECURE: t('ui.security.description-insecure'),
    },
    btn: {
      CERT: t('ui.security.button-viewCertificate'),
      COOKIE: t('ui.security.button-cookieFiles'),
      SETTS: t('ui.security.button-siteSettings'),
    },
    PERMISSIONS: site => t('ui.security.permissions', { site })
  }

  function getHostname(url) {
    try {
      return (new URL(url)).hostname
    } catch (_) {
      return `<invalid url>`;
    }
  }

  let hostname;
  $: hostname = getHostname(tab.url);

  let defaultPermissions;
  $: defaultPermissions = $config.privacy.defaultPermissions;

  let sitePermissions;
  $: sitePermissions = $config.privacy.sitePermissions;

  let thisPermissions;
  $: thisPermissions = sitePermissions[hostname];

  const setTop = getContext('setTop')
  const colorTheme = getContext('colorTheme')
  const config = getContext('config')

  setTop(true)

  function showCertificate() {
    ipcRenderer.send('showCertificate', hostname)
    isOpen = false;
  }
  function showCookies() {
    ipcRenderer.send('showCookies', tab.url)
    isOpen = false;
  }
  function siteSettings() {
    ipcRenderer.send('newTab', { url: `nereid://settings#siteSettings/site:${hostname}` })
    isOpen = false;
  }
</script>

<div class="dialog" in:appear={window.flyoutProperties} out:fly={window.flyoutProperties} on:outroend={() => setTop(false)}>
  <div class="dialog-content">
    <div class="info" style:color={tab.security === true ? ('#' + GREEN_COLOR) : ''}>
      <img src={
        tab.security === true ? `n-res://${GREEN_COLOR}/secure.svg` : 
        tab.security == 'internal' ? `n-res://${$colorTheme}/nereid.svg` : 
        tab.security == 'local' ? `n-res://${$colorTheme}/file.svg` :
        `n-res://${$colorTheme}/insecure.svg`
      } alt="">
      <span>{
        tab.security === true ? _.msg.SECURE : 
        tab.security == 'internal' ? _.msg.INTERNAL : 
        tab.security == 'local' ? _.msg.LOCAL :
        _.msg.INSECURE
      }</span>
    </div>
    {#if !['internal', 'local'].includes(tab.security)}
      <div class="more_info">
        { tab.security === true ? _.desc.SECURE : _.desc.INSECURE }
      </div>
      <div class="separator"></div>
      {#if tab.security === true}
        <button on:click={showCertificate}><img src="n-res://{$colorTheme}/certificate.svg" alt=""> {_.btn.CERT}</button>
      {/if}
      <button on:click={showCookies}><img src="n-res://{$colorTheme}/cookie.svg" alt=""> {_.btn.COOKIE}</button>
      <button on:click={siteSettings}><img src="n-res://{$colorTheme}/sitesettings.svg" alt=""> {_.btn.SETTS}</button>

      {#if hostname in sitePermissions}
        <h3 class="perm-title">{_.PERMISSIONS(hostname)}</h3>
        {#each Object.keys(thisPermissions) as key}
          <Permission name={key} value={thisPermissions[key]} on:change={({ detail }) => {
            thisPermissions[key] = detail;
            sendInternal('userData.config.set', $config);
          }} defaultValue={defaultPermissions[key]} />
        {/each}
      {/if}
    {/if}
  </div>
</div>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="blocker" on:click={() => isOpen = false}></div>