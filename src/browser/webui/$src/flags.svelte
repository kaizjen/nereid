<style>
  .all {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .header {
    margin-bottom: 20px;
  }
  main {
    flex-grow: 1;
    max-width: 30cm;
    padding-inline: 30px;
  }
  .flag {
    display: flex;
    justify-content: space-between;
  }
</style>
<script>
  let args = [];
  let switches = [];
  (async () => {
    let control = await window.nereid.userdata.control.get();
    args = control.arguments;
    switches = control.switches;
  })()

  async function updateSwitches() {
    await window.nereid.userdata.control.setSwitches(switches)
  }
  async function updateArgs() {
    await window.nereid.userdata.control.setArguments(args)
  }

  let newSwitch = '';
  let newArgName = '';
  let newArgValue = '';
</script>

<div class="all">
  <div class="header">
    <h2>Flags</h2>
    This page is for controlling Chromium-specific flags and switches. These only affect the behaviour of Nereid's browser engine.<br>
    If you wish to control Nereid-specific options, go to <a href="nereid://control">nereid://control</a>
    <br>
    <br>
    You will need to <a href="/" on:click={() => window.nereid.app.restart()}>restart Nereid</a> to apply your changes.
  </div>
  <main>
    <h3>Switches</h3>
    <p>These are true/false switches, where the presence of a switch means true</p>
    {#each switches as sw, i}
      <div class="flag">
        <span>
          --<input value={sw} on:change={e => {
            switches[i] = e.target.value;
            updateSwitches()
          }} />
        </span>
        <button on:click={() => {
          switches.splice(i, 1);
          switches = switches;
          updateSwitches()
        }}>Delete</button>
      </div>
    {/each}
    <b>Add a new switch</b>
    <div class="flag">
      <span>--<input bind:value={newSwitch} /></span>
      <button on:click={() => {
        if (newSwitch == '') return;

        switches.push(newSwitch);
        switches = switches;
        updateSwitches();
        newSwitch = '';
      }}>Add</button>
    </div>

    <h3>Arguments</h3>
    <p>These are flags that require values</p>
    {#each args as arg, i}
      <div class="flag">
        <span>
          --<input value={arg.name} on:change={e => {
            args[i].name = e.target.value;
            updateArgs()
          }} />
          = <input value={arg.value} on:change={e => {
            args[i].value = e.target.value;
            updateArgs()
          }} />
        </span>
        <button on:click={() => {
          args.splice(i, 1);
          args = args;
          updateArgs()
        }}>Delete</button>
      </div>
    {/each}
    <b>Add a new argument</b>
    <div class="flag">
      <span>
        --<input bind:value={newArgName} />
        = <input bind:value={newArgValue} />
      </span>
      <button on:click={() => {
        if (newArgName == '' || newArgValue == '') return;

        args.push({ name: newArgName, value: newArgValue });
        args = args;
        updateArgs();
        newArgName = newArgValue = '';
      }}>Add</button>
    </div>
  </main>
</div>