import * as i18n from "i18next";
import * as fs from "fs-extra";
import * as pathModule from "path"
import { app } from "electron";
import { config } from "./userdata";

const translationsDirectory = pathModule.join(__dirname, '../i18n/final')

const translationFiles = fs.readdirSync(translationsDirectory)
export const availableTranslations = translationFiles.map(t => pathModule.basename(t, '.json'))

export const t = i18n.t;

const defaultData = {
  this: {
    name: "Nereid", // changed later by init()
    version: app.getVersion()
  }
}

let lang = ''

let configData = config.get();


function init() {
  function parseTranslation(lang: string) {
    try {
      return JSON.parse(
        fs.readFileSync(
          pathModule.join(translationsDirectory, lang + '.json'), 'utf-8'
        )
      );

    } catch (e) {
      console.log(`Warning! The translation for the language ${lang} is not available!`);
      return JSON.parse(
        fs.readFileSync(
          pathModule.join(translationsDirectory, 'en.json'), 'utf-8'
        )
      );
    }
  }

  i18n.init({
    lng: lang,
    resources: {
      [lang]: {
        root: parseTranslation(lang)
      }
    },
    defaultNS: 'root',
    interpolation: {
      prefix: '${',
      suffix: '}',
      escapeValue: false
    },
    initImmediate: false
  });

  console.log('Initialized i18next for language %o (prefers %o)', (i18n as any).language, lang);
  defaultData.this.name = t('name', { defaultValue: 'Nereid' })
  console.log('%o', t('name'));
}

if (configData.i18n != null) {
  app.commandLine.appendSwitch('lang', configData.i18n.locale)
  lang = getSupportedLanguage(configData.i18n.lang);
  init();

} else {
  app.once('ready', () => {
    // You have to call .getLocale() after the 'ready' event on Windows
    let language = getSupportedLanguage(app.getLocale());
    config.set({
      i18n: { locale: app.getLocale(), lang: language }
    })
    lang = language;
    init();
  })
}

export function getSupportedLanguage(locale: string) {
  // Try to find the closest language to the system locale.

  let strippedLocale = locale.split('-')[0];

  let perfectMatch = availableTranslations.find((val) => {
    return val == locale
  });
  if (perfectMatch) return locale;

  let strippedMatch = availableTranslations.find((val) => {
    return val == strippedLocale
  })
  if (strippedMatch) return strippedLocale;

  let differentMatch = availableTranslations.find(val => {
    return val.startsWith(strippedLocale)
  })
  if (differentMatch) return differentMatch;


  return 'en-US';
}