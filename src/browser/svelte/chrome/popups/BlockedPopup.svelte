<style>
  .dialog {
    right: 0;
  }
  main {
    padding: 1rem;
  }
  .title {
    font-weight: bold;
    font-size: 1.1rem;
    margin-top: 0.2rem;
    margin-bottom: 0.5rem;
  }
  .popups {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 1.3rem;
  }
  .option {
    display: flex;
    align-items: center;
    margin-block: 0.7rem;
  }
  .buttons {
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
    align-items: center;
  }
  input {
    accent-color: var(--accent-5);
  }
</style>
<script>
  const { ipcRenderer, sendInternal } = window.nereid;

  import { getContext } from "svelte";
  import { fly } from "svelte/transition";
  import Button from "//lib/Button.svelte";
  import { appear } from "//lib/transition.js";

  const setTop = getContext('setTop');
  const config = getContext('config');

  export let open;
  export let hostname;
  export let popups = [];
  export let triggerRect;

  const { t } = window;
  const _ = {
    POPUPS_BLOCKED: t('ui.popupBlocked.dialog.title'),
    OPEN_THIS: t('ui.popupBlocked.dialog.openThis'),
    ALWAYS_ALLOW: t('ui.popupBlocked.dialog.option-alwaysAllow', { hostname }),
    BLOCK: t('ui.popupBlocked.dialog.option-block', { hostname }),
    SILENTLY_BLOCK: t('ui.popupBlocked.dialog.option-silentlyBlock', { hostname }),
    MANAGE: t('ui.popupBlocked.dialog.manage'),
    DONE: t('common.done'),
  }

  setTop(true)

  function openPopupF(popup) {
    return function () {
      open = false;
      ipcRenderer.send('reopenBlockedWindow', popup.blockedPopupID);
      popups.splice(popups.indexOf(popup), 1);
      popups = popups;
    }
  }

  const popupsSetting = $config.privacy.sitePermissions[hostname]?.popups;
  let setting = popupsSetting == null ? 'block' : (popupsSetting ? 'alwaysallow' : 'silent');

  function changeSetting() {
    if (!$config.privacy.sitePermissions[hostname]) {
      $config.privacy.sitePermissions[hostname] = {};
    }
    $config.privacy.sitePermissions[hostname].popups = 
      setting == 'alwaysallow' ? true : (
        setting == 'silent' ? false :
        null
      )
    ;

    sendInternal('userData.config.set', $config)
  }
  $: {setting; changeSetting()}

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
    <div class="title">{_.POPUPS_BLOCKED}</div>
    <div class="popups">
      {#each popups as pInfo}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <!-- svelte-ignore a11y-missing-attribute -->
        <a tabindex="0" on:click={openPopupF(pInfo)} on:keypress={openPopupF(pInfo)} title={_.OPEN_THIS}>{pInfo.url}</a>
      {/each}
    </div>

    <div class="option">
      <input type="radio" value="alwaysallow" id="alwaysallow" bind:group={setting}>
      <label for="alwaysallow">{_.ALWAYS_ALLOW}</label><br>
    </div>

    <div class="option">
      <input type="radio" value="block" id="block" bind:group={setting}>
      <label for="block">{_.BLOCK}</label><br>
    </div>

    <div class="option">
      <input type="radio" value="silent" id="silent" bind:group={setting}>
      <label for="silent">{_.SILENTLY_BLOCK}</label><br>
    </div>

    
    <div class="buttons">
      <!-- svelte-ignore a11y-missing-attribute -->
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <a tabindex="0" on:keypress={e => e.currentTarget.click()} on:click={() => {
        ipcRenderer.send('openUniqueNereidTab', 'settings', true, `#siteSettings/site:${hostname}`);
        open = false;
      }}>{_.MANAGE}</a><br>
      <Button
        on:click={() => open = false}
      >{_.DONE}</Button>
    </div>
  </main>
</div>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="blocker" on:click={() => open = false}></div>