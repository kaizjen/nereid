<style>
  .divider {
    width: 12px;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    cursor: w-resize;
    background: var(--dark-1);
    display: flex;
    flex-direction: column;
    justify-content: center;
    z-index: -1;
  }
  .dot {
    background: var(--t-white-4);
    border-radius: 50%;
    margin-bottom: 4px;
    margin-inline: 3px;
    width: 6px;
    height: 6px;
  }

  @media (prefers-color-scheme: light) {
    .divider {
      background: var(--light-5);
    }
    .dot {
      background: var(--t-black-2);
    }
  }
</style>
<script>
  const { ipcRenderer } = window.nereid;

  let percent = 0;
  let isOnTop = false;
  ipcRenderer.on('paneDividerPosition', (_e, pos) => {
    percent = pos * 100;
  })
  ipcRenderer.on('paneDividerOnTop', (_e, val) => {
    isOnTop = val;
  })
  ipcRenderer.on('chromeBlur', () => {
    handleDragStop()
  })

  function onMove({ x }) {
    ipcRenderer.send('chrome.movePanes', x)
  }

  function handleDragStart() {
    window.addEventListener('mousemove', onMove)
    document.body.classList.add('background')
  }
  function handleDragStop() {
    window.removeEventListener('mousemove', onMove)
    document.body.classList.remove('background')
  }

  function auxClick({ button }) {
    if (button != 2) return;

    ipcRenderer.send('chrome.menuOfPaneDivider')
  }
</script>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div
  class="divider"
  style:left={percent + '%'}
  style:z-index={isOnTop ? 10 : -1}
  on:mousedown={handleDragStart}
  on:mouseup={handleDragStop}
  on:auxclick={auxClick}
>
  <div class="dot"></div>
  <div class="dot"></div>
  <div class="dot"></div>
</div>