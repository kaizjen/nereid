// fills the untranslated lines in non-english translaton files with "<value required>"

const yaml = require('yaml');
const fs = require('fs-extra')
const pathModule = require('path')

const SRC_PATH = pathModule.join(__dirname, './src');

const EN = pathModule.join(SRC_PATH, 'en.yml');

function replaceAllValues(object) {
  const result = {};
  for (const key in object) {
    if (typeof object[key] == 'object' && object[key] != null) {
      result[key] = replaceAllValues(object[key]);

    } else {
      result[key] = '<value required>'
    }
  }
  return result;
}

function scan(object, object2) {
  for (const key in object) {
    const val = object[key];
    if (typeof val == 'object' && val != null) {
      if (key in object2) {
        if (typeof object2[key] == 'object' && object2[key] != null) {
          object2[key] = scan(val, object2[key])

        } else {
          object2[key] = replaceAllValues(object[key])
        }

      } else {
        object2[key] = replaceAllValues(object[key])
      }

    } else if (!(key in object2)) {
      object2[key] = '<value required>'
    }
  }

  return object2;
}

(async function(){
  const object = yaml.parse(await fs.readFile(EN, 'utf-8'));

  for (const entry of await fs.readdir(SRC_PATH)) {
    const path = pathModule.join(SRC_PATH, entry);
    let result = scan(object, yaml.parse(await fs.readFile(path, 'utf-8')))
    await fs.writeFile(path, yaml.stringify(result))
  }
})()