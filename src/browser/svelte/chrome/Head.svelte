<style>
  .head {
    -webkit-app-region: drag;
    display: flex;
    background: var(--dark-1);
    height: 2rem;

    padding-left: var(--titlebar-left);

    --group-gray: #56606e;
    --group-gray-text: white;
    --group-blue: #128cf5;
    --group-red: #dd463b;
    --group-yellow: #ede844;
    --group-yellow-text: black;
    --group-green: #229920;
    --group-green-text: white;
    --group-magenta: #c332c3;
    --group-purple: #8715cf;
    --group-purple-text: white;
    --group-cyan: #25c7cf;
    --group-cyan-text: black;
    --group-orange: #c37909;
  }
  #nereid-icn {
    width: 1.35rem;
    height: 1.35rem;
    margin: 0.325rem;
    position: absolute;
    left: 0;
  }
  .traffic-lights {
    white-space: nowrap;
    background: var(--dark-1);
    position: fixed;
    right: 0;
    max-height: 2rem;
    display: flex;
    z-index: 7;
  }
  .traffic-lights > button {
    margin: calc((var(--head-height) - 15px - 10px) / 2); /* 10px are from padding */
    margin-inline: 5px;
    padding: 5px;
    transition: 0.2s;
    -webkit-app-region: no-drag;
    border-radius: 50%;
  }
  .traffic-lights img {
    width: 15px;
    height: 15px;
  }
  button#close {
    margin: calc((var(--head-height) - 20px - 4px) / 2); /* 4px are from padding */
    padding: 2px; /* the close button is bigger than others */
    margin-right: 7px;
  }
  button#close > img {
    width: 20px;
    height: 20px;
  }
  button#close:hover {
    background: #ff5656a6;
  }
  button#close:hover:active {
    background: #f77676d6;
  }
  .traffic-lights > button:hover {
    background: var(--t-white-3);
  }
  .traffic-lights > button:hover:active {
    background: var(--t-white-6);
    transition: 0s;
  }

  .tabhead {
    position: absolute;
    margin-left: 2rem; /* The logo */
    display: flex;
    align-items: center;
    overflow: hidden;
    flex-grow: 1;
    height: calc(2rem + 1px); /* 1px to hide the border */
    margin-right: calc(1.25rem + 20px); /* For some reason, the titlebar is calculated incorrectly (on windows), so we add 20 px to fix that */
    z-index: 10;
    max-width: calc(100% - 2rem - 1.25rem - 20px - var(--titlebar-right)); /* - margin-right - the logo */
    left: 0;
  }
  .tabhead > * {
    -webkit-app-region: no-drag;
  }
  .tablist {
    margin-top: 0;
    display: flex;
    overflow-x: overlay;
    overflow-y: hidden;
    height: 100%;
    padding-right: 1px; /* The right side of the tablist is sometimes clipped */
  }
  .tabhead :global(.tab.dragover) {
    opacity: 0.5;
  }
  .tabgroup {
    display: flex;
    align-items: center;
    border-bottom: 2px solid var(--group-color);
    flex-shrink: 0;
    transition: 0.2s;
  }
  .tabgroup.begin {
    /** Random visual glitch where 1px was missing */
    translate: 1px;
  }
  .tabgroup.end {
    translate: -1px;
  }
  .tabgroup > span {
    background: var(--group-color);
    color: var(--group-text, inherit)
  }
  .tabgroup.begin > span {
    display: flex;
    align-items: center;
    padding: 0.1rem;
    padding-inline: 0.35rem;
    border-radius: 0.3rem 0rem 0rem 0.3rem;
    margin-right: 2px;
    margin-left: 0.1rem;
    height: calc(100% - 0.6rem);
    transition: 0.2s;
  }
  .tabgroup.begin > span.noname {
    border-radius: 50%;
    width: 1rem;
    height: 1rem;
    padding: 0;
    margin-right: 3px;
  }
  .tabgroup.begin.hidden > span {
    border-radius: 0.3rem;
  }
  .tabgroup.end > span {
    border-radius: 0rem 0.2rem 0.2rem 0rem;
    margin-left: 2px;
    margin-right: 0.1rem;
    width: 0.3rem;
    height: calc(100% - 0.5rem);
    transition: 0.2s;
  }
  .tabgroup.end.hidden > span {
    width: 0px;
  }

  .tabgroup.gray {
    --group-color: var(--group-gray);
    --group-text: var(--group-gray-text);
  }
  .tabgroup.blue {
    --group-color: var(--group-blue);
    --group-text: var(--group-blue-text);
  }
  .tabgroup.red {
    --group-color: var(--group-red);
    --group-text: var(--group-red-text);
  }
  .tabgroup.yellow {
    --group-color: var(--group-yellow);
    --group-text: var(--group-yellow-text);
  }
  .tabgroup.green {
    --group-color: var(--group-green);
    --group-text: var(--group-green-text);
  }
  .tabgroup.magenta {
    --group-color: var(--group-magenta);
    --group-text: var(--group-magenta-text);
  }
  .tabgroup.purple {
    --group-color: var(--group-purple);
    --group-text: var(--group-purple-text);
  }
  .tabgroup.cyan {
    --group-color: var(--group-cyan);
    --group-text: var(--group-cyan-text);
  }
  .tabgroup.orange {
    --group-color: var(--group-orange);
    --group-text: var(--group-orange-text);
  }

  #addtab {
    padding: 0.2rem;
    padding-inline: 0.4rem;
    margin-left: 0.125rem;
    border-radius: 0.25rem;
    transition: 0.25s;
    display: flex;
  }
  #addtab img {
    height: 1.25rem;
  }
  #addtab:hover {
    background: var(--t-white-3);
  }
  #addtab:hover:active {
    background: var(--t-white-6);
    transition: 0s;
  }
  
  @media (prefers-color-scheme: light) {
    .head {
      background: var(--light-5);

      --group-blue: #44a6fb;
      --group-red: #ef776e;
      --group-magenta: #ff6fff;
      --group-orange: #ffa621;
    }
    .traffic-lights {
      background: var(--light-5);
    }
    .traffic-lights > button:hover {
      background: var(--t-black-2);
    }
    .traffic-lights > button:hover:active {
      background: var(--t-black-5);
    }

    #addtab:hover {
      background: var(--t-black-2);
    }
    #addtab:hover:active {
      background: var(--t-black-4);
    }
  }
</style>

<script>
  const { ipcRenderer } = window.nereid;
  import { getContext } from "svelte/internal";
  import Tab from "./Tab.svelte";
  import TabGroup from "./popups/TabGroup.svelte";
  export let tabs;
  export let currentTabIndex;

  export let tabGroups;

  export let changeToSetHeadHeight = {};

  const { t } = window;
  const _ = {
    PRIVATE_TAB: t('ui.tabs.private'),
    AUDIBLE: t('ui.tabs.playingAudio'),
    MUTED: t('ui.tabs.muted'),
  }

  const colorTheme = getContext('colorTheme')
  let keypressesLocked = getContext('keypressesLocked')

  const isOnLinux = process.platform == 'linux';
  let trafficLightsElement;
  let trafficLightsWidth = 0;
  let internalHeadHeight = 0;

  let editingTabGroup = null;
  let hiddenGroups = [];

  let groupIDToElementMap = {};

  $: {
    // lock keypresses so that addressbar won't
    // intercept them when the user is editing a group
    $keypressesLocked = !!editingTabGroup
  }
  $: if (editingTabGroup) {
    editingTabGroup.group;
    tabGroups = tabGroups;
  }

  requestAnimationFrame(() => {
    trafficLightsWidth = trafficLightsElement.getBoundingClientRect().width
  })

  let headElement;

  function smoothlyScroll(element, left, frames = 6) {
    let framesLeft = frames;
    function scroll() {
      console.log("scrolling!", { framesLeft, scLeft: Math.ceil(left / frames) });
      element.scrollLeft += Math.ceil(left / frames)
      framesLeft--;
      if (framesLeft == 0) return;
      requestAnimationFrame(scroll)
    }
    scroll()
  }

  function getGroupAtIndex(index) {
    for (const group of tabGroups) {
      if (index < group.endIndex && index >= group.startIndex) {
        return group;
      }
    }
  }
  function toggleHideGroupF(group) {
    return () => {
      if (hiddenGroups.includes(group.id)) {
        hiddenGroups.splice(hiddenGroups.indexOf(group.id), 1);

      } else {
        hiddenGroups.push(group.id)
        if (currentTabIndex >= group.startIndex && currentTabIndex < group.endIndex) {
          // The group has a selected tab
          if (tabs.length > group.endIndex) {
            // Select the tab to the left
            ipcRenderer.send('selectTab', group.endIndex)

          } else {
            // No tab on the left, create one
            ipcRenderer.send('newTab', { position: group.endIndex })
          }
        }
      }
      hiddenGroups = hiddenGroups;
    }
  }
  function editTabGroupF(group) {
    return (e) => {
      if (e.button != 2) return;
      const rect = groupIDToElementMap[group.id].getBoundingClientRect()

      editingTabGroup = { group, position: { x: rect.x, y: rect.y } }
    }
  }

  function newTab() {
    ipcRenderer.send('newTab')
  }

  function winActionF(msg) {
    return function () {
      ipcRenderer.send('window.' + msg)
    }
  }

  function setHeadHeight() {
    if (!headElement) return;

    internalHeadHeight = headElement.getBoundingClientRect().height
    ipcRenderer.send('chrome.headHeight', internalHeadHeight)
  }

  function unhideSelectedTabGroup() {
    const selectedTabGroup = tabGroups.find(g => currentTabIndex >= g.startIndex && currentTabIndex < g.endIndex)
    if (selectedTabGroup && hiddenGroups.includes(selectedTabGroup.id)) {
      hiddenGroups.splice(hiddenGroups.indexOf(selectedTabGroup.id), 1);
      hiddenGroups = hiddenGroups;
    }
  }

  requestAnimationFrame(() => {
    setHeadHeight();
  })

  $: {
    changeToSetHeadHeight;
    setHeadHeight();
  }

  $: {
    currentTabIndex;
    unhideSelectedTabGroup()
  }
  
  ipcRenderer.on('addTabGroup', (_e, { id }) => {
    requestAnimationFrame(() => {
      editTabGroupF(tabGroups.find(g => g.id == id))({ button: 2 });
    })
  })
</script>


<div
  class="head"
  bind:this={headElement}
  style="
    --head-height: {internalHeadHeight}px;
    {isOnLinux ? `--titlebar-left: 0px; --titlebar-right: ${trafficLightsWidth}px;` : ''}
  "
>
  <img
    alt="" src="n-res://{$colorTheme}/nereid.svg" id="nereid-icn"
  >
  <div class="tabhead">
    <div
      class="tablist"
      on:mousedown={e => (e.button == 1) /* middle mb */ ? e.preventDefault() : null}
      on:wheel={e => e.deltaX == 0 ? smoothlyScroll(e.currentTarget, e.deltaY) : null}
      style="--tab-width: {Math.max(15 - Math.sqrt(tabs.length), 9)}rem;"
    >
      {#each tabs as tab, index (tab)}
        {@const group = getGroupAtIndex(index, tabGroups)}
        {#if group}
          {#if group.startIndex == index}
            <button
              on:click={toggleHideGroupF(group)}
              on:auxclick={editTabGroupF(group)}
              class="tabgroup begin {group.color}"
              class:hidden={hiddenGroups.includes(group.id)}
              bind:this={groupIDToElementMap[group.id]}
            >
              <span class:noname={group.name == ''}>
                {group.name}
              </span>
            </button>
          {/if}
        {/if}
        {#if !group || !hiddenGroups.includes(group.id)}
          <Tab {tab} {index} currentTab={tabs[currentTabIndex]} {currentTabIndex} {group} />
        {/if}
        {#if group?.endIndex == index + 1}
          <button
            on:click={toggleHideGroupF(group)}
            class="tabgroup end {group.color}"
            class:hidden={hiddenGroups.includes(group.id)}
          >
            <span style="background: var(--group-{group.color})"></span>
          </button>
        {/if}
      {/each}
    </div>
    <button
      id="addtab"
      on:click={newTab}
      on:auxclick={() => ipcRenderer.send('chrome.menuNewTab')}
      draggable="true"
      on:dragstart={e => e.dataTransfer.setData('text/newTab', true)}
    >
      <img alt="" src="n-res://{$colorTheme}/plus.svg">
    </button>
  </div>
  <div
    class="traffic-lights"
    style:pointer-events={isOnLinux ? '' : 'none'}
    style:display={isOnLinux ? '' : 'none'}
    bind:this={trafficLightsElement}
  >
    <button on:click={winActionF('min')}>
      <img alt="" src="n-res://{$colorTheme}/minimize.svg" >
    </button>
    <button on:click={winActionF('max')}>
      <img alt="" src="n-res://{$colorTheme}/restore.svg">
    </button>
    <button on:click={winActionF('close')} id="close">
      <img alt="" src="n-res://{$colorTheme}/cross.svg">
    </button>
  </div>
  {#if editingTabGroup}
    <TabGroup bind:editingTabGroup />
  {/if}
</div>