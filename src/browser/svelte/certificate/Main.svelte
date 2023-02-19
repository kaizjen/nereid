<script>
  import Certificate from "./Certificate.svelte";

  const { sendInternal, ipcRenderer } = window.nereid;
  const hostname = location.hash.slice(1);

  const t = (...args) => ipcRenderer.sendSync('t', ...args)
  const tt = (path, ...args) => t(`windows.certificateViewer.${path}`, ...args)

  let certificateResult = {};
  let promise = new Promise(async y => {
    certificateResult = await sendInternal('session.getCertificate', hostname);
    y();
  })
</script>

<svelte:head>
  <title>{tt('title', { hostname })}</title>
</svelte:head>

{#await promise}
  <p style="text-align: center;">
    {t('common.loading')}
  </p>
{:then _}
  <h2
    style:color={certificateResult.errorCode == 0 ? 'green' : 'red'}
  >{tt(`status-${certificateResult.errorCode == 0 ? 'valid' : 'invalid'}`)}</h2>

  <Certificate
    cert={certificateResult.certificate}
    {tt}
  />
{/await}
