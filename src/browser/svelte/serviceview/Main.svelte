<script>
  import { writable } from "svelte/store";
  import TargetUrl from "./TargetURL.svelte";
  import { setContext } from "svelte";

  const { ipcRenderer } = window.nereid;

  const windowBounds = writable(null);
  setContext('windowBounds', windowBounds);

  let module = '';
  let data = {};

  const resetCallbacks = [];
  function delayReset(callback) {
    resetCallbacks.push(callback);
  }

  ipcRenderer.on('reset', async(_e, isHard) => {
    module = '';
    data = {};
    $windowBounds = null;
    console.log(`${isHard ? 'hard' : 'soft'} reset!`);

    if (isHard) return resetCallbacks.length = 0;

    await Promise.all(resetCallbacks.map(fn => fn()));
    console.log(`reset complete!`);
    resetCallbacks.length = 0;
    ipcRenderer.send('resetRecieved')
  })
  ipcRenderer.on('activate', (_e, newModule, newData) => {
    module = newModule;
    data = newData;
    ipcRenderer.send('dataRecieved')
    console.log('activated', newModule);
  })
  ipcRenderer.on('windowBounds', (_e, bounds) => {
    $windowBounds = bounds;
    console.log('window bounds!', bounds);
  })
</script>

{#if module == 'targetURL'}
  <TargetUrl {data} {delayReset} />
{/if}