<style>
  main {
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
  }

  table {
    border: 1px solid var(--gray-1);
    border-collapse: collapse;
    margin: 8px;
  }

  td {
    white-space: nowrap;
    padding: 4px;
  }
  tr > td:first-child {
    white-space: break-spaces;
  }

  tr:nth-child(odd) {
    background: var(--dark-3);
  }

  tr.header {
    border-bottom: 1px solid var(--gray-1);
    font-weight: bold;
    background: var(--dark-1);
  }

  tr.selected {
    background: var(--accent-5);
  }

  .buttons {
    padding: 8px;
    padding-inline: 12px;
    position: sticky;
    bottom: 0;
    background: var(--dark-2);
    display: flex;
    justify-content: flex-end;
  }

  @media (prefers-color-scheme: light) {
    table {
      border: 1px solid var(--gray-7);
    }
    tr:nth-child(odd) {
      background: var(--light-8);
    }
    tr.header {
      border-bottom: 1px solid var(--gray-7);
      background: var(--light-5);
    }
    tr.selected {
      background: var(--accent-9);
    }
    .buttons {
      background: var(--light-9);
    }
  }
</style>
<script>
  const { sendInternal, ipcRenderer } = window.nereid;
  import Button from "//lib/Button.svelte"

  const t = (...args) => ipcRenderer.sendSync('t', ...args)
  const tt = (path, ...args) => t(`windows.taskManager.${path}`, ...args)

  let processes = [];
  let selectedPID = -1;

  async function update() {
    processes = await ipcRenderer.invoke('getProcesses')

    console.log("Updating", processes);

    if (!processes.find(p => p.pid == selectedPID)) {
      selectedPID = -1;
    }
  }

  $: selectedProcess = processes.find(p => p.pid == selectedPID);
  $: isFinishable = !(
    selectedProcess?.type == 'Browser' || selectedProcess?.type == 'GPU' || selectedProcess?.serviceName == '$chrome'
  )

  update();
  setInterval(update, 750)

  function handleSelectF(isKeyboard, pid) {
    return (e) => {
      if (isKeyboard && e.key != 'Enter') return;
      selectedPID = pid
    }
  }

  async function kill() {
    try {
      if (selectedPID == -1) return;
  
      if (selectedProcess.type == 'Browser') {
        return sendInternal('restart');
      }

      console.log(`Killing pid ${selectedPID}`, await ipcRenderer.invoke('killProcess', selectedPID))
      update()

    } catch (error) {
      alert(`Couldn't end the selected process (${selectedPID}): ${error}`)
    }
  }
</script>

<svelte:head>
  <title>{tt('title')}</title>
</svelte:head>

<main>
  <table>
    <tr class="header">
      <td>{tt('table.name')}</td>
      <td>{tt('table.pid')}</td>
      <td>{tt('table.cpu')}</td>
      <td>{tt('table.memory')}</td>
    </tr>
    {#each processes as proc}
      <tr
        tabindex="0"
        on:mousedown={handleSelectF(false, proc.pid)}
        on:keydown={handleSelectF(true, proc.pid)}
        on:auxclick={(e) => {
          if (e.button == 2) ipcRenderer.send('menuOfProcess', proc)
        }}
        class:selected={selectedPID == proc.pid}
      >
        <td>{proc.name}</td>
        <td>{proc.pid}</td>
        <td>{proc.cpu.percentCPUUsage.toString().slice(0, 5)}%</td>
        <td>{proc.memory.workingSetSize} {tt('table.kb')}</td>
      </tr>
    {/each}
  </table>
  
  <div class="buttons">
    <Button disabled={selectedPID == -1} on:click={kill}>{isFinishable ? tt('button-finish') : tt('button-restart')}</Button>
  </div>
</main>