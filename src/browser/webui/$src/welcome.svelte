<script>
  import CoolAnimation from "./Welcome/CoolAnimation.svelte";
  import Eula from "./Welcome/EULA.svelte";
  import LanguageChooser from "./Welcome/LanguageChooser.svelte";
  import ThemeChooser from "./Welcome/ThemeChooser.svelte";
  import YoureGoodToGo from "./Welcome/YoureGoodToGo.svelte";

  let config;

  try {
    nereid.view.requestFullWindowView()

  } catch (_) {}

  let slide = -1;

  void async function () {
    config = await window.nereid.userdata.config.get();
    if (config.welcomePhase > 4) {
      await nereid.view.leaveFullWindowView()
      config.welcomePhase = 5;
      window.nereid.userdata.config.set(config);
      window.nereid.tab.go('nereid://newtab');
    }
    slide = config.welcomePhase;
  }()

  async function next() {
    slide++;
    config.welcomePhase = slide;
    await window.nereid.userdata.config.set(config)
  }
</script>

{#if slide == 0}
  <CoolAnimation {next} />
{/if}

{#if slide == 1}
  <LanguageChooser {next} {config} />
{/if}

{#if slide == 2}
  <ThemeChooser {next} {config} />
{/if}

{#if slide == 3}
  <Eula {next} />
{/if}

{#if slide >= 4}
  <YoureGoodToGo {next} />
{/if}