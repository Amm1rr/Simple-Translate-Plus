import React from "react";
import browser from "webextension-polyfill";
import { Link, useLocation } from "react-router-dom";
import browserInfo from "browser-info";
import "../styles/SideBar.scss";
import log from "loglevel";

const logDir = "options/SideBar";

const isValidShortcuts =
  browserInfo().name === "Firefox" && browserInfo().version >= 60;

log.debug(logDir, "Browser info", {
  name: browserInfo().name,
  version: browserInfo().version,
  isValidShortcuts,
});

const SideBar = () => {
  const location = useLocation();

  log.debug(logDir, "Rendering SideBar", { pathname: location.pathname });

  return (
    <div className="sideBar">
      <div className="titleContainer">
        <img src="/icons/64.png" className="logo" alt="Logo" />
        <span className="logoTitle">Simple Translate+</span>
      </div>
      <ul>
        <li
          className={`sideBarItem ${
            ["/shortcuts", "/information"].every(
              (path) => path !== location.pathname
            )
              ? "selected"
              : ""
          }`}
        >
          <Link to="/settings">{browser.i18n.getMessage("settingsLabel")}</Link>
        </li>
        {isValidShortcuts && (
          <li
            className={`sideBarItem ${
              location.pathname === "/shortcuts" ? "selected" : ""
            }`}
          >
            <Link to="/shortcuts">
              {browser.i18n.getMessage("shortcutsLabel")}
            </Link>
          </li>
        )}
        <li
          className={`sideBarItem ${
            location.pathname === "/information" ? "selected" : ""
          }`}
        >
          <Link to="/information">
            {browser.i18n.getMessage("informationLabel")}
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default SideBar;
