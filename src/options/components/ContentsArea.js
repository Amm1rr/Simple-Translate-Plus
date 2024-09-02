// src/options/components/ContentsArea.js

import React from "react";
import { Routes, Route } from "react-router-dom";
import browserInfo from "browser-info";
import log from "loglevel";
import SettingsPage from "./SettingsPage";
import KeyboardShortcutsPage from "./KeyboardShortcutsPage";
import InformationPage from "./InformationPage";
import "../styles/ContentsArea.scss";

const logDir = "options/ContentsArea";

const isValidShortcuts =
  browserInfo().name === "Firefox" && browserInfo().version >= 60;

log.debug(logDir, "Browser info:", browserInfo());
log.debug(logDir, "Is valid for shortcuts:", isValidShortcuts);

const ContentsArea = () => {
  log.debug(logDir, "Rendering ContentsArea");

  return (
    <div className="contentsArea">
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        {isValidShortcuts && (
          <Route path="/shortcuts" element={<KeyboardShortcutsPage />} />
        )}
        <Route path="/information" element={<InformationPage />} />
        <Route path="*" element={<SettingsPage />} />
      </Routes>
    </div>
  );
};

export default ContentsArea;
