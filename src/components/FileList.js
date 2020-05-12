import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { faMarkdown } from "@fortawesome/free-brands-svg-icons";
import { getParentNode } from "../utils/helper";
import useContextMenu from "../hooks/useContextMenu";
import useKeyPress from "../hooks/useKeyPress";
import PropTypes from "prop-types";
const FileList = ({ files, onFileClick, onSaveEdit, onFileDelete }) => {
  const [editStatus, setEditStatus] = useState(false);
  const [value, setValue] = useState("");
  const enterKeyhPressed = useKeyPress(13);
  const escKeyPressed = useKeyPress(27);
  const closeSearch = fileItem => {
    setEditStatus(false);
    setValue("");
    if (fileItem.isNew) {
      onFileDelete(fileItem.id);
    }
  };
  useEffect(() => {
    const fileItem = files.find(file => file.id === editStatus);
    if (enterKeyhPressed && editStatus && value.trim()) {
      // 按下回车键
      onSaveEdit(fileItem.id, value, fileItem.isNew);
      setEditStatus(false);
      setValue("");
    } else if (escKeyPressed && editStatus) {
      // 按下esc键
      closeSearch(fileItem);
    }
  });
  useEffect(() => {
    const newFile = files.find(file => file.isNew);
    if (newFile) {
      setEditStatus(newFile.id);
      setValue(newFile.title);
    }
  }, [files]);
  const clickItem = useContextMenu(
    [
      {
        label: "打开",
        click: () => {
          const parentNode = getParentNode(clickItem.current, "file-item");
          if (parentNode) {
            const fileId = parentNode.dataset.id;
            onFileClick(fileId);
          }
        }
      },
      {
        label: "重命名",
        click: () => {
          const parentNode = getParentNode(clickItem.current, "file-item");
          if (parentNode) {
            const fileId = parentNode.dataset.id;
            const title = parentNode.dataset.title;
            setEditStatus(fileId);
            setValue(title);
          }
        }
      },
      {
        label: "删除",
        click: () => {
          const parentNode = getParentNode(clickItem.current, "file-item");
          if (parentNode) {
            const fileId = parentNode.dataset.id;
            onFileDelete(fileId);
          }
        }
      }
    ],
    ".file-list",
    [files]
  );
  return (
    <ul className="list-group list-group-flush file-list">
      {files.map(file => (
        <li
          className="row list-group-item bg-light d-flex align-items-center file-item mx-0"
          key={file.id}
          data-id={file.id}
          data-title={file.title}
        >
          {file.id !== editStatus && !file.isNew && (
            <>
              <span className="col-2">
                <FontAwesomeIcon icon={faMarkdown} size="lg" />
              </span>
              <span
                className="col-6 c-link"
                onClick={() => {
                  onFileClick(file.id);
                }}
              >
                {file.title}
              </span>
            </>
          )}
          {(file.id === editStatus || file.isNew) && (
            <>
              <input
                type="text"
                value={value}
                placeholder="请输入正确的文件名称"
                onChange={event => setValue(event.target.value)}
                className="form-control col-10"
              />
              <button
                type="button"
                className="icon-button col-2"
                onClick={() => {
                  closeSearch(file);
                }}
              >
                <FontAwesomeIcon icon={faTimes} title="关闭" size="lg" />
              </button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
};

FileList.propsType = {
  files: PropTypes.array,
  onFileClick: PropTypes.func,
  onFileDelete: PropTypes.func,
  onSaveEdit: PropTypes.func
};
export default FileList;
