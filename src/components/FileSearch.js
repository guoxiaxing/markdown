import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faTimes } from "@fortawesome/free-solid-svg-icons";
import useIpcRenderer from "../hooks/useIpcRenderer";
import useKeyPress from "../hooks/useKeyPress";
import PropTypes from "prop-types";

const FileSearch = ({ title, onFileSearch }) => {
  const [inputActive, setInputActive] = useState(false);
  const [value, setValue] = useState("");
  const enterKeyhPressed = useKeyPress(13);
  const escKeyPressed = useKeyPress(27);
  let node = useRef(null);
  const closeSearch = () => {
    setInputActive(false);
    setValue("");
    onFileSearch("");
  };
  useEffect(() => {
    if (enterKeyhPressed && inputActive) {
      // 按下回车键
      onFileSearch(value);
    } else if (escKeyPressed && inputActive) {
      // 按下esc键
      closeSearch();
    }
  });
  const startSearch = () => {
    setInputActive(true);
  };
  useEffect(() => {
    if (inputActive) {
      node.current.focus();
    }
  }, [inputActive]);
  useIpcRenderer({
    "search-file": startSearch
  });
  return (
    <div className="alert alert-primary d-flex justify-content-between align-items-center mb-0">
      {!inputActive && (
        <>
          <span>{title}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setInputActive(true)}
          >
            <FontAwesomeIcon icon={faSearch} title="搜索" size="lg" />
          </button>
        </>
      )}
      {inputActive && (
        <>
          <input
            type="text"
            value={value}
            onChange={event => setValue(event.target.value)}
            className="form-control"
            ref={node}
          />
          <button type="button" className="icon-button" onClick={closeSearch}>
            <FontAwesomeIcon icon={faTimes} title="关闭" size="lg" />
          </button>
        </>
      )}
    </div>
  );
};
FileSearch.propTypes = {
  title: PropTypes.string,
  onFileSearch: PropTypes.func.isRequired
};

FileSearch.defaultProps = {
  title: "我的云文档"
};

export default FileSearch;
