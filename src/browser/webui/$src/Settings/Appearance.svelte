<script>
  import { TextBlock, ComboBox, Checkbox, InfoBar, Slider } from "fluent-svelte";
  import { getContext } from "svelte/internal";
  import noFirstTime from "nereid://js/nft.js"

  export let update;

  const { t } = window.nereid.i18n;

  function throttle(func, ms = 200) {
    let timeout;
    return function wrapper() {
      if (timeout) {
        clearTimeout(timeout)
      }

      timeout = setTimeout(func, ms);
    }
  }
  
  let config = getContext('config')
  const theme = {
    select({ detail }) {
      console.log('selected', detail);
      $config.ui.theme = detail.value;
      update()
    },
    value: $config.ui.theme
  }

  let bookmarkBar = $config.ui.showBookmarks;
  const updateBookmarkBar = noFirstTime(() => {
    console.log('bm-b', bookmarkBar);
    $config.ui.showBookmarks = bookmarkBar;
    update()
  })
  $: {bookmarkBar; updateBookmarkBar()}

  let defaultPageZoom = $config.ui.defaultZoomFactor * 100;
  let defaultPageZoom_proxy = defaultPageZoom; // proxy to not trigger write operation EVERY time the slider is changed
  const updatePageZoom = noFirstTime(() => {
    console.log('z-page', defaultPageZoom);
    $config.ui.defaultZoomFactor = Number((defaultPageZoom / 100).toPrecision(2));
    update()
  })
  $: {defaultPageZoom; updatePageZoom()}
  const pageZoonereidrottled = throttle(() => {
    defaultPageZoom = defaultPageZoom_proxy
  })
  $: {defaultPageZoom_proxy; pageZoonereidrottled()}

  let chromeZoom = $config.ui.chromeZoomFactor * 100;
  let chromeZoom_proxy = chromeZoom;
  const updateChromeZoom = noFirstTime(() => {
    console.log('z-chr', chromeZoom);
    $config.ui.chromeZoomFactor = Number((chromeZoom / 100).toPrecision(2));
    update()
  })
  $: {chromeZoom; updateChromeZoom()}
  const chromeZoonereidrottled = throttle(() => {
    chromeZoom = chromeZoom_proxy
  });
  $: {chromeZoom_proxy; chromeZoonereidrottled()}
</script>

<div class="s-option">
  <TextBlock> {t('pages.settings.appearance.label-theme')} </TextBlock>
  <ComboBox
    items={[
      { name: t('pages.settings.appearance.theme-dark'), value: 'dark' },
      { name: t('pages.settings.appearance.theme-light'), value: 'light' },
      { name: t('pages.settings.appearance.theme-system'), value: 'system' },
    ]}
    bind:value={theme.value}
    on:select={theme.select}
  />
</div>
<div class="s-option">
  <TextBlock> {t('pages.settings.appearance.bookmarkBar')} </TextBlock>
  <ComboBox
    items={[
      { name: t('pages.settings.appearance.bookmarkBar-always'), value: 'all' },
      { name: t('pages.settings.appearance.bookmarkBar-newtab'), value: 'newtab' },
      { name: t('pages.settings.appearance.bookmarkBar-never'), value: 'none' },
    ]}
    bind:value={bookmarkBar}
  />
</div>
<div class="s-option">
  <TextBlock style="width: 30%"> {t('pages.settings.appearance.pageZoom')} </TextBlock>
  <Slider
    suffix="%"
    bind:value={defaultPageZoom_proxy}
    min={1} max={200}
  />
</div>
<div class="s-option">
  <TextBlock style="width: 30%"> {t('pages.settings.appearance.uiZoom')} </TextBlock>
  <Slider
    suffix="%"
    bind:value={chromeZoom_proxy}
    min={1} max={200}
  />
</div>