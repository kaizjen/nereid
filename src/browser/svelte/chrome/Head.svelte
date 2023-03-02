<style>
  .head {
    -webkit-app-region: drag;
    display: flex;
    background: var(--dark-1);
    height: 2rem;

    padding-left: var(--titlebar-left);
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
  .tab {
    padding: 0.5rem;
    transition: 0.15s;
    position: relative;
    white-space: nowrap;
    overflow: hidden;
    width: var(--tab-width);
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    border: 1px solid transparent;
    border-bottom: 1px solid transparent !important;
    border-radius: 0.25rem 0.25rem 0px 0px;
    margin-top: 1px;
    transform: translateY(-1px);
    box-sizing: border-box;
  }
  *:active > .tab {
    transition: 0s;
  }
  .tab:hover {
    background: var(--t-white-2);
  }
  .tab.selected {
    background: var(--active-background);
    border-color: var(--t-white-5);
    box-shadow: 0px 1px 0px 0px var(--active-background); /* removes the part of the border of <Tools> */
    transition: 0s;
  }
  .tabhead :global(.tab.dragover) {
    opacity: 0.5;
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
    transition: 0s;
  }
  .tab img.audio-control:active {
    background: var(--t-white-5);
  }
  .tab img.audio-control.playing {
    filter: invert(0.3) sepia(1) saturate(5) hue-rotate(177deg); /* creates a cyan color */
  }
  .tab span {
    padding-left: 0.5rem;
    flex-grow: 1;
  }
  .close-tab {
    padding: 0.135rem;
    transition: 0.15s;
    border-radius: 0.25rem;
    display: flex;
  }
  .close-tab:hover {
    background: var(--t-white-5);
  }
  .close-tab:hover:active {
    background: var(--t-white-6);
    transition: 0s;
  }
  .tab > span {
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: calc(100% - 1.12rem);
  }

  #addtab {
    padding: 0.2rem;
    margin-left: 0.125rem;
    border-radius: 0.25rem;
    transition: 0.1s;
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

    .tab:hover {
      background: var(--t-white-2);
    }
    .tab.selected {
      background: var(--active-background);
      border-color: var(--t-black-6);
      box-shadow: 0px 1px 0px 0px var(--active-background); /* removes the part of the border of <Tools> */
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
  import { quintOut } from 'svelte/easing'
  import Spinner from "//lib/Spinner.svelte";
  export let tabs;
  export let currentTab;

  export let changeToSetHeadHeight = {};

  const { t } = window;
  const _ = {
    PRIVATE_TAB: t('ui.tabs.private'),
    AUDIBLE: t('ui.tabs.playingAudio'),
    MUTED: t('ui.tabs.muted'),
  }

  const colorTheme = getContext('colorTheme')
  const URLParse = getContext('URLParse')

  const isOnLinux = process.platform == 'linux';
  let trafficLightsElement;
  let trafficLightsWidth = 0;
  let internalHeadHeight = 0;

  requestAnimationFrame(() => {
    trafficLightsWidth = trafficLightsElement.getBoundingClientRect().width
  })

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

  let headElement;

  function handleClickF(index) {
    // captial F stands for factory
    return function (e) {
      if (e.button == 1) {
        // middle mb
        ipcRenderer.send('closeTab', index)
      } else if (e.button == 2) {
        // rightclick
        ipcRenderer.send('chrome.menuOfTab', index)
      }
    }
  }
  function handleSelectF(index) {
    return function (e) {
      if (e.button != 0) return
      // lmb
      ipcRenderer.send('selectTab', index)
    }
  }
  function handleDropF(index, zoneUID) {
    /**
     * @param {DragEvent} e
     */
    return function (e) {
      if (e.dataTransfer.getData('text/newTab')) {
        console.log('dropped, new tab', e.dataTransfer.getData('text/tabUID'));
        ipcRenderer.send('newTab', { position: index })
        return;
      }
      console.log('dropped, uid: %o', e.dataTransfer.getData('text/tabUID'));
      let movedUID = Number(e.dataTransfer.getData('text/tabUID') || NaN);

      if (isNaN(movedUID)) return;
      if (movedUID == zoneUID) return;

      ipcRenderer.send('chrome.moveTab', movedUID, index)
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

  function toggleMuteF(tab) {
    return function () {
      ipcRenderer.send('setMutedTab', tabs.indexOf(tab), !tab.isMuted)
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

  requestAnimationFrame(() => {
    setHeadHeight();
  })

  $: {
    changeToSetHeadHeight;
    setHeadHeight();
  }
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
      {#each tabs as tab, i (tab)}
        <div
          class="tab"
          draggable="true"
          on:dragstart={e => e.dataTransfer.setData('text/tabUID', tab.uid)}
          on:dragover={
            e => e.dataTransfer.types[0] == 'text/tabuid' || e.dataTransfer.types[0] == 'text/newtab' ? e.preventDefault() : null
          }
          on:drop|capture={handleDropF(i, tab.uid)}
          use:dropzone
          class:selected={i == currentTab}
          class:private={tab.private}
          on:mousedown={handleSelectF(i)}
          on:auxclick={handleClickF(i)}
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
          {#if tab.private && !(i == currentTab)}
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
                alt={tab.isMuted ? _.MUTED : _.AUDIBLE }
                src="n-res://{$colorTheme}/{tab.isMuted ? 'mute' : 'sound'}.svg"
                on:click={toggleMuteF(tab)}
                on:mousedown|stopPropagation={()=>{}}
                class="audio-control"
                class:playing={tab.isPlaying}
              >
            {/if}
            <span>{tab.title}</span>
          {/if}
          <button
            class="close-tab"
            on:mousedown|stopPropagation={()=>null}
            on:click={() => { console.log('clicked close'); ipcRenderer.send('closeTab', i) }}
          >
            <img alt="Close tab" src="n-res://{$colorTheme}/cross.svg" >
          </button>
        </div>
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
</div>