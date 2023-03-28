<style>
  .tab {
    --border-width: 1px; /* when the tab isn't selected, the border is replaced by padding */
    padding: calc(0.5rem + var(--border-width));
    padding-bottom: 0.5rem;
    transition: background 0.25s;
    position: relative;
    white-space: nowrap;
    overflow: hidden;
    width: var(--tab-width);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    border-bottom: var(--border-width) solid transparent !important;
    border-radius: 0.25rem 0.25rem 0 0;
    margin-top: 1px;
    transform: translateY(-1px);
    box-sizing: border-box;
  }
  :global(*:active) > .tab {
    transition: 0s;
  }
  .tab:hover {
    background: var(--t-white-2);
  }
  .tab.selected {
    padding: 0.5rem;
    background: var(--active-background);
    border: var(--border-width) solid var(--t-white-5);
    box-shadow: 0 1px 0 0 var(--active-background); /* removes the part of the border of <Tools> */
    transition: 0s;
    border-bottom: var(--border-width) solid transparent !important;
  }
  .tab img {
    height: 0.85rem;
  }
  .tab img.favicon {
    padding: 0.15rem;
  }
  .tab img.favicon.decoy {
    flex-grow: 1;
  }
  .tab img.audio-control {
    transform: translate(9px, 5px);
    position: absolute;
    padding: 0.15rem;
    border-radius: 50%;
    transition: 0.2s;
  }
  .tab img.audio-control:hover {
    background: var(--t-white-3);
  }
  .tab img.audio-control:hover:active {
    background: var(--t-white-5);
    transition: 0s;
  }
  .tab span {
    padding-left: 0.5rem;
    flex-grow: 1;
  }
  .close-tab {
    padding: 0.135rem;
    border-radius: 0.25rem;
    display: flex;
  }
  .close-tab:hover {
    background: var(--t-white-5);
  }
  .close-tab:hover:active {
    background: var(--t-white-6);
  }
  .tab > span {
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: calc(100% - 1.12rem);
  }

  .tab.group {
    --border-width: 2px;
    border-bottom-color: var(--group-color, transparent) !important;
    border-radius: 0.25rem 0.25rem 0 0;
    margin-top: 0;
    transform: none;
  }
  .tab.group.selected {
    border-color: var(--group-color, var(--t-white-5));
    border-bottom-color: transparent !important;
  }

  .tab.group.gray {
    --group-color: var(--group-gray);
  }
  .tab.group.blue {
    --group-color: var(--group-blue);
  }
  .tab.group.red {
    --group-color: var(--group-red);
  }
  .tab.group.yellow {
    --group-color: var(--group-yellow);
  }
  .tab.group.green {
    --group-color: var(--group-green);
  }
  .tab.group.magenta {
    --group-color: var(--group-magenta);
  }
  .tab.group.purple {
    --group-color: var(--group-purple);
  }
  .tab.group.cyan {
    --group-color: var(--group-cyan);
  }
  .tab.group.orange {
    --group-color: var(--group-orange);
  }
  
  @media (prefers-color-scheme: light) {
    .tab:hover {
      background: var(--t-white-2);
    }
    .tab.selected {
      background: var(--active-background);
      border-color: var(--t-black-6);
      box-shadow: 0 1px 0 0 var(--active-background); /* removes the part of the border of <Tools> */
    }
    .tab img.audio-control:hover {
      background: var(--t-black-3);
    }
    .tab img.audio-control:active {
      background: var(--t-black-5);
    }
    .close-tab:hover {
      background: var(--t-black-2);
    }
    .close-tab:hover:active {
      background: var(--t-black-4);
    }
  }
</style>
<script>
  export let tab;
  export let index;
  export let currentTab;
  export let currentTabIndex;
  export let group;

  const { ipcRenderer } = window.nereid;
  import { getContext } from "svelte/internal";
  import { quintOut } from 'svelte/easing'
  import Spinner from "//lib/Spinner.svelte";

  const ACCENT_8 = '72b9f7';
  const ACCENT_5 = '247ecd';

  const { t } = window;
  const _ = {
    PRIVATE_TAB: t('ui.tabs.private'),
    AUDIBLE: t('ui.tabs.playingAudio'),
    MUTED: t('ui.tabs.muted'),
  }

  const colorTheme = getContext('colorTheme')
  const URLParse = getContext('URLParse')

  function tab_anim(node, { delay = 0, duration = 400, easing = quintOut, opacity = 0 }) {
    const style = getComputedStyle(node);
    const target_opacity = +style.opacity;
    const od = target_opacity * (1 - opacity);
    const w = parseInt(style.width)
    return {
      delay,
      duration,
      easing,
      css: (t, u) => `
        width: ${Math.round(w * t)}px;
        opacity: ${target_opacity - (od * u)}
      `
    };
  }

  function handleClick(e) {
    if (e.button == 1) {
      // middle mb
      ipcRenderer.send('closeTab', index)
    } else if (e.button == 2) {
      // rightclick
      ipcRenderer.send('chrome.menuOfTab', index)
    }
  }
  function handleSelect(e) {
    if (e.button != 0) return
    // lmb
    ipcRenderer.send('selectTab', index)
  }
  /**
   * @param {DragEvent} e
   */
  function handleDrop(e) {
    if (e.dataTransfer.getData('text/newTab')) {
      console.log('dropped, new tab', e.dataTransfer.getData('text/tabUID'));
      ipcRenderer.send('newTab', { position: index })
      return;
    }
    const targetRect = e.currentTarget.getBoundingClientRect();
    const droppedX = e.x - targetRect.x;
    const droppedRatio = droppedX / targetRect.width;
    console.log('dropped, uid: %o', e.dataTransfer.getData('text/tabUID'));

    let movedUID = Number(e.dataTransfer.getData('text/tabUID') || NaN);
    let moveToIndex = index;

    if (isNaN(movedUID)) return;
    if (movedUID == tab.uid) return;

    if (droppedRatio >= 0.5) {
      if (currentTabIndex >= moveToIndex) {
        // If the tab is dropped on the right side
        // AND the selected tab is to the right of the dropzone tab,
        // drop the tab to the right of the dropzone
        moveToIndex++;
      }
      // Otherwise, once the selected tab disappears, all
      // tab indexes are decreased, that's why we don't increase the index here.
    } else if (currentTabIndex < moveToIndex) {
      // The tab is dropped on the left side, and the
      // currentTab is to the left of the dropzone
      moveToIndex--;
    }

    ipcRenderer.send('chrome.moveTab', movedUID, moveToIndex)
    if (group) {
      ipcRenderer.send('chrome.addTabToGroup', movedUID, group.id)
    }
  }

  function dropzone(el) {
    let counter = 0;
    function dragenter(e) {
      console.log('dd', e.dataTransfer.types);
      // all data types are lowercase for some reason
      if (e.dataTransfer.types[0] == 'text/tabuid') {
        el.classList.add('dragover')
      }
      counter++;
    }
    function dragleave() {
      counter--;
      if (counter == 0) {
        el.classList.remove('dragover')
      }
    }

    el.addEventListener('dragenter', dragenter, true)
    el.addEventListener('dragleave', dragleave, true)
    el.addEventListener('drop', dragleave, true)

    return {
      destroy() {
        el.removeEventListener('dragenter', dragenter)
        el.removeEventListener('dragleave', dragleave)
        el.removeEventListener('drop', dragleave)
      }
    }
  }

  function toggleMute() {
    ipcRenderer.send('setMutedTab', index, !tab.isMuted)
  }
</script>

<div
  class="tab {group ? `group ${group.color}` : ''}"
  draggable="true"
  on:dragstart={e => e.dataTransfer.setData('text/tabUID', tab.uid)}
  on:dragover={
    e => e.dataTransfer.types[0] == 'text/tabuid' || e.dataTransfer.types[0] == 'text/newtab' ? e.preventDefault() : null
  }
  on:drop|capture={handleDrop}
  use:dropzone
  class:selected={tab == currentTab}
  class:private={tab.private}
  on:mousedown={handleSelect}
  on:auxclick={handleClick}
  in:tab_anim={{ x: -50, y: 0, duration: 120 }}
  out:tab_anim={{ x: -50, y: 0, duration: 120 }}
  title={
    tab.private ? '' : (
      tab.title +
      `\n• ${URLParse(tab.url).hostname}` +
      (tab.isMuted ? '\n• ' + _.MUTED : (tab.isPlaying ? '\n• ' + _.AUDIBLE : ''))
    )
  }
  role="tab"
>
  {#if tab.private && tab != currentTab && !currentTab.private}
    <img src="n-res://{$colorTheme}/private.svg" alt={_.PRIVATE_TAB} class="favicon decoy">
  {:else}
    {#if tab.isLoading}
      <Spinner
        width="0.95rem" height="0.95rem"
        thickness={10} style="flex-shrink: 0; padding: 0.1rem;"
        color="var(--text)"
      />
    {:else}
      <img alt="" src={tab.favicon ?? `n-res://${$colorTheme}/webpage.svg`} class="favicon">
    {/if}
    {#if tab.isPlaying || tab.isMuted}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <img
        role="button"
        tabindex="0"
        alt={tab.isMuted ? _.MUTED : _.AUDIBLE}
        src="
          n-res://{
            tab.isPlaying ?
            ($colorTheme == 'dark' ? ACCENT_8 : ACCENT_5) :
            $colorTheme
          }/{tab.isMuted ? 'mute' : 'sound'}.svg"
        on:click={toggleMute}
        on:mousedown|stopPropagation={()=>{}}
        class="audio-control"
      >
    {/if}
    <span>{tab.title}</span>
  {/if}
  <button
    class="close-tab"
    on:mousedown|stopPropagation={()=>null}
    on:click={() => { console.log('clicked close'); ipcRenderer.send('closeTab', index) }}
  >
    <img alt="Close tab" src="n-res://{$colorTheme}/cross.svg" >
  </button>
</div>