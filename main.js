const fs = require('fs')
const glob = require('glob')
const unzipper = require('unzipper')
const { unrar } = require('unrar-promise')

function extractRars(files, path, removeSource = false) {
  let left = files.length

  return new Promise((resolve, reject) => {
    files.forEach(file => {
      unrar(file, './output').then(() => {
        left--

        if (removeSource) {
          fs.unlinkSync(file)
        }

        if (left === 0) {
          resolve(files.length)
        }
      })
    })
  })
}

function extractZips(files, path, removeSource = false) {
  let left = files.length

  return new Promise((resolve, reject) => {
    files.forEach(file => {
      fs.createReadStream(file)
        .pipe(unzipper.Extract({ path: path }))
        .on('close', () => {
          left--

          if (removeSource) {
            fs.unlinkSync(file)
          }

          if (left === 0) {
            resolve(files.length)
          }
        })
    })
  })
}

async function main() {
  if (process.argv.length <= 3) {
    console.log("Usage: " + __filename + " input_path output_path");
    process.exit(-1);
  }
  
  const inputPath = process.argv[2]
  const outputPath = process.argv[3]
  
  let zipFiles = glob.sync(inputPath+'/**/*.zip')
  let rarFiles = glob.sync(inputPath+'/**/*.rar')
  let removeSource = false

  while (zipFiles.length > 0) {
    console.log('Extracting '+zipFiles.length+' zip files + '+rarFiles.length+' rar files ...')

    await extractZips(zipFiles, outputPath, removeSource)
    await extractRars(rarFiles, outputPath, removeSource)

    zipFiles = glob.sync(outputPath+'/**/*.zip')
    rarFiles = glob.sync(outputPath+'/**/*.rar')
    removeSource = true
  }
  
  // console.log(glob.sync(outputPath+'/**/*.c'))
}


main()