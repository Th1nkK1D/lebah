const fs = require('fs')
const { ncp } = require('ncp')
const glob = require('glob')
const unzipper = require('unzipper')
const { unrar } = require('unrar-promise')
const rmdir = require('rimraf')

function getStudentId(path) {
  let paths = path.split('/')
  return paths[0]
}

function getCurrentDir(path) {
  return path.substring(0, path.lastIndexOf('/'))
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

function removeAll(files) {
  files.forEach(file => {
    fs.unlinkSync(file)
  })
}

function extractRars(files) {
  let left = files.length

  return new Promise((resolve, reject) => {
    files.forEach(file => {
      unrar(file, getCurrentDir(file)).then(() => {
        left--

        if (left === 0) {
          resolve(files.length)
        }
      })
    })
  })
}

function extractZips(files) {
  let left = files.length

  return new Promise((resolve, reject) => {
    files.forEach(file => {
      fs.createReadStream(file)
        .pipe(unzipper.Extract({ path: getCurrentDir(file) }))
        .on('close', () => {
          left--

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

  // Create temp
  console.log('Creating temp...')

  await copyAll(assConfig.inputPath, 'temp')
  
  // Extract files
  let zipFiles = glob.sync('temp'+'/**/*.zip')
  let rarFiles = glob.sync('temp'+'/**/*.rar')
  let removeSource = true

  while (zipFiles.length > 0) {
    console.log('Extracting '+zipFiles.length+' zip files + '+rarFiles.length+' rar files ...')

    await extractZips(zipFiles, removeSource)
    await extractRars(rarFiles, removeSource)

    removeAll(zipFiles.concat(rarFiles))

    zipFiles = glob.sync('temp/**/*.zip')
    rarFiles = glob.sync('temp/**/*.rar')
  }

  // Remove unused file
  assConfig.ignore.forEach(type => {
    let files = glob.sync('temp/**/'+type)
    console.log('Removing '+files.length+' '+type+' ...')
    
    removeAll(files)
  })

  // Prefix student id
  let studentDirs = glob.sync('temp/**/')
  studentDirs.splice(0, 1)

  console.log('Prefixing student id ...')

  studentDirs.forEach(path => {
    let studentId = path.substring(path.indexOf('/')+1, path.indexOf('_'))

    let files = glob.sync(path+'*.*')

    files.forEach(file => {
      let fileName = file.substring(file.lastIndexOf('/') + 1)
      
      if(fileName.indexOf(studentId) !== 0) {
        let newFile = file.substr(0, file.length-fileName.length) + studentId + '_' + file.substr(file.length-fileName.length)
        fs.renameSync(file, newFile)
      }
    })
  })

  // Categorize task
  fs.mkdirSync('output')

  assConfig.tasks.forEach(task => {
    let files = glob.sync('temp/**/*' + task + '*.*')
    fs.mkdirSync('output/'+task)

    console.log('Categorizing tasks ' + task + ' (' + files.length +' files)...')
    
    files.forEach(file => {
      let newFile = assConfig.outputPath + '/' + task + file.substr(file.lastIndexOf('/'))
      fs.renameSync(file, newFile)
    })
  })

  let otherFiles = glob.sync('temp/**/*.*')

  if (otherFiles.length > 0) {
    console.log('Found ' + otherFiles.length + ' uncategorized files (other folder)')
    
    fs.mkdirSync('output/other')

    otherFiles.forEach(file => {
      let newFile = assConfig.outputPath + '/other' + file.substr(file.lastIndexOf('/'))
      fs.renameSync(file, newFile)
    })
  }

  // Remove temp files
  console.log('Removing temp...')

  rmdir('temp', () => console.log('Complete! Enjoy grading :)')) 
}


main()