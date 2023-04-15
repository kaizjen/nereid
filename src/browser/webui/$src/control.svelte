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
  .option {
    display: flex;
    flex-direction: column;
    padding: 12px;
    padding-left: 18px;
    border-radius: 5px;
    border: 1px solid gray;
    margin-bottom: 10px;
    position: relative;
  }
  .changed:before {
    content: '';
    height: 90%;
    background: #00a0ff;
    width: 2px;
    position: absolute;
    top: 5%;
    left: 0.4%;
  }
  .head, .info {
    display: flex;
    justify-content: space-between;
  }
  .info {
    color: gray;
  }
  .type {
    min-width: fit-content;
    filter: brightness(0.9);
  }
  .add {
    display: flex;
    padding: 12px;
    border-radius: 5px;
    margin-bottom: 10px;
    justify-content: space-between;
    align-items: center;
  }
  .add-info {
    display: flex;
    flex-direction: column;
  }
  .add-info > * {
    margin-bottom: 5px;
  }
</style>

<script>
  let controlOptions = {};
  let promise = new Promise(async y => {
    controlOptions = (await window.nereid.userdata.control.get()).options;
    y()
  })

  let newName = '';
  let newType = 'num';
  let enumValues = '';

  async function update() {
    await window.nereid.userdata.control.setOptions(controlOptions)
  }

  function addOption() {
    if (!newName) return;

    let option = { type: newType, description: '' };
    switch (newType) {
      case 'num': {
        option.default = 0;
        break;
      }
      case 'str': {
        option.default = '';
        break;
      }
      case 'bool': {
        option.default = false;
        break;
      }
      case 'enum': {
        option.default = 0;
        if (enumValues == '') return;
        option.elements = enumValues.split(',').map(s => s.trim())
        break;
      }

      default: return alert(`error: unknown type "${newType}"`)
    }
    option.value = option.default;
    controlOptions[newName] = option;

    newName = '';
    newType = 'num';
    enumValues = '';

    update()
  }
</script>

<div class="all">
  <div class="header">
    <h2>Control options</h2>
    This page is for controlling various Nereid-specific options. These only affect the behaviour of Nereid and not its underlying browser engine.<br>
    If you wish to control Chromium options, go to <a href="nereid://flags">nereid://flags</a>
    <br>
    <br>
    You will need to <a href="/" on:click={() => window.nereid.app.restart()}>restart Nereid</a> to apply your changes.
  </div>
  <main>
    {#await promise then _}
      {#each Object.keys(controlOptions) as optionKey}
        {@const option = controlOptions[optionKey]}
        <div class="option" class:changed={option.default != option.value}>
          <div class="head">
            <b>{optionKey}</b>
            <div class="value">
              {#if option.type == 'bool'}
                  <select value={option.value.toString()} on:change={e => {
                    if (e.target.value == 'true') {
                      controlOptions[optionKey].value = true

                    } else {
                      controlOptions[optionKey].value = false
                    }
                    update()
                  }}>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                {:else if option.type == 'str'}
                  <input value={option.value} on:change={e => {
                    controlOptions[optionKey].value = e.target.value;
                    update()
                  }} />
                {:else if option.type == 'num'}
                  <input type="number" value={option.value} on:change={e => {
                    controlOptions[optionKey].value = Number(e.target.value);
                    update()
                  }} />
                {:else if option.type == 'enum'}
                  <select value={option.value} on:change={e => {
                    controlOptions[optionKey].value = Number(e.target.value);
                    update()
                  }}>
                    {#each option.elements as element, i}
                      <option value="{i}">{element}</option>
                    {/each}
                  </select>
              {/if}
            </div>
          </div>
          <div class="info">
            <span>{option.description}</span>
            <span class="type">Type: {option.type}</span>
          </div>
          {#if option.description == ''}
            <div class="del">
              <button on:click={() => {
                delete controlOptions[optionKey]
                controlOptions = controlOptions;
                update()
              }}>Delete</button>
            </div>
          {/if}
        </div>
      {/each}
      <div class="add">
        <div class="add-info">
          <b>Add an option</b>
          <div>Name: <input bind:value={newName} /></div>
          <div>Type:
            <select bind:value={newType}>
              <option value="num">Number (num)</option>
              <option value="str">String (str)</option>
              <option value="bool">Boolean (bool)</option>
              <option value="enum">Enumerator (enum)</option>
            </select>
            {#if newType == 'enum'}
              comma-separated list of values: <input bind:value={enumValues} />
            {/if}
          </div>
        </div>
        <button on:click={addOption}>
          Add
        </button>
      </div>
    {/await}
  </main>
</div>