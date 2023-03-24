<style>
  .main {
    width: -webkit-fill-available;
    height: -webkit-fill-available;
    z-index: -1;
    padding-inline: 200px;

    --themer-box: 30px;
    --th-light: linear-gradient(308deg, #f9f9f996, #ffffff);
    --th-dark: linear-gradient(123deg, black, #00000094);
    --th-system: linear-gradient(var(--fds-accent-default), #ffffff57)
  }
  .head {
    -webkit-app-region: drag;
    padding-top: 20px;
    margin-bottom: 50px;
    padding-left: 200px;
  }
  footer {
    display: flex;
    align-items: center;
    bottom: 0;
    position: absolute;
    width: 100%;
    padding-block: 8px;
    justify-content: flex-end;
  }
  footer > :global(*) {
    margin-inline: 20px;
  }
  @media (prefers-color-scheme: dark) {
    footer {
      background: black;
    }
  }
  @media (prefers-color-scheme: light) {
    footer {
      background: #cacaca;
    }
  }
  .options {
    margin-top: 20px;
    display: flex;
    justify-content: space-evenly;
  }
  .column {
    display: flex;
    flex-direction: column;
  }
  .surface {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 30px;
  }
  .themer {
    box-shadow: black 3px 4px 14px 0;
    padding: var(--themer-box);
    border-radius: 8px;
  }
  .themer.white {
    background: var(--th-light);
  }
  .themer.dark {
    background: var(--th-dark);
  }
  .themer.half {
    background: var(--th-system);
  }
  .note {
    margin-top: 50px;
    font-size: small;
    color: gray;
    font-style: italic;
  }
</style>
<script>
  import { TextBlock, Button } from "fluent-svelte";
  import { fly } from "svelte/transition";

  export let next;
  export let config;

  const { t } = window.nereid.i18n;

  let currentTheme = config.ui.theme;

  function setThemeF(theme) {
    return function () {
      config.ui.theme = theme;
      window.nereid.userdata.config.set(config)
      currentTheme = theme
    }
  }
</script>


<div class="head">
  <TextBlock variant="titleLarge">{t('pages.welcome.themes.title')}</TextBlock>
</div>
<div class="main" in:fly={{ x: 400 }}>
  <div class="note">
    {t('pages.welcome.themes.note')}
  </div>

  <div class="options">
    <Button on:click={setThemeF('light')} style={currentTheme == 'light' ? "border-color: var(--fds-accent-default)" : ''}>
      <div class="column">
        <div class="surface">
          <div class="themer white"></div>
        </div>
        {t('pages.welcome.themes.light')}
      </div>
    </Button>
    <Button on:click={setThemeF('dark')} style={currentTheme == 'dark' ? "border-color: var(--fds-accent-default)" : ''}>
      <div class="column">
        <div class="surface">
          <div class="themer dark"></div>
        </div>
        {t('pages.welcome.themes.dark')}
      </div>
    </Button>
    <Button on:click={setThemeF('system')} style={currentTheme == 'system' ? "border-color: var(--fds-accent-default)" : ''}>
      <div class="column">
        <div class="surface">
          <div class="themer half"></div>
        </div>
        {t('pages.welcome.themes.system')}
      </div>
    </Button>
  </div>

</div>
<footer>
  <Button on:click={next}>
    {t('pages.welcome.common.next')}
  </Button>
</footer>