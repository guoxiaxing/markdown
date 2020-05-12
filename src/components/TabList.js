import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import classnames from "classnames";
import PropTypes from "prop-types";
import "./TabList.scss";

const TabList = ({ files, activeId, unsaveIds, onTabClick, onCloseTab }) => {
  return (
    <ul className="nav nav-pills tablist-component">
      {files.map(file => {
        const withUnsavedMark = unsaveIds.includes(file.id);
        const fClassName = classnames({
          "nav-link": true,
          active: file.id === activeId,
          withUnsaved: withUnsavedMark
        });
        return (
          <li
            className="nav-item"
            key={file.id}
            onClick={e => {
              e.preventDefault();
              onTabClick(file.id);
            }}
          >
            <a className={fClassName} href="#">
              {file.title}
              <span
                className="ml-2 close-icon"
                onClick={e => {
                  e.preventDefault();
                  onCloseTab(file.id);
                  e.stopPropagation();
                }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </span>
              {withUnsavedMark && (
                <span className="rounded-circle unsaved-icon ml-2"></span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
};

TabList.propTypes = {
  files: PropTypes.array,
  activeId: PropTypes.string,
  unsaveIds: PropTypes.array,
  onTabClick: PropTypes.func,
  onCloseTab: PropTypes.func
};

TabList.defaultProps = {
  unsaveIds: []
};
export default TabList;
