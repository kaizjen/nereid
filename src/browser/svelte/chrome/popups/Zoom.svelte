<style>
  .dialog {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: absolute;
    right: 0;
  }
  .title {
    display: flex;
    margin-bottom: 0.625rem;
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
  import { fly } from 'svelte/transition';
  import { appear } from "//lib/transition.js";
  import Button from "//lib/Button.svelte";

  const setTop = getContext('setTop')
  const colorTheme = getContext('colorTheme')

  setTop(true)

  let config = getContext('config')
  
</script>

<div class="dialog" in:appear={window.flyoutProperties} out:fly={window.flyoutProperties} on:outroend={() => setTop(false)}>
  <div class="dialog-content">
    <div class="title">
      <img
        style="margin-right: 8px;"
        src="n-res://{$colorTheme}/zoom{level - $config?.ui.defaultZoomFactor > 0 ? 'in' : 'out'}.svg"
        alt={_.ALT({ zoom: Math.round(level * 100) })}
      >
      <b> {_.INFO({ zoom: Math.round(level * 100) })} </b>
    </div>
    <Button on:click={() => {
      ipcRenderer.send('@tab', 'setZoom', $config?.ui.defaultZoomFactor);
      open = false;
    }}>
      {_.RESET}
    </Button>
  </div>
</div>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="blocker" on:click={() => open = false}></div>