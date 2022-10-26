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
  }
  .date {
    text-transform: capitalize;
  }
</style>

<script>
  import StartPanel from "./Newtab/StartPanel.svelte";

  const timeFmt = Intl.DateTimeFormat(navigator.language, { timeStyle: 'short', hour12: false })
  const dateFmt = Intl.DateTimeFormat(navigator.language, { dateStyle: 'full' })
  let unixMs = Date.now();
  setInterval(() => {
    unixMs = Date.now()
  }, 100)

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

<div class="app">
  <div class="time">
    <div class="time-containter">
      <h1>{time}</h1>
      <span class="date">{date}</span>
    </div>
  </div>

  <StartPanel />
</div>