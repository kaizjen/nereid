<style>
  :root {
    --menu-width-value: 7cm;
  }
  aside {
    padding-top: 20px;
    border-right: 1px solid var(--default-gray);
    width: var(--menu-width-value);
    flex-grow: 4;
    position: absolute;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  main {
    overflow-y: auto;
    overflow-x: auto;
    position: absolute;
    left: var(--menu-width-value);
    height: 100%;
    width: calc(100% - var(--menu-width-value));
    display: flex;
    justify-content: center;
    align-items: baseline;
  }
  .content {
    width: 18cm;
    padding-top: 30px;
    padding-inline: 30px;
  }
  section {
    display: block;
    border: 1px solid var(--default-gray);
    border-radius: 8px;
    padding: 6px;
    margin-bottom: 40px;
  }
  .absolute-center {
    position: fixed;
    display: flex;
    width: 100%;
    height: 100%;
    justify-content: center;
    align-items: center;
    top: 0;
    left: 0;
    z-index: 999;
  }
</style>

<script>
  import { ListItem, TextBlock, ProgressRing } from "fluent-svelte";
  import { onMount, setContext } from "svelte/internal";
  import { writable } from "svelte/store";
  import Header from "./common/Header.svelte";
  import * as Icons from "./icons";

  import Appearance from "./Settings/Appearance.svelte"
  import Privacy from "./Settings/Privacy.svelte"
  import SearchEngines from "./Settings/SearchEngines.svelte"
  import OnStart from "./Settings/OnStart.svelte"
  import Downloads from "./Settings/Downloads.svelte"
  import Languages from "./Settings/Languages.svelte"

  const configProm = window.nereid.userdata.config.get()
  let config = writable(null)
  setContext('config', config);

  const { t } = window.nereid.i18n;

  configProm.then(c => {
    $config = c;
  })

  let scrollTag = {};
  let main;

  const settingsSections = [
    { name: t('pages.settings.appearance.title'), element: null, component: Appearance },
    { name: t('pages.settings.privacy.title'), element: null, component: Privacy },
    { name: t('pages.settings.search.title'), element: null, component: SearchEngines },
    { name: t('pages.settings.on-start.title'), element: null, component: OnStart },
    { name: t('pages.settings.downloads.title'), element: null, component: Downloads },
    { name: t('pages.settings.languages.title'), element: null, component: Languages },
  ]
  console.log(settingsSections);

  onMount(() => {
    main.addEventListener('scroll', () => {
      requestAnimationFrame(() => {
        scrollTag = {} // update scrolltag
      })
    }, { passive: true })
  })

  function checkIfInCenter(element, pos) {
    if (!element) return false;

    if (main.scrollTop <= 0) {
      // the highest element if scrolled to the top
      if (pos == 'first') return true;
      else return false
    }

    if (main.scrollHeight - main.scrollTop == main.clientHeight) {
      // the lowest element if scrolled to the bottom
      if (pos == 'last') return true;
      else return false
    }


    const { bottom, top } = element.getBoundingClientRect();
    const windowCenter = window.innerHeight / 2;

    return (top - 50) < windowCenter && (bottom + 50) > windowCenter; // 50 px added to minimize the possibility that no item is selected
  }

  function scrollToElementF(element) {
    return function () {
      if (!element) return false;

      const elemCenter = element.clientHeight / 2;
      const halfWindowSize = window.innerHeight / 2;

      const absoluteElementCenter = element.offsetTop + elemCenter;

      // Need to get the position in which halfWindowSize (windowCenter) and absoluteElementCenter are the same.
      // This is the same as ( absElemCenter - (windowSize - windowCenter) )
      main.scrollTo(0, absoluteElementCenter - halfWindowSize)
    }
  }

  async function update() {
    window.nereid.userdata.config.set($config)
  }

  window.nereid.userdata.config.subscribe(c => {
    console.log('sub', c);
    $config = c;
  })
</script>

<svelte:head>
  <title>{t('common.settings')}</title>
</svelte:head>

<aside>
  <div style="margin-bottom: 12px; width: 100%">
    <Header name="settings">
      <Icons.Settings />
    </Header>
  </div>

  {#each settingsSections as section, i}
    <ListItem
      selected={checkIfInCenter(section.element, i == settingsSections.length-1 ? 'last' : (i == 0 ? 'first' : null), scrollTag)}
      on:click={scrollToElementF(section.element)}
    >{section.name}</ListItem>
  {/each}
</aside>
<main bind:this={main}>
  <div class="content">
    {#await configProm}
      <div class="absolute-center">
        <ProgressRing />
      </div>
    {:then _}
      {#each settingsSections as section}
        <TextBlock variant="titleLarge" style="margin-bottom: 15px;">{section.name}</TextBlock>

        <section bind:this={section.element}>
          <svelte:component this={section.component} {update} />
        </section>
      {/each}
    {/await}
  </div>
</main>