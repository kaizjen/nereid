<style>
  .app {
    position: fixed;
    width: 100%;
    height: 100%;
    backdrop-filter: blur(3px);
  }
  .time {
    display: flex;
    justify-content: center;
  }
  .time-containter {
    flex-direction: column;
    display: inline-flex;
    align-items: center;
    margin-bottom: 45px;
    margin-top: 10px;
  }
  @media (prefers-color-scheme: dark) {
    .time-containter {
      text-shadow: 0 2px 2px black;
      color: white;
    }
  }
  @media (prefers-color-scheme: light) {
    .time-containter {
      text-shadow: 0 2px 2px white;
      color: black;
    }
  }
  .time-containter > h1 {
    margin: 0;
    font-size: 70px;
    font-weight: 100;
  }
  .date {
    text-transform: capitalize;
  }
</style>

<script>
  import StartPanel from "./Newtab/StartPanel.svelte";

  // TODO: allow for selecting 24-h format vs 12-h format
  const timeFmt = Intl.DateTimeFormat(navigator.language, { timeStyle: 'short', hourCycle: 'h23' })
  // 'h23' because `hour12: false` would show "0:30" as "24:30" (https://support.google.com/chrome/thread/29828561?hl=en)
  const dateFmt = Intl.DateTimeFormat(navigator.language, { dateStyle: 'full' })
  let unixMs = 0;
  function updateDateTime() {
    if (document.visibilityState == 'hidden') return;

    unixMs = Date.now();
    setTimeout(updateDateTime, 100);
  }
  updateDateTime()

  let time;
  $: time = timeFmt.format(unixMs)

  let date;
  $: date = dateFmt.format(unixMs)

  let keyLocks = 0;

  window.lockKeyEvents = () => {
    keyLocks++;
  }
  window.unlockKeyEvents = () => {
    if (keyLocks == 0) return;
    keyLocks--;
  }

  window.addEventListener('keydown', ({ code, key, ctrlKey }) => {
    if (keyLocks > 0) return;
    nereid.tab.sendKeyToChrome({ code, key, ctrlKey });
  })
</script>

<svelte:window on:visibilitychange={updateDateTime} />

<div class="app">
  <div class="time">
    <div class="time-containter">
      <h1>{time}</h1>
      <span class="date">{date}</span>
    </div>
  </div>

  <StartPanel />
</div>