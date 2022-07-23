<style>
  .main {
    width: -webkit-fill-available;
    height: -webkit-fill-available;
    z-index: -1;
    padding-inline: 200px;
  }
  .head {
    -webkit-app-region: drag;
    padding-top: 20px;
    margin-bottom: 50px;
    padding-left: 200px;
  }
  .textframe {
    padding: 8px;
    max-height: 50vh;
    overflow: auto;
    white-space: pre-wrap;
    background: #8080807a;
    font-family: monospace;
  }
  .flex {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
  }
</style>
<script>
  import { Button, TextBlock } from "fluent-svelte";
  import { fly } from "svelte/transition";

  export let next;

  const { t } = window.nereid.i18n;
  let TOS;

  const EnglishTOS = `
Hello. Nereid is free to use and modify.
This agreement (that you're reading right now) permits you to use Nereid and modify its code freely.
The author of this software is released from any liability or responsibility from any damage done by this software.

[IMPORTANT]
As per the closed alpha version of this software, Nereid will send data to its online services without warning.
Said data includes: your OS version and tag, your hardware identifdiers, crash reports, other error and log information.
These reports should exclude any sensitive data, like the sites you visit or your history, even though in some edge cases, or due to a bug this data may be still sent sometimes.

The software is licensed under an MIT License, which reads as follows:

Copyright (c) 2022 @wheezard

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  `

  const LocalizedTOS = t('LocalizedTOS');
  if (LocalizedTOS == 'LocalizedTOS') {
    TOS = EnglishTOS;
    
  } else if (LocalizedTOS.trim().replaceAll('\n', '').replaceAll(' ', '') == EnglishTOS.trim().replaceAll('\n', '').replaceAll(' ', '')) {
    TOS = LocalizedTOS;

  } else {
    TOS = LocalizedTOS + '\n\nEnglish (original) form:\n' + EnglishTOS
  }
</script>


<div class="head">
  <TextBlock variant="titleLarge">{t('pages.welcome.TOS.title')}</TextBlock>
</div>
<div class="main" in:fly={{ x: 400 }}>
  <div class="note">
    {t('pages.welcome.TOS.note')}
  </div>

  <div class="textframe">
    {TOS}
  </div>
  <div class="flex">
    <Button on:click={() => window.nereid.app.quit()}>{t('pages.welcome.TOS.button-decline')}</Button>
    <Button on:click={next} variant="accent">{t('pages.welcome.TOS.button-accept')}</Button>
  </div>
</div>