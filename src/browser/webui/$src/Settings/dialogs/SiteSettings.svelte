<style>
  .wrapper {
    position: relative;
  }
  .space {
    margin-block: 30px;
  }
  .text-center {
    text-align: center;
  }
  .flex {
    display: flex;
  }
  .flex.col {
    flex-direction: column;
  }
  .permission {
    display: flex;
    flex-direction: column;
    margin-block: 20px;
  }
  .perm-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }
</style>
<script>
  import { ListItem, TextBlock, ContentDialog, IconButton, ToggleSwitch, TextBox, AutoSuggestBox, Button, ComboBox, ContextMenu, MenuFlyoutItem } from "fluent-svelte";
  import { afterUpdate, getContext } from "svelte/internal";
  import { ArrowBack } from "nereid://js/icons";
  import { fly } from "svelte/transition";

  export let update;

  const config = getContext('config')

  const { t: _t } = window.nereid.i18n;
  function t(str, ...args) {
    return _t(`pages.settings.privacy.siteSettings.${str}`, ...args)
  }

  const afterUpdateHooks = [];
  afterUpdate(() => {
    afterUpdateHooks.forEach(f => f());
    afterUpdateHooks.splice(0, afterUpdateHooks.length)
  })

  const hash = location.hash.toLowerCase().trim();

  let pages = {
    sitesOverview: hash.endsWith('/sites'),
    site: hash.includes('/site:'),
    defaultPermissions: hash.endsWith('/permissions'),
    cookies: hash.endsWith('/cookies')
  }
  let _animation_comingFromSite = false;

  $: mainPage = !pages.sitesOverview && !pages.site && !pages.defaultPermissions && !pages.cookies


  let sites = Object.keys($config.privacy.sitePermissions)
  let currentSite = pages.site ? hash.slice('#siteSettings/site:'.length) : '';

  $: if (currentSite != '') {
    location.hash = '#siteSettings/site:'+currentSite
  } else {
    location.hash = '#siteSettings'
  }

  function getSitePermissions(site) {
    let sitePerms = $config.privacy.sitePermissions;
    return Object.keys(sitePerms[site] || {}).filter(k => sitePerms[site][k] == true)
  }

  function isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  }

  function addHTTP(url) {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      return url;
    } else {
      return 'https://'+url
    }
  }

  $: if (isValidURL(addHTTP(currentSite))) {
    let url = new URL(addHTTP(currentSite));
    currentSite = url.hostname
  }

  function getPermissionName(permKey, permValue) {
    let permBoolStatus = permValue == 'allow' ? true : permValue == 'deny' ? false : null;
    let defaultBoolStatus = $config.privacy.defaultPermissions[permKey];
    let defaultTextStatus = defaultBoolStatus == true ? 'allow' : defaultBoolStatus == false ? 'deny' : 'ask'

    if (permBoolStatus == null) {
      return _t('common.permissions.status.useDefault') + ` (${_t(`common.permissions.status.${defaultTextStatus}`)})`
    }

    return _t(`common.permissions.status.${permValue}`);
  }
  function getPermissionValue(site, permKey) {
    return $config.privacy.sitePermissions[site]?.[permKey] ?? null
  }
  let recentlyChanged = {}
  function handleChangeF(site, permKey) {
    return async function ({ detail }) {
      if (recentlyChanged[site]) return;

      console.log(`Changed`, site, permKey, detail);
      let stPerms = $config.privacy.sitePermissions
      if (site in stPerms) {
        $config.privacy.sitePermissions[site][permKey] = detail.value;
        
      } else {
        $config.privacy.sitePermissions[site] = { [permKey]: detail.value };
      }

      recentlyChanged[site] = true
      await update();
      requestIdleCallback(() => {
        // prevent an infinite loop
        recentlyChanged[site] = false
      })
    }
  }

  $: defaultPermissions = $config.privacy.defaultPermissions;
  
  function handleDefaultChangeF(permKey) {
    return function ({ detail }) {
      console.log(`Default Changed`, permKey, detail);
      $config.privacy.defaultPermissions[permKey] = detail.value;
      update()
    }
  }

  function resetPermissionsF(site) {
    return async function () {
      if (recentlyChanged[site]) return;

      console.log('Resetting', site);

      delete $config.privacy.sitePermissions[site];
      sites = Object.keys($config.privacy.sitePermissions);

      _animation_comingFromSite = true;
      currentSite = '';
      pages.site = false;
      pages.sitesOverview = true;

      recentlyChanged[site] = true
      await update();
      requestIdleCallback(() => {
        // prevent an infinite loop
        recentlyChanged[site] = false
      })
    }
  }
</script>

<div class="wrapper">
  {#if mainPage}
    <div class="page" in:fly={{ x: -20, duration: 200 }}>
      <TextBlock variant="title">
        {t('title')}
      </TextBlock>
      <div class="space"></div>
      <ListItem on:click={() => { pages.sitesOverview = true }}>
        {t('dialog.main.viewSites')}<br>
      </ListItem>
      <TextBlock variant="caption" style="color: gray; margin-inline: calc(5px + 12px)">
        {t('dialog.main.viewSites-desc')}
      </TextBlock>
      <div class="separator"></div>
      <ListItem on:click={() => { pages.defaultPermissions = true }}>
        {t('dialog.main.permissions')}<br>
      </ListItem>
      <TextBlock variant="caption" style="color: gray; margin-inline: calc(5px + 12px)">
        {t('dialog.main.permissions-desc')}
      </TextBlock>
    </div>
  {/if}
  
  {#if pages.sitesOverview}
    <div class="page" in:fly={{ x: _animation_comingFromSite ? -20 : 20, duration: 200 }} on:introend={() => _animation_comingFromSite = false}>
      <IconButton on:click={() => { pages.sitesOverview = false }}>
        <ArrowBack />
      </IconButton>
      <TextBlock variant="title">
        {t('dialog.sites.title')}
      </TextBlock>
      <div class="space"></div>

      <div class="flex col">
        <Button on:click={() => {pages.sitesOverview = false; pages.site = true; }}>{t('dialog.sites.more')}</Button>
      </div>
      <div class="space"></div>

      <TextBlock variant="subtitle">
        {t('dialog.sites.withPermissions')}
      </TextBlock>
      {#each sites as s}
        <div class="item">
          <ListItem on:click={() => { currentSite = s; pages.sitesOverview = false; pages.site = true; }}>
            {s}
            <TextBlock variant="caption" style="color: gray;">
              {getSitePermissions(s).slice(0, 5).map(p => _t(`common.permissions.${p}.name`)).join(', ')}
            </TextBlock>
          </ListItem>
        </div>
      {/each}
    </div>
  {/if}

  {#if pages.site}
    <div class="page" in:fly={{ x: 20, duration: 200 }}>
      <div class="flex">
        <IconButton on:click={() => { pages.sitesOverview = true; _animation_comingFromSite = true; pages.site = false; currentSite = '' }}>
          <ArrowBack />
        </IconButton>
        <AutoSuggestBox items={sites} placeholder={t('dialog.sitePage.hostPlaceholder')} bind:value={currentSite} />
      </div>
      <div class="space"></div>

      {#if isValidURL(addHTTP(currentSite))}
        
        {#each Object.keys(defaultPermissions) as permissionKey}
          <div class="permission">
            <div class="perm-info">
              <TextBlock variant="bodyStrong">{_t(`common.permissions.${permissionKey}.name`)}</TextBlock>
              <ComboBox items={[
                { name: getPermissionName(permissionKey, 'allow'), value: true },
                { name: getPermissionName(permissionKey, 'deny'), value: false },
                { name: getPermissionName(permissionKey, 'useDefault'), value: null },
              ]} value={getPermissionValue(currentSite, permissionKey)} on:select={handleChangeF(currentSite, permissionKey)} />
            </div>
            <TextBlock style="color: gray;" variant="caption">{_t(`common.permissions.${permissionKey}.desc`)}</TextBlock>
          </div>
        {/each}

        <Button style="width: 100%" on:click={resetPermissionsF(currentSite)}>
          {t('dialog.sites.reset')}
        </Button>

      {:else}
        <div class="text-center">
          <TextBlock variant="caption" style="align: center;">{t('dialog.sitePage.invalidURL')}</TextBlock>
        </div>
      {/if}
    </div>
  {/if}

  {#if pages.defaultPermissions}
    <div class="page" in:fly={{ x: 20, duration: 200 }}>
      <div class="flex">
        <IconButton on:click={() => { pages.defaultPermissions = false; }}>
          <ArrowBack />
        </IconButton>
        <TextBlock variant="title">
          {t('dialog.permissions.title')}
        </TextBlock>
      </div>
      
      {#each Object.keys(defaultPermissions) as perm}
        <div class="permission">
          <div class="perm-info">
            <TextBlock variant="bodyStrong">{_t(`common.permissions.${perm}.name`)}</TextBlock>
            <ComboBox items={[
              { name: _t('common.permissions.status.allow'), value: true },
              { name: _t('common.permissions.status.deny'), value: false },
              { name: _t('common.permissions.status.ask'), value: null },
            ]} value={defaultPermissions[perm]} on:select={handleDefaultChangeF(perm)} />
          </div>
          <TextBlock style="color: gray;" variant="caption">{_t(`common.permissions.${perm}.desc`)}</TextBlock>
        </div>
      {/each}
    </div>
  {/if}
</div>