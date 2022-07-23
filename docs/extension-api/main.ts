/// <reference path="nereid-types.d.ts" />

nereid.tabs.onNewTabCreated(async(tab) => {
  let wc = await tab.getWebContents();
  wc.executeJavaScript(`

  `)
});

(async()=>{
  
  nereid.ui.changeColorTheme({
    bg: 'red'
  })

})
