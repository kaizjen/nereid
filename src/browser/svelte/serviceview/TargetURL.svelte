<style>
  .container {
    position: absolute;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
  }
  .url {
    display: inline-block;
    padding: 0.2rem;
    padding-inline: 0.4rem;
    border-radius: 0.2rem;
    background: var(--dark-2);
    opacity: 0.85;
    transition: var(--easing) 0.1s; /* Keep in sync with the timeouts */
    white-space: nowrap;
  }

  @media (prefers-color-scheme: light) {
    .url {
      background: var(--light-2);
    }
  }
</style>
<script>
  import { getContext } from "svelte";
    import { fade } from "svelte/transition";

  const { ipcRenderer } = window.nereid;

  export let data;
  export let delayReset;

  let div;
  const windowBounds = getContext('windowBounds');

  let isFirstTime = true;

  // These properties are saved for the duration of the animation
  let prevWidth = null;
  let prevHeight = null;

  function updateBounds() {
    requestAnimationFrame(() => {
      if (!div) return;
      if (!$windowBounds) return;

      let { width, height } = div.getBoundingClientRect();

      width = prevWidth ?? width;
      height = prevHeight ?? height;

      ipcRenderer.send('updateServiceViewBounds', {
        x: 8,
        y: ($windowBounds.y + $windowBounds.height) - 8 - Math.round(height),
        width: Math.round(width),
        height: Math.round(height)
      })

      if (!isFirstTime) return;

      prevWidth = Math.round(width);
      prevHeight = Math.round(height);

      div.style.transition = '0s';
      div.style.opacity = '0';
      div.style.scale = '0.975';
      isFirstTime = false;
      requestAnimationFrame(() => {
        div.style.transition = '';
        requestAnimationFrame(() => {
          div.style.opacity = '';
          div.style.scale = '';

          setTimeout(() => {
            prevHeight = null;
            prevWidth = null;
          }, 100); // Keep in sync with the transition property
        })
      })
    })
  }

  $: {data; $windowBounds; updateBounds()}

  delayReset(() =>
    new Promise(resolve => {
      setTimeout(() => {
        isFirstTime = true;

        resolve();
      }, 100); // Keep in sync with the out:fade
    })
  )
</script>
<div class="container">
  <div class="url" bind:this={div} out:fade={{ duration: 100 }}>
    {data.url ?? "<...>"}
  </div>
</div>