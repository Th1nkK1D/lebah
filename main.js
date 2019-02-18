const fs = require('fs')
const glob = require('glob')
const unzipper = require('unzipper')
const { unrar } = require('unrar-promise')
const { ncp } = require('ncp')

function getStudentDir(path) {
  let paths = path.split('/')
  return paths[0]
}

function getCurrentDir(path) {
  let paths = path.split('/')
  paths.splice(paths.length-1, 1)
  return paths.join('/')
}

function copyAll(src, dst) {
  return new Promise((resolve, reject) => {
    ncp(src, dst, function (err) {
      if (err) {
        return console.error(err);
        reject(err)
      }
      resolve()
     })
  })
}

function extractRars(files, removeSource = false) {
  let left = files.length

  return new Promise((resolve, reject) => {
    files.forEach(file => {
      unrar(file, getCurrentDir(file)).then(() => {
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

function extractZips(files, removeSource = false) {
  let left = files.length

  return new Promise((resolve, reject) => {
    files.forEach(file => {
      fs.createReadStream(file)
        .pipe(unzipper.Extract({ path: getCurrentDir(file) }))
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

function moveFiles(files, path) {
  return new Promise((resolve, reject) => {
    files.forEach(file => {
      fpath = file.split('/')
      fs.renameSync(file, path+'/'+fpath[fpath.length-1])
    })

    resolve()
  })
}

async function main() {
  if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " assesment_config_file");
    process.exit(-1);
  }

  const assConfig = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))

  console.log('Creating temp...')

  await copyAll(assConfig.inputPath, 'temp')
  
  let zipFiles = glob.sync('temp'+'/**/*.zip')
  let rarFiles = glob.sync('temp'+'/**/*.rar')
  let removeSource = true

  // zipFiles.forEach(file => {
  //   console.log(getCurrentDir(file))
  // })


  while (zipFiles.length > 0) {
    console.log('Extracting '+zipFiles.length+' zip files + '+rarFiles.length+' rar files ...')

    await extractZips(zipFiles, removeSource)
    await extractRars(rarFiles, removeSource)

    zipFiles = glob.sync('temp'+'/**/*.zip')
    rarFiles = glob.sync('temp'+'/**/*.rar')
  }

  assConfig.tasks.forEach(task => {
    let files = glob.sync('temp/**/*'+task+'*.*')
    console.log(files)
  })
  
  
}


main()