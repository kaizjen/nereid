<style>
  .main {
    display: flex;
    align-items: end;
    justify-content: end;
  }

  .flex {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>

<script>
  import { Button, Flyout, IconButton, ListItem, TextBlock } from "fluent-svelte";
  import Keybind from "./Keybind.svelte";
  import Close from "../../icons/Close.svelte";
  import { createEventDispatcher } from "svelte";

  export let command;

  const { t } = window.nereid.i18n;

  let beingRebound = false;

  const dispatch = createEventDispatcher();

  /** Returns `[isModifier: boolean, key: string]` or `null`
   * @param {string} key */
  function keyToAccel(key, code) {
    if ([
      "Alt", "Control", "Shift", "Super", "Meta"
    ].includes(key)) {
      return [true, key];
    }

    if (key == "AltGraph") {
      return [true, "AltGr"]
    }
    if (key == "Option") {
      return [true, "Alt"]
    }

    if (key.startsWith('F') && !isNaN(Number(key[1]))) {
      // Only lookout for F1-F20 keys, not for sth like "FnLock"
      return [false, key];
    }
    if (key.startsWith('Soft')) {
      // Map "Soft(1-4)" to "F(21-24)" keys
      return [false, "F2" + key.slice("Soft".length)]
    }

    if (!isNaN(Number(key))) {
      if (code.includes("Numpad")) {
        return [false, 'num' + key]
      }
      return [false, key]
    }
    if (key.length == 1) {
      if (code == "NumpadDecimal") return [false, 'numdec'];
      if (code == "NumpadAdd") return [false, 'numadd'];
      if (code == "NumpadSubtract") return [false, 'numsub'];
      if (code == "NumpadMultiply") return [false, 'nummult'];
      if (code == "NumpadDivide") return [false, 'numdiv'];
      if (key == ' ') return [false, 'Space'];
      if (key == '+') return [false, 'Plus'];

      return [false, key.toUpperCase()]
    }

    if (key == "Clear") return [false, "Delete"]

    if ([
      "Enter", "Tab", "Backspace", "Delete",
      "Home", "End", "PageUp", "PageDown", "Insert", "Escape",
      "PrintScreen", "MediaPlayPause", "MediaStop"
    ].includes(key)) {
      return [false, key]
    }

    if (["CapsLock", "NumLock", "ScrollLock"].includes(key)) {
      // Electron has them as "Capslock"
      return [false, key[0].toUpperCase() + key.toLowerCase().slice(1)]
    }

    if (key.startsWith("Arrow")) {
      return [false, key.slice("Arrow".length)]
    }
    if (key.startsWith("AudioVolume")) {
      // AudioVolumeDown (KeyCode) -> VolumeDown (in Electron)
      return [false, key.slice("Audio".length)]
    }

    // These are switched in Electron for some reason
    if (key == "MediaTrackNext") return [false, "MediaNextTrack"]
    if (key == "MediaTrackPrevious") return [false, "MediaPreviousTrack"]
    // Map both of those to MediaPlayPause
    if (key == "MediaPlay" || key == "MediaPause") {
      return [false, "MediaPlayPause"]
    }

    // Unsupported key
    return null;
  }

  let currentAccelerator = '';

  /**  @param {KeyboardEvent} e */
  function handleKeyDown(e) {
    if (e.key == "Unidentified") return console.error("The key is unidentified");

    const maybeAccel = keyToAccel(e.key, e.code)
    if (maybeAccel) {
      const [isMod, key] = maybeAccel;

      if (currentAccelerator == '') {
        currentAccelerator = key;

      } else if (!currentAccelerator.includes('+' + key) && !currentAccelerator.includes(key + '+') && currentAccelerator != key) {
        currentAccelerator += '+' + key;
      }
      if (!isMod) {
        dispatch('change', currentAccelerator);
        beingRebound = false;
      }

    } else {
      console.warn(`The key %o (%o) is unsupported`, e.key, e.code);
      beingRebound = false;
    }
  }

  $: if (beingRebound) {
    window.nereid.tab.ignoreMenuShortcuts(true)
    window.addEventListener('keydown', handleKeyDown)
  } else {
    currentAccelerator = '';
    window.removeEventListener('keydown', handleKeyDown)
    requestAnimationFrame(() => {
      window.nereid.tab.ignoreMenuShortcuts(false)
    })
  }
</script>


<div class="main">
  <Button
    on:click={() => beingRebound = !beingRebound}
    style={beingRebound ? "border-color: var(--fds-accent-default)" : ""}
  >
    <Keybind style={false} accelerator={command.accelerator} />
  </Button>

  {#if beingRebound}
    <Flyout open={beingRebound} placement="bottom" alignment="end" closable={false}>
      <svelte:fragment slot="flyout">
        <div class="flex">
          {#if currentAccelerator == ''}
            <TextBlock>{t('pages.settings.keyboard.rebind.prompt')}</TextBlock>
          {:else}
            <span>
              <Keybind accelerator={currentAccelerator} />
            </span>
          {/if}
          <IconButton on:click={() => beingRebound = false}>
            <Close />
          </IconButton>
        </div>
        <ListItem on:click={() => { dispatch('change', null); beingRebound = false; }}>
          {t('pages.settings.keyboard.rebind.reset')}
        </ListItem>
      </svelte:fragment>
    </Flyout>
  {/if}
</div>