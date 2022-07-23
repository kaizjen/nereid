<style>
  .blocker {
    position: fixed;
    width: 100%;
    height: 100%;
    z-index: 9;
    top: 0;
    left: 0;
  }
  .dialog {
    z-index: 10;
    background: var(--dialog-background);
    border: 1px solid var(--trivial-color);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: absolute;
    border-radius: 8px;
    max-width: 380px;
    padding: 12px;
    top: calc(100% + 10px);
    right: 0;
    cursor: default;
  }
  .title {
    display: flex;
    margin-bottom: 10px;
  }
</style>

<script>
  export let open = true;
  export let level = 0;

  const { t } = window;
  const _ = {
    ALT: data => t('ui.zoom.altMessage', data),
    INFO: data => t('ui.zoom.infoMessage', data),
    RESET: t('ui.zoom.reset'),
  }

  import { getContext } from "svelte/internal";
  const { ipcRenderer } = window.nereid;
  import { fly } from 'svelte/transition'
  import Button from "//lib/Button.svelte";

  const setTop = getContext('setTop')
  const colorTheme = getContext('colorTheme')

  setTop(true)

  let config = getContext('config')
  
</script>

<div class="dialog" in:fly={window.flyoutProperties}>
  <div class="title">
    <img
      style="margin-right: 8px;"
      src="n-res://{$colorTheme}/state_zoom{level - $config?.ui.defaultZoomFactor > 0 ? 'in' : 'out'}.svg"
      alt={_.ALT({ zoom: Math.round(level * 100) })}
    >
    <b> {_.INFO({ zoom: Math.round(level * 100) })} </b>
  </div>
  <Button on:click={() => {
    ipcRenderer.send('@tab', 'setZoom', $config?.ui.defaultZoomFactor);
    setTop(false);
    open = false;
  }}>
    {_.RESET}
  </Button>
</div>

<div class="blocker" on:click={() => {setTop(false); open = false}}></div>