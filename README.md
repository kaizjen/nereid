# Nereid

> An Electron-based web browser

`v0.0.1 (alpha)`



## NPM scripts overview

```bash
npm start # Starts the electron app
npm run chr:build # Compiles svelte code from the chrome (nereid ui)
npm run chr:start # Does the previous step and runs the app
npm run ts:build # tsc
npm run ts:start
npm run webui:build # Compiles the "nereid://" pages
npm run webui:start
npm run build # Runs all the previous build commands
npm run dev # Builds and runs the app
npm run dev-inspect # Builds and runs the app with --inspect flag
npm run localize # Transpiles YAML locale files into JSON ones
npm run begin # Installes and fixes all dependencies, builds the project. Should be used instead of `npm install`
```

## Getting started

You will need node and npm (and git) to build Nereid from source.

### Automatic install

Run `npm run begin`. To start Nereid, run `npm start`.

### Manual install

First run `npm install`. That will install all dependencies.

In `svelte`, there is a bug which adds empty style tags whenever the animation is done. So, to fix it, run `node svlc/hack_empty_svelte_styles.js`. 

Localization sources (in `src/i18n/src/`) are in human-readable but slow YAML format. `npm run localize` transforms them into JSON

Nereid is written using Typescript and Svelte. To start the app, you need to compile all the sources: `npm run build`.



Other docs coming soon
