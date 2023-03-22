<style>
  .dialog {
    position: absolute;
    top: var(--y);
    left: var(--x);
    margin-top: 2rem;
  }
  .colors {
    margin-top: 1rem;
    display: flex;
    justify-content: space-around;
  }
  .color {
    width: 1.3rem;
    height: 1.3rem;
    margin-inline: 0.15rem;
    border-radius: 50%;
    border: 0.2rem solid transparent;
  }
  .color.selected {
    border-color: var(--accent-5);
  }

  .buttons {
    margin-top: 1rem;
  }
  .widebutton {
    display: flex;
    padding: 0.5rem;
    align-items: center;
    border-radius: 0.25rem;
    transition: .25s;
    opacity: 0.85;
    width: -webkit-fill-available;
  }
  .widebutton:hover {
    background: var(--t-white-3);
  }
  .widebutton:hover:active {
    background: var(--t-white-5);
    transition: 0s;
  }
  .widebutton > img {
    margin-right: 0.3rem;
  }

  .done {
    margin-top: 1rem;
    display: flex;
    justify-content: flex-end;
  }


  @media (prefers-color-scheme: light) {
    .widebutton:hover {
      background: var(--t-black-2);
    }
    .widebutton:hover:active {
      background: var(--t-black-4);
    }
  }
</style>

<script>
  export let editingTabGroup = { group: {}, position: {} };
  const { ipcRenderer } = window.nereid
  import { getContext } from 'svelte/internal';
  import { fly } from 'svelte/transition';
  import { appear } from "//lib/transition.js";
  import Button from "//lib/Button.svelte";

  const { t } = window;
  const _ = {
    PLACEHOLDER: t('ui.groups.namePlaceholder'),
    NEWTAB: t('ui.groups.newTab'),
    UNGROUP: t('ui.groups.ungroup'),
    CLOSEALL: t('ui.groups.closeAll'),
    DONE: t('common.done'),
  }

  const colorTheme = getContext('colorTheme')
  const setTop = getContext('setTop')
  let input;

  function changeGroupName({ target }) {
    ipcRenderer.send('chrome.changeGroupData', editingTabGroup.group.id, { name: target.value })
  }

  function setGroupColorF(color) {
    return function () {
      ipcRenderer.send('chrome.changeGroupData', editingTabGroup.group.id, { color })
      editingTabGroup.group.color = color;
    }
  }

  function newTab() {
    ipcRenderer.send('newTab', { groupID: editingTabGroup.group.id })
    editingTabGroup = null
  }
  function ungroup() {
    ipcRenderer.send('chrome.ungroup', editingTabGroup.group.id)
    editingTabGroup = null
  }
  function closeAll() {
    const { startIndex, endIndex } = editingTabGroup.group;
    for (let index = startIndex; index < endIndex; index++) {
      ipcRenderer.send('closeTab', index)
    }
    editingTabGroup = null;
  }

  const colors = ['gray', 'blue', 'red', 'yellow', 'green', 'magenta', 'purple', 'cyan', 'orange']

  setTop(true)

  requestAnimationFrame(() => {
    input.focus()
  })
</script>

{#if editingTabGroup}
  <div
    class="dialog"
    in:appear={window.flyoutProperties}
    out:fly={window.flyoutProperties}
    on:outroend={() => setTop(false)}
    style="
      --x: {editingTabGroup.position.x}px;
      --y: {editingTabGroup.position.y}px
    "
  >
    <div class="dialog-content">
      <div class="name">
        <input
          class="input"
          bind:value={editingTabGroup.group.name}
          on:input={changeGroupName}
          placeholder={_.PLACEHOLDER}
          bind:this={input}
        />
      </div>
      <div class="colors">
        {#each colors as col}
          <button
            class:selected={col == editingTabGroup.group.color}
            class="color"
            style="background: var(--group-{col})"
            on:click={setGroupColorF(col)}
          ></button>
        {/each}
      </div>
      <div class="buttons">
        <button
          class="widebutton"
          on:click={newTab}
        >
          <img src="n-res://{$colorTheme}/plus.svg" alt="">
          {_.NEWTAB}
        </button>
        <button
          class="widebutton"
          on:click={ungroup}
        >
          <img src="n-res://{$colorTheme}/dottedsquare.svg" alt="">
          {_.UNGROUP}
        </button>
        <button
          class="widebutton"
          on:click={closeAll}
        >
          <img src="n-res://{$colorTheme}/circledcross.svg" alt="">
          {_.CLOSEALL}
        </button>
      </div>
      <div class="done">
        <Button on:click={() => {editingTabGroup = null}}>
          {_.DONE}
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="blocker" on:click={() => {editingTabGroup = null}}></div>