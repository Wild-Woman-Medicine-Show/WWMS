const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 920,
    webPreferences: {
      nodeIntegration: true
    },
    icon: path.join(__dirname, "icon.png")
  })

  win.loadFile('index.html')
}

app.whenReady().then(createWindow)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})