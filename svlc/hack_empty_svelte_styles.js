// After the transition, svelte forgets to remove the <style> tags that are injected during it.
// This script injects code into the svelte files that removes the unnecessary elements.

const originalCJS = `function clear_rules() {
    exports.raf(() => {
        if (active)
            return;
        managed_styles.forEach(info => {
            const { stylesheet } = info;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            info.rules = {};
        });
        managed_styles.clear();
    });
}`

const modifiedCJS = `function clear_rules() {
    exports.raf(() => {
        if (active)
            return;
        managed_styles.forEach(info => {
            const { stylesheet } = info;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            info.rules = {};
            stylesheet.ownerNode.remove(); // <-- HACK: remove the empty <style> tag, that's left after the transition
        });
        managed_styles.clear();
    });
}`

const originalMJS = `function clear_rules() {
    raf(() => {
        if (active)
            return;
        managed_styles.forEach(info => {
            const { stylesheet } = info;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            info.rules = {};
        });
        managed_styles.clear();
    });
}`

const modifiedMJS = `function clear_rules() {
    raf(() => {
        if (active)
            return;
        managed_styles.forEach(info => {
            const { stylesheet } = info;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            info.rules = {};
            stylesheet.ownerNode.remove(); // <-- HACK: remove the empty <style> tag, that's left after the transition
        });
        managed_styles.clear();
    });
}`
const fs = require('fs');
const path = require('path');

const pathToSvelteCJS = path.basename(process.cwd()) == 'svlc' ? '../node_modules/svelte/internal/index.js' : './node_modules/svelte/internal/index.js'
const pathToSvelteMJS = path.basename(process.cwd()) == 'svlc' ? '../node_modules/svelte/internal/index.mjs' : './node_modules/svelte/internal/index.mjs'

console.log('Injecting code into svelte...');

let cjs_txt = fs.readFileSync(pathToSvelteCJS, 'utf-8');
let mjs_txt = fs.readFileSync(pathToSvelteMJS, 'utf-8');

fs.writeFileSync(pathToSvelteCJS, cjs_txt.replaceAll(originalCJS, modifiedCJS))
fs.writeFileSync(pathToSvelteMJS, mjs_txt.replaceAll(originalMJS, modifiedMJS))

console.log('Done!');