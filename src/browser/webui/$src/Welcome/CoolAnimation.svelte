<style>
  .bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: black;
    z-index: -1;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .fg {
    color: white;
    display: flex;
    position: absolute;
    align-items: center;
    justify-content: center;
    z-index: 1;
    width: 100%;
    height: 100%;
    flex-direction: column;
  }
  .backshadow {
    box-shadow: #000000ab 0 0 19px 20px;
    background: #000000ab;
    width: 100%;
    text-align: center;
  }
  .button-wr {
    position: absolute;
    bottom: 8vh;
  }
</style>
<script>
  import { Button, TextBlock } from "fluent-svelte"
  import { draw, scale, fade } from "svelte/transition"
  import { expoOut } from "svelte/easing"

  export let next;

  const { t } = window.nereid.i18n;

  let animationDone = false;
  let toggled = false;
  let currentFill = 'none';

  const finalScaleOptions = { duration: 200, start: 0.8 };
  const svgAnimDuration = 700;
  
  setTimeout(() => {
    toggled = true
    setTimeout(() => {
      currentFill = 'white'
    }, 400);
  }, 100);
</script>

{#if toggled}
  <div class="fg" out:scale={finalScaleOptions}>
    <div class="backshadow" in:scale={{ delay: svgAnimDuration + 100, duration: svgAnimDuration + 100, start: 0.7, easing: expoOut }} on:introend={() => animationDone = true}>
      <TextBlock variant="display">
        {t('pages.welcome.welcome')}
      </TextBlock>
    </div>
    {#if animationDone}
      <div in:fade class="button-wr">
        <Button variant="hyperlink" on:click={next}>
          {t('pages.welcome.begin')}
        </Button>
      </div>
    {/if}
  </div>
  <div class="bg" style:--current-fill={currentFill} out:fade={{ duration: finalScaleOptions.duration }}>
    <svg
      in:scale={{ delay: 200, duration: svgAnimDuration - 200, start: 1.3, opacity: 1, easing: expoOut }}
      out:scale={finalScaleOptions}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500" width="500" height="500"
    >
      <ellipse in:fade={{ duration: svgAnimDuration / 2 }} style="fill: none; stroke: rgb(36, 126, 205); paint-order: fill; stroke-width: 120px;" cx="250" cy="250" rx="160" ry="160"/>
      <path in:draw={{ duration: svgAnimDuration }} style="fill: none; stroke-width: 50px; stroke-linecap: round; stroke-linejoin: round; stroke: rgb(36, 126, 205);" d="M 47.329 431.972 C 172.208 418.136 427.235 190.097 440.355 55.808"/>
      <ellipse in:fade={{ duration: svgAnimDuration / 2 }} style="fill-rule: nonzero; fill: rgb(255, 255, 255); stroke: none;" cx="250" cy="250" rx="100" ry="100"/>
    </svg>
  </div>
{:else}
  <div class="bg"></div>
{/if}