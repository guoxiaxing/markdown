import React, { useState, useEffect } from "react";
import FileSearch from "./components/FileSearch";
import FileList from "./components/FileList";
import BottomBtn from "./components/BottomBtn";
import TabList from "./components/TabList";
import Loader from "./components/Loader";
import SimpleMDE from "react-simplemde-editor";
import uuid from "uuid/dist/v4";
import fileHelper from "./utils/fileHelper";
import useIpcRenderer from "./hooks/useIpcRenderer";
import { mapToArr, flattenArr, timestamp2Str } from "./utils/helper";
import "easymde/dist/easymde.min.css";
import { faPlus, faFileImport } from "@fortawesome/free-solid-svg-icons";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
const { join } = window.require("path");
const { remote, ipcRenderer } = window.require("electron");
const { basename, extname, dirname } = window.require("path");
const Store = window.require("electron-store");
const store = new Store({ name: "file-data" });
const settingsStore = new Store({ name: "Settings" });

const getAutoSync = () => {
  const qiniuIsConfiged = [
    "accessKey",
    "secretKey",
    "bucketName",
    "enableAutoSync"
  ].every(key => {
    return !!settingsStore.get(key);
  });
  return qiniuIsConfiged;
};
const saveFilesToStore = files => {
  const fileStoreObj = mapToArr(files).reduce((result, file) => {
    const { id, title, path, createdAt, isSync, updatedAt } = file;
    result[id] = { id, title, path, createdAt, isSync, updatedAt };
    return result;
  }, {});
  store.set("files", fileStoreObj);
};

function App() {
  const [files, setFiles] = useState(store.get("files") || {});
  const [activeFileID, setActiveFileID] = useState("");
  const [openedFileIDs, setOpenedFileIDs] = useState([]);
  const [unsavedFileIDs, setUnsavedFileIDs] = useState([]);
  const [searchedFiles, setSearchedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const filesArr = mapToArr(files);
  const openedFiles = openedFileIDs.map(id => files[id]);
  const activeFile = files[activeFileID];
  const fileListArr = searchedFiles.length ? searchedFiles : filesArr;
  const saveLocation = settingsStore.get("savedFileLocation")
    ? settingsStore.get("savedFileLocation")
    : remote.app.getPath("documents");
  const fileClick = fileId => {
    setActiveFileID(fileId);
    const currentFile = files[fileId];
    const { id, title, path, isLoaded } = currentFile;
    if (!currentFile.isLoaded) {
      if (getAutoSync()) {
        ipcRenderer.send("download-file", { key: `${title}.md`, path, id });
      } else {
        fileHelper.readFile(currentFile.path).then(data => {
          const newFile = { ...files[fileId], body: data, isLoaded: true };
          setFiles({ ...files, [fileId]: newFile });
        });
      }
    }
    if (!openedFileIDs.includes(fileId)) {
      setOpenedFileIDs([...openedFileIDs, fileId]);
    }
  };
  const tabClick = fileId => {
    setActiveFileID(fileId);
  };
  const tabClose = fileId => {
    const restTabs = openedFileIDs.filter(id => id !== fileId);
    setOpenedFileIDs(restTabs);
    if (restTabs.length) {
      setActiveFileID(restTabs[0]);
    } else {
      setActiveFileID("");
    }
  };
  const fileChange = (id, value) => {
    if (value !== files[id].body) {
      // 1.添加当前文件到为保存的文件中
      if (!unsavedFileIDs.includes(id)) {
        setUnsavedFileIDs([...unsavedFileIDs, id]);
      }

      // 2. 更新files数组中对应文件的内容
      const newFile = { ...files[id], body: value };
      setFiles({ ...files, [id]: newFile });
    }
  };
  const deleteFile = id => {
    if (files[id].isNew) {
      delete files[id];
      setFiles({ ...files });
    } else {
      fileHelper.deleteFile(files[id].path).then(() => {
        delete files[id];
        setFiles({ ...files });
        saveFilesToStore(files);
        // 假如文件已经在tabs中打开 我们需要关闭tab
        tabClose(id);
      });
    }
  };
  const updateFileName = (id, newTitle, isNew) => {
    const newPath = isNew
      ? join(saveLocation, `${newTitle}.md`)
      : join(dirname(files[id].path), `${newTitle}.md`);
    const newFile = {
      ...files[id],
      title: newTitle,
      isNew: false,
      path: newPath
    };
    const newFiles = { ...files, [id]: newFile };
    if (isNew) {
      fileHelper.writeFile(newPath, files[id].body).then(() => {
        setFiles(newFiles);
        saveFilesToStore(newFiles);
      });
    } else {
      const oldPath = files[id].path;
      console.log(oldPath, newPath);
      fileHelper.renameFile(oldPath, newPath).then(() => {
        setFiles(newFiles);
        saveFilesToStore(newFiles);
      });
    }
  };
  const searchFiles = keyword => {
    const result = filesArr.filter(file => file.title.includes(keyword));
    setSearchedFiles(result);
  };
  const createNewFile = () => {
    const newId = uuid();
    const newFile = {
      id: newId,
      title: "",
      body: "## 请输入 markdown 类型的文档",
      createdAt: Date.now(),
      isNew: true
    };
    setFiles({ ...files, [newId]: newFile });
  };

  const saveCurrentFile = () => {
    const { path, body, title } = activeFile;
    fileHelper.writeFile(path, body).then(() => {
      setUnsavedFileIDs(unsavedFileIDs.filter(id => id !== activeFile.id));
      if (getAutoSync()) {
        ipcRenderer.send("upload-file", { key: `${title}.md`, path });
      }
    });
  };

  const importFiles = () => {
    remote.dialog
      .showOpenDialog({
        title: "选择导入的 Markdown 文件",
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "Markdown", extensions: ["md"] }]
      })
      .then(({ filePaths }) => {
        if (Array.isArray(filePaths)) {
          const filteredPaths = filePaths.filter(path => {
            const added = Object.values(files).find(file => file.path === path);
            return !added;
          });
          const importFilesArr = filteredPaths.map(path => ({
            id: uuid(),
            path,
            title: basename(path, extname(path)),
            createdAt: Date.now()
          }));
          const newFiles = { ...files, ...flattenArr(importFilesArr) };
          setFiles(newFiles);
          saveFilesToStore(newFiles);
          if (importFilesArr.length) {
            remote.dialog.showMessageBox({
              type: "info",
              title: `成功导入了${importFilesArr.length}个文件`,
              message: `成功导入了${importFilesArr.length}个文件`
            });
          }
        }
      });
  };

  const activeFileUploaded = () => {
    const { id } = activeFile;
    const newFile = { ...files[id], isSync: true, updatedAt: Date.now() };
    const newFiles = { ...files, [id]: newFile };
    setFiles(newFiles);
    saveFilesToStore(newFiles);
  };

  const fileDownloaded = (event, data) => {
    const { status, id } = data;
    const currentFile = files[id];
    const { path } = currentFile;
    fileHelper.readFile(path).then(value => {
      let newFile;
      if (status === "download-success") {
        newFile = {
          ...files[id],
          body: value,
          isLoaded: true,
          isSync: true,
          updatedAt: Date.now()
        };
      } else {
        newFile = { ...files[id], body: value, isLoaded: true };
      }
      const newFiles = { ...files, [id]: newFile };
      setFiles(newFiles);
      saveFilesToStore(newFiles);
    });
  };
  const loadingStatus = (event, isLoading) => {
    console.log(isLoading);
    setIsLoading(isLoading);
  };

  const filesUploaded = () => {
    const newFiles = mapToArr(files).reduce((result, current) => {
      const currentTime = Date.now();
      const newFile = {
        ...current,
        isSync: true,
        updatedAt: currentTime
      };
      return { ...result, [current.id]: newFile };
    }, {});
    setFiles(newFiles);
    saveFilesToStore(newFiles);
  };

  useIpcRenderer({
    "create-new-file": createNewFile,
    "import-file": importFiles,
    "save-edit-file": saveCurrentFile,
    "active-file-uploaded": activeFileUploaded,
    "file-downloaded": fileDownloaded,
    "files-uploaded": filesUploaded,
    "loading-status": loadingStatus
  });
  return (
    <div className="App container-fluid px-0">
      {isLoading && <Loader />}
      <div className="row no-gutters">
        <div className="col-3  left-panel">
          <FileSearch title="My Doc" onFileSearch={searchFiles} />
          <FileList
            files={fileListArr}
            onFileClick={fileClick}
            onFileDelete={deleteFile}
            onSaveEdit={updateFileName}
          />
          <div className="row no-gutters button-group">
            <div className="col">
              <BottomBtn
                text="新建"
                icon={faPlus}
                colorClass="btn-primary"
                onBtnClick={createNewFile}
              />
            </div>
            <div className="col">
              <BottomBtn
                text="导入"
                icon={faFileImport}
                colorClass="btn-success"
                onBtnClick={importFiles}
              />
            </div>
          </div>
        </div>
        <div className="col-9 right-panel">
          {!activeFile && (
            <div className="start-page">选择或者创建新的 Markdown 文档</div>
          )}
          {activeFile && (
            <>
              <TabList
                files={openedFiles}
                onTabClick={tabClick}
                onCloseTab={tabClose}
                activeId={activeFileID}
                unsaveIds={unsavedFileIDs}
              />
              <SimpleMDE
                id="your-custom-id"
                key={activeFile && activeFile.id}
                onChange={value => fileChange(activeFile.id, value)}
                value={activeFile && activeFile.body}
                options={{
                  minHeight: "580px"
                }}
              />

              {activeFile.isSync && (
                <span className="sync-status">
                  已同步，上次同步时间 {timestamp2Str(activeFile.updatedAt)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
