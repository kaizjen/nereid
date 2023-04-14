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
    height: 100%;
    box-sizing: border-box;
  }
  .tabgroup.nobottomborder {
    border-bottom-width: 0;
  }
  .tabgroup.begin {
    /** Random visual glitch where 1px was missing */
    translate: 1px;
    margin-left: 0.2rem;
  }
  .tabgroup.end {
    translate: -1px;
  }
  .tabgroup.end.hidden {
    margin-right: calc(0.2rem + 1px);
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
    border-radius: 0.3rem 0 0 0.3rem;
    margin-right: 2px;
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
  .tabgroup.nobottomborder > span {
    border-radius: 0.3rem;
  }
  .tabgroup.begin.hidden > span {
    border-radius: 0.3rem;
    margin-right: 0;
  }
  .tabgroup.end > span {
    border-radius: 0 0.2rem 0.2rem 0;
    margin-left: 2px;
    margin-right: 0.1rem;
    width: 0.3rem;
    height: calc(100% - 0.5rem);
    transition: 0.2s;
  }
  .tabgroup.end.hidden > span {
    width: 0;
    margin: 0;
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

  .tablist-button {
    padding: 0.2rem;
    padding-inline: 0.4rem;
    margin-left: 0.125rem;
    border-radius: 0.25rem;
    transition: 0.25s;
    display: flex;
  }
  .tablist-button img {
    height: 1.25rem;
  }
  .tablist-button:hover {
    background: var(--t-white-3);
  }
  .tablist-button:hover:active {
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

    .tablist-button:hover {
      background: var(--t-black-2);
    }
    .tablist-button:hover:active {
      background: var(--t-black-4);
    }
  }
</style>

<script>
  const { ipcRenderer } = window.nereid;
  import { getContext } from "svelte/internal";
  import Tab from "./Tab.svelte";
  import TabGroup from "./popups/TabGroup.svelte";
  import { fly } from "svelte/transition";
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
  const config = getContext('config')
  let keypressesLocked = getContext('keypressesLocked')

  const isOnLinux = process.platform == 'linux';
  let trafficLightsElement;
  let trafficLightsWidth = 0;
  let internalHeadHeight = 0;

  let editingTabGroup = null;
  let hiddenGroups = [];

  let groupIDToElementMap = {};

  let currentTabGroup;

  // These shenanigans make sure that the head doesn't re-render
  // because the main doesn't send all updates in the same tick,
  // so this ensures they get properly queued up before re-rendering.
  // If we don't do this, then in the group-only mode all the tabs will be
  // re-animated constantly.
  let __STGUpdateScheduled = false;
  function updateCurrentTabGroup() {
    if (__STGUpdateScheduled) return;

    __STGUpdateScheduled = true;
    requestIdleCallback(() => {
      __STGUpdateScheduled = false;
      currentTabGroup = tabGroups.find(g => currentTabIndex >= g.startIndex && currentTabIndex < g.endIndex)
    })
  }
  $: {tabGroups; currentTabIndex; updateCurrentTabGroup()}

  $: onlyShowCurrentTabGroup = $config?.ui.onlyShowCurrentTabGroup;
  $: shouldBeColored = $config?.ui.showTabGroupColor;

  $: {
    // lock keypresses so that addressbar won't
    // intercept them when the user is editing a group
    $keypressesLocked = !!editingTabGroup
  }
  $: if (editingTabGroup) {
    editingTabGroup.group;
    tabGroups = tabGroups;
  }

  /** The animation of the tab group will be played from this position */
  let animateTabGroupFromX = 0;
  let tabGroupListElement;

  let tabsFromSelectedGroup = [];
  function getTabsFromSelectedGroup() {
    if (!currentTabGroup) return tabsFromSelectedGroup = [];
    tabsFromSelectedGroup = tabs.slice(currentTabGroup.startIndex, currentTabGroup.endIndex)
  }
  $: {tabs; currentTabGroup; getTabsFromSelectedGroup()}

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
      if (onlyShowCurrentTabGroup) {
        // select the tab group
        animateTabGroupFromX = groupIDToElementMap[group.id].getBoundingClientRect().x
        ipcRenderer.send('selectTab', group.startIndex);
        return;
      }

      if (hiddenGroups.includes(group.id)) {
        hiddenGroups.splice(hiddenGroups.indexOf(group.id), 1);

      } else {
        hiddenGroups.push(group.id)
        if (currentTabIndex >= group.startIndex && currentTabIndex < group.endIndex) {
          // The group has a selected tab
          if (tabs.length > group.endIndex) {
            // Select the tab to the right
            ipcRenderer.send('selectTab', group.endIndex)

          } else {
            // No tab on the right, create one
            ipcRenderer.send('newTab', { position: group.endIndex })
          }
        }
      }
      hiddenGroups = hiddenGroups;
    }
  }
  function editTabGroup(group, overrideElement) {
    let x, y;
    overrideElement ||= groupIDToElementMap[group.id];

    if (overrideElement) {
      const rect = overrideElement.getBoundingClientRect();
      x = rect.x; y = rect.y

    } else {
      x = y = 0;
    }

    editingTabGroup = { group, position: { x, y } }
  }
  function editTabGroupF(group) {
    return (e) => {
      if (e.button != 2) return;
      editTabGroup(group)
    }
  }
  function unselectTabGroup() {
    if (!currentTabGroup) return console.warn('No selected tab group')

    if (currentTabGroup.startIndex != 0) {
      // Select the tab to the left
      ipcRenderer.send('selectTab', currentTabGroup.startIndex - 1)

    } else if (tabs.length > currentTabGroup.endIndex) {
      // No tab on the left, select one on the right
      ipcRenderer.send('selectTab', currentTabGroup.endIndex)

    } else {
      // No tab on the right, create one
      ipcRenderer.send('newTab', { position: currentTabGroup.endIndex })
    }
  }

  function newTab() {
    ipcRenderer.send('newTab')
  }
  function newGroupTab() {
    ipcRenderer.send('newTab', { position: currentTabGroup.endIndex, groupID: currentTabGroup.id })
  }
  
  function unhideSelectedTabGroup() {
    // wait until the toggleHideGroupF has selected the tab on the right
    requestIdleCallback(() => {
      if (currentTabGroup && hiddenGroups.includes(currentTabGroup.id)) {
        hiddenGroups.splice(hiddenGroups.indexOf(currentTabGroup.id), 1);
        hiddenGroups = hiddenGroups;
      }
    })
  }
  
  function resetDragRegions() {
    // After an animation on the tablist is performed,
    // the drag regions of the window (on Windows) are broken.
    ipcRenderer.send('window.resetDragRegions')
  }

  function handleTabGroupDropF(group) {
    return function (e) {
      if (!onlyShowCurrentTabGroup && !hiddenGroups.includes(group.id)) return;

      const targetRect = e.currentTarget.getBoundingClientRect();
      const droppedX = e.x - targetRect.x;
      const droppedRatio = droppedX / targetRect.width;
      console.log('[group %o] dropped, uid: %o', group, e.dataTransfer.getData('text/tabUID'));

      let movedUID = Number(e.dataTransfer.getData('text/tabUID') || NaN);
      let moveToIndex = group.startIndex;

      if (isNaN(movedUID)) return;

      if (tabs.map(t => t.uid).includes(movedUID)) {
        if (droppedRatio >= 0.5) {
          // If dropped to the right side, move at the end of the group
          moveToIndex = group.endIndex;
        }
        if (currentTabIndex < group.startIndex) {
          // If the current tab is to the left of the group,
          // then all the indexes decrease.
          moveToIndex--;
        }
      } else if (droppedRatio >= 0.5) {
        moveToIndex++;
      }

      ipcRenderer.send('chrome.moveTab', movedUID, moveToIndex)
      ipcRenderer.send('chrome.addTabToGroup', movedUID, group.id)
    }
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
      editTabGroup(tabGroups.find(g => g.id == id));
    })
  })
</script>


<div
  class="head"
  bind:this={headElement}
  style="
    --head-height: {internalHeadHeight}px;
    {isOnLinux ? `--titlebar-left: 0; --titlebar-right: ${trafficLightsWidth}px;` : ''}
  "
>
  <img
    alt="" src="n-res://{$colorTheme}/nereid.svg" id="nereid-icn"
  >
  {#if onlyShowCurrentTabGroup && currentTabGroup}
    <div
      class="tabhead"
      style:z-index={11}
      bind:this={tabGroupListElement}
      in:fly={{ opacity: 0.5, duration: 200, x: animateTabGroupFromX }}
      out:fly={{ opacity: 0, duration: 200, x: animateTabGroupFromX }}
      on:outrostart={() => tabGroupListElement.style.marginLeft = "-2rem"}
      on:outroend={() => tabGroupListElement.style.marginLeft = ''}
      on:introend={() => {resetDragRegions(); tabGroupListElement.style.marginLeft = ''}}
    >
      <button class="tablist-button" on:click={unselectTabGroup}>
        <img alt="" src="n-res://{$colorTheme}/arrow.svg" style:rotate="180deg">
      </button>
      <div
        class="tablist"
        on:mousedown={e => (e.button == 1) /* middle mb */ ? e.preventDefault() : null}
        on:wheel={e => e.deltaX == 0 ? smoothlyScroll(e.currentTarget, e.deltaY) : null}
        style="--tab-width: {Math.max(15 - Math.sqrt(tabsFromSelectedGroup.length), 9)}rem;"
      >
        <button
          on:click={e => editTabGroup(currentTabGroup, e.target)}
          on:auxclick={e => editTabGroup(currentTabGroup, e.target)}
          class="tabgroup begin {currentTabGroup.color}"
          class:nobottomborder={!shouldBeColored}
        >
          <span class:noname={currentTabGroup.name == ''}>
            {currentTabGroup.name}
          </span>
        </button>
        {#each tabsFromSelectedGroup as tab, index (tab)}
          <Tab
            {tab} {tabs}
            index={currentTabGroup.startIndex + index}
            currentTab={tabs[currentTabIndex]}
            {currentTabIndex}
            group={currentTabGroup}
          />
        {/each}
      </div>
      <div class="tabgroup end {currentTabGroup.color}" class:nobottomborder={!shouldBeColored}>
        <button
          class="tablist-button"
          on:click={newGroupTab}
          on:auxclick={() => ipcRenderer.send('chrome.menuGroupNewTab', currentTabGroup.id)}
        >
          <img alt="" src="n-res://{$colorTheme}/plus.svg">
        </button>
      </div>
    </div>
  {/if}

  <div class="tabhead" style:display={onlyShowCurrentTabGroup && currentTabGroup ? 'none' : ''}>
    <div
      class="tablist"
      on:mousedown={e => (e.button == 1) /* middle mb */ ? e.preventDefault() : null}
      on:wheel={e => e.deltaX == 0 ? smoothlyScroll(e.currentTarget, e.deltaY) : null}
      style="--tab-width: {Math.max(15 - Math.sqrt(tabs.length), 9)}rem;"
    >
      {#each tabs as tab, index (tab)}
        {@const group = getGroupAtIndex(index, tabGroups)}
        {#if group?.startIndex == index}
          <button
            class="tabgroup begin {group.color}"
            class:hidden={onlyShowCurrentTabGroup || hiddenGroups.includes(group.id)}
            class:nobottomborder={onlyShowCurrentTabGroup}
            on:click={toggleHideGroupF(group)}
            on:auxclick={editTabGroupF(group)}
            on:dragover={e =>
              e.dataTransfer.types[0] == 'text/tabuid' ? e.preventDefault() : null
            }
            on:drop|capture={handleTabGroupDropF(group)}
            bind:this={groupIDToElementMap[group.id]}
          >
            <span class:noname={group.name == ''}>
              {group.name}
            </span>
          </button>
        {/if}
        {#if !group || !(onlyShowCurrentTabGroup || hiddenGroups.includes(group.id))}
          <Tab {tab} {tabs} {index} currentTab={tabs[currentTabIndex]} {currentTabIndex} {group} />
        {/if}
        {#if group?.endIndex == index + 1}
          <button
            on:click={toggleHideGroupF(group)}
            class="tabgroup end {group.color}"
            class:hidden={onlyShowCurrentTabGroup || hiddenGroups.includes(group.id)}
          >
            <span style="background: var(--group-{group.color})"></span>
          </button>
        {/if}
      {/each}
    </div>
    <button
      class="tablist-button"
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
    <TabGroup bind:editingTabGroup isTheOnlyTabGroup={tabs.length == tabsFromSelectedGroup.length} />
  {/if}
</div>