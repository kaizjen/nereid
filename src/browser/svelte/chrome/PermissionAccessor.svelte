<style>
  .icon {
    width: 24px;
    height: 24px;
    align-self: center;
  }
  span {
    flex-grow: 1;
    margin-left: 10px;
    display: flex;
    align-items: center;
  }
</style>
<script>
  const { ipcRenderer } = window.nereid;
  import { getContext } from "svelte/internal";
  import Button from "//lib/Button.svelte";

  const colorTheme = getContext('colorTheme')

  const { t } = window;
  const _ = {
    permission: {
      NAME: name => t(`common.permissions.${name}.name`),
      PROMPT: (name, hostname, data) => t(`common.permissions.${name}.prompt`, { hostname, ...data }),
      ALT: name => t(`ui.popups.permission.alt`, { name: t(`common.permissions.${name}.name`) }),
    },
    ALLOW: t('common.permissions.status.allow'),
    DENY: t('common.permissions.status.deny'),
    IGNORE: t('common.permissions.status.ignore'),
    DEFAULT: t('common.permissions.status.defaultMark'),
    LOADING: t('common.loading'),
    APPICON: app => t('ui.popups.permission.appIcon', { app })
  }

  export let tab;
  let permissionPendingMap = {};
  let currentTabPermissions = [];
  $: currentTabPermissions = permissionPendingMap[tab?.uid] || []
  let thisPerm;
  $: thisPerm = currentTabPermissions[0]

  function updateMap() {
    permissionPendingMap = permissionPendingMap;
    requestAnimationFrame(() => {
      ipcRenderer.send('chrome.setHeight', document.body.getBoundingClientRect().height)
    })
  }

  ipcRenderer.on('askPermission', (_e, tabUID, permObject) => {
    if (tabUID in permissionPendingMap) {
      permissionPendingMap[tabUID].push(permObject);
      
    } else {
      permissionPendingMap[tabUID] = [ permObject ]
    }
    updateMap()
  })
  ipcRenderer.on('removePermission', (_e, tabUID, { name, hostname }) => {
    let perms = permissionPendingMap[tabUID];
    let id = perms.find(o => o.name == name && o.hostname == hostname);
    if (id == -1) return;

    perms.splice(id, 1);
    updateMap()
  })

  function sendAllow() {
    ipcRenderer.send('setPermission', {
      allow: true,
      tabUID: tab.uid,
      permission: thisPerm
    })
  }
  function sendDeny() {
    ipcRenderer.send('setPermission', {
      allow: false,
      tabUID: tab.uid,
      permission: thisPerm
    })
  }
  function sendIndifferent() {
    ipcRenderer.send('setPermission', {
      allow: null,
      tabUID: tab.uid,
      permission: thisPerm
    })
  }

  let noSuchImage = false;
  let overriddenIcon;
  let appName;

  async function getExternalInfo() {
    let info = await ipcRenderer.invoke('getAppForProtocol', thisPerm.externalURL);
    noSuchImage = false;
    console.log("App info for", thisPerm.externalURL, ":", info);
    overriddenIcon = info.icon;
    appName = info.name
    return info.name;
  }
</script>

{#if currentTabPermissions.length > 0}
  <div class="dropdown-box">
    {#if !noSuchImage}
      <img class="icon" src={overriddenIcon || `n-res://${$colorTheme}/permissions/${thisPerm.name}.svg`}
        alt={overriddenIcon ? _.APPICON(appName) : _.permission.ALT(thisPerm.name)}
        on:error={() => noSuchImage = true}
      >
    {/if}
    {#if thisPerm.name == 'openExternal'}
      {#await getExternalInfo()}
        <span> {_.LOADING} </span>
      {:then app}
        <span> {_.permission.PROMPT(thisPerm.name, thisPerm.hostname, { app })} </span>
      {/await}
    {:else}
      <span> {_.permission.PROMPT(thisPerm.name, thisPerm.hostname)} </span>
    {/if}
    <Button on:click={sendAllow} style="margin-right: 10px;">{_.ALLOW}</Button>
    <Button on:click={sendDeny}>{_.DENY}</Button>
    <button class="tool" style="margin-left: 20px" on:click={sendIndifferent}>
      <img src="n-res://{$colorTheme}/cross.svg" alt={_.IGNORE} title={_.IGNORE}>
    </button>
  </div>
{/if}