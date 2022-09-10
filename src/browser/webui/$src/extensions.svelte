<script>
  import Header from "./common/Header.svelte";
  import * as Icons from "./icons.js";

  const { t } = window.nereid.i18n;
</script>

<svelte:head>
  <title>{t('common.extensions')}</title>
</svelte:head>

<header>
  <Header name="extensions">
    <Icons.Extensions />
  </Header>
</header>

<h3>
  {t('unimplemented')}
</h3>