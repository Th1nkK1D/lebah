const fs = require('fs')
const glob = require('glob')
const unzipper = require('unzipper')

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
  
  // Expand all zip
  let zipFiles = glob.sync(inputPath+'/**/*.zip')
  let removeSource = false

  while (zipFiles.length > 0) {
    console.log('Extracting '+zipFiles.length+' zip files...')

    await extractZips(zipFiles, outputPath, removeSource)

    zipFiles = glob.sync(outputPath+'/**/*.zip')
    removeSource = true
  }
  

  // console.log(glob.sync(outputPath+'/**/*.c'))
}


main()