<style>
  .center {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    position: absolute;
  }
  .content {
    padding: 8px;
    text-align: center;
  }
</style>

<script>
  import { Button, TextBlock } from "fluent-svelte";
  import { scale } from "svelte/transition";

  export let next;

  const { t } = window.nereid.i18n;

  async function goodbye() {
    await next();
    await nereid.view.leaveFullWindowView()
    window.location = 'nereid://newtab'
  }
</script>

<div class="center" in:scale={{ start: 0.8, duration: 200 }}>
  <div class="content">
    <TextBlock variant="display" style="margin-bottom: 50px;">
      {t('pages.welcome.final.message')}
    </TextBlock><br>
    <Button variant="hyperlink" on:click={goodbye}>{t('pages.welcome.final.motivationalButton')}</Button>
  </div>
</div>