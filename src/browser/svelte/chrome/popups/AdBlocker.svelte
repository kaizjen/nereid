<style>
  .dialog {
    right: 0;
  }
  main {
    padding: 0.68rem;
  }
  .biginfo {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .biginfo > img {
    margin-right: 0.6rem;
  }
  .amount {
    display: block;
    color: var(--gray-8);
    margin-bottom: 1.25rem;
  }
  .warn, .error {
    margin-top: 0.625rem;
    display: block;
    color: var(--gray-8);
    text-align: center;
    font-size: smaller;
  }
  .error {
    color: #ceb4209a;
  }
  footer {
    margin-top: 0.5rem;
    padding: 0.68rem;
    text-align: center;
    background: var(--t-white-2);
  }

  @media (prefers-color-scheme: light) {
    .amount {
      color: var(--gray-1);
    }
    .warn, .error {
      color: var(--gray-1);
    }
    .error {
      color: #ceb4209a;
    }
    footer {
      background: var(--t-black-2);
    }
  }
</style>
<script>
  const { ipcRenderer, sendInternal } = window.nereid;

  import { getContext } from "svelte";
  import { fly } from "svelte/transition";
  import { appear } from "//lib/transition.js";
  import Button from "//lib/Button.svelte";

  const setTop = getContext('setTop');
  const colorTheme = getContext('colorTheme');
  const config = getContext('config');

  const { t } = window;
  const _ = {
    GOOD: t('ui.adblocker.status-good'),
    BAD: t('ui.adblocker.status-bad'),
    NEUTRAL: t('ui.adblocker.status-neutral'),
    BLOCKED_AMOUNT: count => t('ui.adblocker.blockedAmount', { count }),
    LIST: t('ui.adblocker.list'),
    SWITCH_OFF: hostname => t('ui.adblocker.switch-off', { hostname }),
    SWITCH_ON: hostname => t('ui.adblocker.switch-on', { hostname }),
    WARNINGS: {
      ACTIVE: hostname => t('ui.adblocker.warnings.active', { hostname }),
      INACTIVE: hostname => t('ui.adblocker.warnings.inactive', { hostname }),
      MALFUNCTION: hostname => t('ui.adblocker.warnings.malfunction', { hostname }),
      NOT_READY: hostname => t('ui.adblocker.warnings.notReady', { hostname }),
      RELOAD: hostname => t('ui.adblocker.warnings.button-reload', { hostname }),
    },
  }

  setTop(true)

  export let open;
  export let hostname;
  export let protocol;
  export let triggerRect;

  let abEnabled = true;
  let isError = false;
  let info = {};
  void async function () {
    info = await ipcRenderer.invoke('getAdblockerInfo');
    isError = (await ipcRenderer.invoke('getAdblockerStatus')).adBlockerError
    abEnabled = !$config.privacy.adblockerWhitelist.includes(protocol + hostname);
  }()

  function reload() {
    ipcRenderer.send('currentTab.refresh');
    open = false;
  }

  function turnOffAB() {
    abEnabled = false;
    $config.privacy.adblockerWhitelist.push(protocol + hostname);
    $config = $config;
    sendInternal('userData.config.set', $config);

    reload()
  }

  function turnOnAB() {
    abEnabled = false;
    $config.privacy.adblockerWhitelist = $config.privacy.adblockerWhitelist.filter(value => value != protocol + hostname);
    sendInternal('userData.config.set', $config);

    reload()
  }

  function openCliqzRepoF(isKey) {
    return (event) => {
      if (isKey && event.key != "Enter") return;
      open = false;
      ipcRenderer.send('newTab', { url: 'https://github.com/ghostery/adblocker' });
    }
  }

  $: marginRight = (document.body.clientWidth - triggerRect.x - triggerRect.width) + 'px'
</script>
<div
  class="dialog"
  in:appear={window.flyoutProperties}
  out:fly={window.flyoutProperties}
  on:outroend={() => setTop(false)}
  style:margin-right={marginRight}
>
  <main>
    <div class="biginfo">
      <img
        src="n-res://{$colorTheme}/shield{isError ? '-bad' : abEnabled ? (info.trackersBlocked?.length > 0 ? '-good' : '-neutral') : '-bad'}.svg"
        alt=""
      >
      <h2>
        {isError ? _.BAD : (abEnabled ? (info.trackersBlocked?.length > 0 ? _.GOOD : _.NEUTRAL) : _.BAD)}
      </h2>
    </div>
    {#if info.trackersBlocked?.length > 0}
      <span class="amount">
        {_.BLOCKED_AMOUNT(info.trackersBlocked?.length)}
      </span>
    {/if}
    {#if !isError}
      {#if info.wasReady}
        {#if abEnabled}
          <Button on:click={turnOffAB}>
            {_.SWITCH_OFF(hostname)}
          </Button>
          <span class="warn">
            {_.WARNINGS.ACTIVE(hostname)}
          </span>
        {:else}
          <Button on:click={turnOnAB}>
            {_.SWITCH_ON(hostname)}
          </Button>
          <span class="warn">
            {_.WARNINGS.INACTIVE(hostname)}
          </span>
        {/if}
      {:else}
        <span class="error">
          {_.WARNINGS.NOT_READY(hostname)}
        </span>
        <Button on:click={reload}>
          {_.WARNINGS.RELOAD(hostname)}
        </Button>
      {/if}

    {:else}
      <span class="error">
        {_.WARNINGS.MALFUNCTION(hostname)}
      </span>
    {/if}
  </main>
  <footer>
    <!-- svelte-ignore a11y-missing-attribute -->
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    Powered by <a tabindex="0" on:keypress={openCliqzRepoF(true)} on:click={openCliqzRepoF(false)}>Cliqz</a>
  </footer>
</div>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="blocker" on:click={() => open = false}></div>