<style>
  .command {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
</style>

<script>
  import { TextBlock, ToggleSwitch, ListItem, ContentDialog, Button } from "fluent-svelte";
  import noFirstTime from "nereid://js/nft.js"
  import { getContext } from "svelte/internal";
  import Keybind from "./Keyboard/Keybind.svelte";
  import Rebinder from "./Keyboard/Rebinder.svelte";
  import { stringFromSegment, getSegments } from "./Keyboard/accelerator-parser.js";

  export let update;

  const { t } = window.nereid.i18n;

  function tt(key, ...args) {
    return t(`pages.settings.keyboard.${key}`, ...args)
  }

  let config = getContext('config');

  const openTabNearbyTTitle = tt('ctrlTOpensTabNearby.title', { shortcut: "$$SH" });
  const openTabNearbyTDesc = tt('ctrlTOpensTabNearby.description', { shortcut: "$$SH" });
  let openTabNearby = $config.behaviour.keyboardOpensTabNearby;
  const updateOpenTabNearby = noFirstTime(() => {
    $config.behaviour.keyboardOpensTabNearby = openTabNearby;
    update()
  })
  $: {openTabNearby; updateOpenTabNearby()}

  let keybindDialog = false;

  function compareAccelerators(accel1, accel2) {
    return getSegments(accel1).map(stringFromSegment).join('+') == getSegments(accel2).map(stringFromSegment).join('+')
  }

  let allCommands = [];
  async function updateCommands() {
    const tempCommands = await nereid.interface.getAllCommands();
    const scannedCommands = [];

    tempCommands.forEach(cmd => {
      if (!cmd.accelerator) return;

      const conflictCommands = scannedCommands.filter(item => compareAccelerators(item.accelerator, cmd.accelerator));
      if (conflictCommands.length > 0) {
        conflictCommands.forEach(item => item.conflicting = true);
        cmd.conflicting = true;
      }
      scannedCommands.push(cmd);
    });
    allCommands = tempCommands;
  }
  updateCommands()

  function handleRebindF(command) {
    return ({ detail: newAccelerator }) => {
      if (newAccelerator == null) {
        delete $config.keybinds[command.name];
        $config = $config;
        update();
        requestIdleCallback(() => {
          updateCommands();
        })
        return;
      }

      $config.keybinds[command.name] = newAccelerator;
      update();
      requestIdleCallback(() => {
        updateCommands();
      })
    }
  }

  $: newTabAccelerator = allCommands.find(c => c.name == 'newTab')?.accelerator || '';
</script>


<ContentDialog
  title={tt('rebind.title')}
  size="max"
  append={document.body}
  bind:open={keybindDialog}
  closable={false}
  style="max-height: 100%; overflow: auto;"
>
  {#each allCommands as command}
    <div class="command">
      <div class="cmdinfo">
        <TextBlock variant="body">{command.label}</TextBlock>
        {#if command.sublabel} <br><TextBlock variant="caption">{command.sublabel}</TextBlock> {/if}
      </div>
      <Rebinder {command} on:change={handleRebindF(command)} />
    </div>
  {/each}
  <Button variant="accent" style="width: 100%" on:click={() => keybindDialog = false}>
    {t('common.done')}
  </Button>
</ContentDialog>

<div class="s-option">
  <TextBlock variant="body">
    <span>
      {#each openTabNearbyTTitle.split('$$SH') as segment, i}
        {#if i != 0}
          <Keybind accelerator={newTabAccelerator} />
        {/if}
        {segment}
      {/each}
    </span>
    <br>
    <TextBlock variant="caption" style="color: gray;">
      {#each openTabNearbyTDesc.split('$$SH') as segment, i}
        {#if i != 0}
          <Keybind accelerator={newTabAccelerator} />
        {/if}
        {segment}
      {/each}
    </TextBlock>
  </TextBlock>
  <ToggleSwitch bind:checked={openTabNearby} />
</div>
<ListItem on:click={() => keybindDialog = true} style="block-size: 57px;">
  <TextBlock variant="body">{tt('rebind.title')}</TextBlock><br>
  <TextBlock variant="caption" style="color: gray;">{tt('rebind.description')}</TextBlock>
</ListItem>