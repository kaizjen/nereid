<style>
  .dialog {
    right: 10px;
    padding: 0;
  }
  main {
    padding: 12px;
  }
  .biginfo {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .amount {
    display: block;
    color: var(--trivial-text);
    margin-bottom: 20px;
  }
  .warn, .error {
    margin-top: 10px;
    display: block;
    color: var(--trivial-text);
    text-align: center;
    font-size: smaller;
  }
  .error {
    color: #ceb4209a;
  }
  footer {
    margin-top: 8px;
    padding: 12px;
    text-align: center;
    background: #8080804a;
  }
</style>
<script>
  const { ipcRenderer, sendInternal } = window.nereid;

  import { getContext } from "svelte"
  import { fly } from "svelte/transition"
  import Button from "//lib/Button.svelte"

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

  let abEnabled = true;
  let isError = false;
  let info = {};
  void async function () {
    info = await ipcRenderer.invoke('getAdblockerInfo');
    isError = (await ipcRenderer.invoke('getAdblockerStatus')).adBlockerError
    abEnabled = !$config.privacy.adblockerWhitelist.includes(protocol + hostname);
  }()

  function reload() {
    ipcRenderer.send('@tab', 'refresh');
    setTop(false)
    open = false;
  }

  function turnOffAB() {
    abEnabled = false;
    $config.privacy.adblockerWhitelist.push(protocol + hostname);
    $config = $config;
    sendInternal('userData', 'config:set', $config);

    reload()
  }

  function turnOnAB() {
    abEnabled = false;
    $config.privacy.adblockerWhitelist = $config.privacy.adblockerWhitelist.filter(value => value != protocol + hostname);
    sendInternal('userData', 'config:set', $config);

    reload()
  }
</script>
<div class="dialog" in:fly={window.flyoutProperties}>
  <main>
    <div class="biginfo">
      <img
        src="n-res://{$colorTheme}/shield{isError ? '-bad' : (info.trackersBlocked == 0 ? '-neutral' : abEnabled ? '-good' : '-bad')}.svg"
        alt=""
      >
      <h2>
        {isError ? _.BAD : (info.trackersBlocked == 0 ? _.NEUTRAL : (abEnabled ? _.GOOD : _.BAD))}
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
    Powered by Cliqz
  </footer>
</div>
<div class="blocker" on:click={() => {setTop(false); open = false}}></div>