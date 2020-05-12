const { app, ipcMain, Menu, dialog } = require("electron");
const isDev = require("electron-is-dev");
const path = require("path");
const AppWindow = require("./src/AppWindow");
const menuTemplate = require("./src/menuTemplate");
const Store = require("electron-store");
const fileStore = new Store({ name: "file-data" });
const settingsStore = new Store({ name: "Settings" });
const QiniuManager = require("./src/utils/QiniuManager");
const createManager = () => {
  const accessKey = settingsStore.get("accessKey");
  const secretKey = settingsStore.get("secretKey");
  const bucketName = settingsStore.get("bucketName");
  return new QiniuManager(accessKey, secretKey, bucketName);
};
function createWindow() {
  const localUrl = isDev
    ? "http://localhost:3000"
    : `file://${path.join(__dirname, "index.html")}`;
  let mainWindow = new AppWindow({ width: 1600, height: 900 }, localUrl);
  mainWindow.on("close", () => {
    mainWindow = null;
  });
  let menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
  ipcMain.on("open-settings-window", () => {
    const settingWinConf = {
      width: 800,
      height: 600,
      parent: mainWindow
    };
    const settingLoc = `file://${path.join(
      __dirname,
      "./settings/settings.html"
    )}`;
    let settingWin = new AppWindow(settingWinConf, settingLoc);
    settingWin.removeMenu();
    settingWin.on("close", () => {
      settingWin = null;
    });
  });
  ipcMain.on("config-is-saved", () => {
    let qiniuMenu =
      process.platform === "darwin" ? menu.items[3] : menu.items[2];

    const switchItems = toggle => {
      [1, 2, 3].forEach(idx => {
        qiniuMenu.submenu.items[idx].enabled = toggle;
      });
    };
    const qiniuIsConfiged = ["accessKey", "secretKey", "bucketName"].every(
      key => {
        return !!settingsStore.get(key);
      }
    );
    qiniuIsConfiged ? switchItems(true) : switchItems(false);
  });
  ipcMain.on("upload-file", (event, data) => {
    const manager = createManager();
    const { key, path } = data;
    manager
      .uploadFile(key, path)
      .then(data => {
        console.log("上传成功", data);
        mainWindow.webContents.send("active-file-uploaded");
      })
      .catch(err => {
        dialog.showMessageBox({
          type: "info",
          title: "同步失败",
          message: "请检查七牛云参数是否正确"
        });
      });
  });
  ipcMain.on("download-file", (event, data) => {
    const { key, path, id } = data;
    const manager = createManager();
    manager.getStat(key).then(
      data => {
        const files = fileStore.get("files");
        const serverUpdateTime = Math.round(data.putTime / 10000);
        // 1ms = 10000 ns
        const localUpdateTime = files[id].updatedAt;
        if (serverUpdateTime > localUpdateTime || !localUpdateTime) {
          manager.downloadFile(key, path).then(() => {
            mainWindow.webContents.send("file-downloaded", {
              status: "download-success",
              id
            });
          });
        } else {
          mainWindow.webContents.send("file-downloaded", {
            status: "no-new-file",
            id
          });
        }
      },
      err => {
        if (err.statusCode === 612) {
          mainWindow.webContents.send(
            "file-downloaded",
            { status: "no-file" },
            id
          );
        }
      }
    );
  });
  ipcMain.on("upload-all-to-qiniu", () => {
    mainWindow.webContents.send("loading-status", true);
    const filesObj = fileStore.get("files") || {};
    const uploadPromiseArr = Object.keys(filesObj).map(id => {
      const file = filesObj[id];
      const manager = createManager();
      return manager.uploadFile(`${file.title}.md`, file.path);
    });
    Promise.all(uploadPromiseArr)
      .then(arr => {
        dialog.showMessageBox({
          type: "info",
          title: `成功上传了${arr.length}个文件`,
          message: `成功上传了${arr.length}个文件`
        });
        mainWindow.webContents.send("files-uploaded");
      })
      .catch(err => {
        console.log(err);
        dialog.showErrorBox("上传失败", "上传失败");
      })
      .finally(() => {
        mainWindow.webContents.send("loading-status", false);
      });
  });
}
app.on("ready", createWindow);
