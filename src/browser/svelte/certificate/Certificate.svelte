<style>
  [sel] {
    user-select: text;
  }

  pre {
    width: -webkit-fill-available;
    overflow: auto;
  }

  .issCert {
    display: flex;
    justify-content: center;
  }
  .issCert > * {
    margin-left: 8px;
  }
</style>
<script>
  import Accordion from "./Accordion.svelte";
  import Principal from "./Principal.svelte";

  export let tt;
  export let cert;

  const dtf = new Intl.DateTimeFormat(navigator.language, { dateStyle: 'medium', timeStyle: 'short' })

  const media = matchMedia(`(prefers-color-scheme: dark)`)
  let theme = media.matches ? 'dark' : 'light';

  media.onchange = () => {
    theme = media.matches ? 'dark' : 'light';
  }
</script>

<Accordion>
  <span slot="button">
    {tt('timePeriod', { start: dtf.format(cert.validStart * 1000), expiry: dtf.format(cert.validExpiry * 1000) })}
  </span>
  <pre slot="content">from: <b sel>{cert.validStart}</b>s
to: <b sel>{cert.validExpiry}</b>s</pre>
</Accordion>
<Accordion>
  <span slot="button">{tt('subject', { name: cert.subjectName })}</span>
  <Principal slot="content" value={cert.subject} />
</Accordion>
<Accordion>
  <span slot="button">{tt('issuer', { name: cert.issuerName })}</span>
  <Principal slot="content" value={cert.issuer} />
</Accordion>
<Accordion>
  <span slot="button">{tt('details')}</span>
  <svelte:fragment slot="content">
    <Accordion>
      <span slot="button">{tt('serialNumber')}</span>
      <pre sel slot="content">{cert.serialNumber}</pre>
    </Accordion>
    <Accordion>
      <span slot="button">{tt('fingerprint')}</span>
      <pre sel slot="content">{cert.fingerprint}</pre>
    </Accordion>
    <Accordion>
      <span slot="button">{tt('data')}</span>
      <pre sel slot="content">{cert.data}</pre>
    </Accordion>
  </svelte:fragment>
</Accordion>

{#if cert.issuerCert}
  <div class="issCert">
    <img src="n-res://{theme}/secdialog_certificate.svg" alt="">
    <h3>{tt('owner')}</h3>
  </div>
  <svelte:self {tt} cert={cert.issuerCert} />
{:else}
  <div class="issCert">
    <h3>{tt('root')}</h3>
  </div>
{/if}