const { app, BrowserWindow, screen, Menu, MenuItem } = require('electron')
const path = require('path')

async function createWindow () {
  const {width, height} = screen.getPrimaryDisplay().workAreaSize
  const win = new BrowserWindow({
    width,
    height,
    backgroundColor: '#303030',
    spellcheck: true,
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, "icon.png"),
    show: false
  })

  win.webContents.on('context-menu', (event, params) => {
    const menu = new Menu()

    // Add each spelling suggestion
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(new MenuItem({
        label: suggestion,
        click: () => win.webContents.replaceMisspelling(suggestion)
      }))
    }

    // Allow users to add the misspelled word to the dictionary
    if (params.misspelledWord) {
      menu.append(
        new MenuItem({
          label: 'Add to dictionary',
          click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
        })
      )
    }

    menu.popup()
  })
  win.maximize()
  win.loadFile('index.html')
  await win.once('ready-to-show')
  win.show()
}

app.whenReady().then(createWindow)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})