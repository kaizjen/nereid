<style>
  .head {
    -webkit-app-region: drag;
    display: flex;
    background: var(--base-background);
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
    background: var(--base-background);/* #21252b; */
    right: 0;
    max-height: 2rem;
    display: flex;
    z-index: 7;
  }
  .traffic-lights > img {
    width: 27px;
    height: 20px;
    padding: 8px;
    padding-left: 12px;
    padding-right: 12px;
    transition: 0.2s;
    -webkit-app-region: no-drag;
  }
  img#close:hover {
    background: #ff5656a6;
  }
  .traffic-lights > img:hover {
    background: #ffffff4a;
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
  }
  .tab {
    padding: 0.5rem;
    transition: 0.06s;
    position: relative;
    white-space: nowrap;
    overflow: hidden;
    width: 9.5rem;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    border: 1px solid transparent;
    border-bottom: 1px solid transparent !important;
  }
  .tab:hover {
    background: #ffffff17;
  }
  .tab.selected {
    background: var(--active-background);
    border-radius: 0.25rem 0.25rem 0px 0px;
    border-color: var(--border-color);
    box-shadow: 0px 1px 0px 0px var(--active-background);
  }
  .tabhead :global(.tab.dragover) {
    opacity: 0.5;
  }
  /* .tab.private.selected {
    background: #684a86;
  } */
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
    background: var(--tool-hover);
    transition: 0s;
  }
  .tab img.audio-control:active {
    background: var(--tool-active);
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
    transition: 0.05s;
    border-radius: 0.25rem;
    display: flex;
  }
  .close-tab:hover {
    background: var(--button-hover);
  }
  .close-tab:active {
    background: var(--button-active);
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
    background: var(--button-hover);
  }
  #addtab:active {
    background: var(--button-active);
    transition: 0s;
  }
</style>

<script>
  const { ipcRenderer } = window.nereid;
  import { getContext } from "svelte/internal";
  import { quintOut } from 'svelte/easing'
  export let tabs;
  export let currentTab;

  const { t } = window;
  const _ = {
    PRIVATE_TAB: t('ui.tabs.private'),
    AUDIBLE: t('ui.tabs.playingAudio'),
    MUTED: t('ui.tabs.muted'),
  }

  const colorTheme = getContext('colorTheme')
  const URLParse = getContext('URLParse')

  const isOnLinux = process.platform == 'linux';

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

  function handleClickF(id) {
    // captial F stands for factory
    return function (e) {
      if (e.button == 1) {
        // middle mb
        ipcRenderer.send('closeTab', id)
      } else if (e.button == 2) {
        // rightclick
        ipcRenderer.send('chrome:menu-of-tab', id)
      }
    }
  }
  function handleSelectF(id) {
    return function (e) {
      if (e.button != 0) return
      // lmb
      ipcRenderer.send('selectTab', id)
    }
  }
  function handleDropF(id, zoneUID) {
    /**
     * @param {DragEvent} e
     */
    return function (e) {
      if (e.dataTransfer.getData('text/newTab')) {
        console.log('dropped, new tab', e.dataTransfer.getData('text/tabUID'));
        ipcRenderer.send('newTab', { position: id })
        return;
      }
      console.log('dropped, uid: %o', e.dataTransfer.getData('text/tabUID'));
      let movedUID = Number(e.dataTransfer.getData('text/tabUID') || NaN);

      if (isNaN(movedUID)) return;
      if (movedUID == zoneUID) return;

      ipcRenderer.send('chrome:crossMoveTab', movedUID, id)
    }
  }

  function dropzone(el) {
    let counter = 0;
    function dragenter() {
      el.classList.add('dragover')
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
      ipcRenderer.send('@window', msg)
    }
  }
  requestAnimationFrame(() => {
    ipcRenderer.send('chrome:headHeight', headElement.getBoundingClientRect().height)
  })
</script>


<div class="head" bind:this={headElement}>
  <img
    alt="" src="n-res://{$colorTheme}/nereid.svg" id="nereid-icn"
  >
  <div class="tabhead">
    <div
      class="tablist"
      on:mousedown={e => (e.button == 1) /* middle mb */ ? e.preventDefault() : null}
      on:wheel={e => e.deltaX == 0 ? smoothlyScroll(e.currentTarget, e.deltaY) : null}
    >
      {#each tabs as tab, id (tab)}
        <div
          class="tab"
          draggable="true"
          on:dragstart={e => e.dataTransfer.setData('text/tabUID', tab.uid)}
          on:dragover|preventDefault={e => {}}
          on:drop|capture={handleDropF(id, tab.uid)}
          use:dropzone
          class:selected={id == currentTab}
          class:private={tab.private}
          on:mousedown={handleSelectF(id)}
          on:auxclick={handleClickF(id)}
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
          {#if tab.private && !(id == currentTab)}
            <img src="n-res://{$colorTheme}/private.svg" alt={_.PRIVATE_TAB} class="favicon decoy">
          {:else}
            <img alt="" src={tab.isLoading ? `n-res://${$colorTheme}/clock.svg` : (tab.favicon ?? `n-res://${$colorTheme}/webpage.svg`)} class="favicon">
            {#if tab.isPlaying || tab.isMuted}
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
            on:click={() => { console.log('clicked close'); ipcRenderer.send('closeTab', id) }}
          >
            <img alt="Close tab" src="n-res://{$colorTheme}/cross.svg" >
          </button>
        </div>
      {/each}
      </div>
      <button
        id="addtab"
        on:click={newTab}
        on:auxclick={() => ipcRenderer.send('chrome:menu-newTab')}
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
    >
      <img alt="" src="n-res://{$colorTheme}/minimize.svg" on:click={winActionF('min')}>
      <img alt="" src="n-res://{$colorTheme}/restore.svg" on:click={winActionF('max')} width="24" height="24">
      <img alt="" src="n-res://{$colorTheme}/cross.svg" id="close" on:click={winActionF('close')}>
  </div>
</div>