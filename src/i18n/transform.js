// transpiles human-readable yaml into faster JSON for localization
const yaml = require('yaml');
const fs = require('fs-extra')
const pathModule = require('path')

const FINAL_PATH = pathModule.join(__dirname, './final');
const SRC_PATH = pathModule.join(__dirname, './src');

(async function(){

  // clear the final dir
  await fs.rm(FINAL_PATH, { recursive: true }).catch(e => console.log("Didn't remove /final:", e));
  await fs.mkdir(FINAL_PATH)
  
  let entries = await fs.readdir(SRC_PATH);
  let numProcessed = 0;

  for (const item of entries) {
    const itemPath = pathModule.join(SRC_PATH, item)
    const finalPath = pathModule.join(FINAL_PATH, item.replace(pathModule.extname(item), '.json'))
    
    let errNum = 0;
    try {
      let contents = await fs.readFile(itemPath, 'utf-8'); errNum++;
      let obj = yaml.parse(contents); errNum++;
      
      await fs.writeFile(finalPath, JSON.stringify(obj));

      numProcessed++;

    } catch (e) {
      let desc = '';
      switch (errNum) {
        case 0: {
          desc = `Error while reading the file "${itemPath}"`
        }
        case 1: {
          desc = `Parsing the file "${itemPath}" failed`
        }
        case 2: {
          desc = `Couldn't write the file "${finalPath}"`
        }
      
        default: {
          desc = 'Unknown error (this should not happen at all)'
        }
      };

      console.error(`ERROR: ${desc};`, e);
    }
  }

  console.log(`Converted ${numProcessed} out of ${entries.length} files.`);

})()