// src/options/components/OptionsPage.js

import React, { useEffect, useMemo, useCallback } from "react";
import browser from "webextension-polyfill";
import { HashRouter, Routes, Route } from "react-router-dom";
import log from "loglevel";
import {
  initSettings,
  getSettings,
  subscribeToSettingsChanges,
} from "../../settings/settings";
import SideBar from "./SideBar";
import ContentsArea from "./ContentsArea";
import ScrollToTop from "./ScrollToTop";
import "../styles/OptionsPage.scss";

const logDir = "options/OptionsPage";

const OptionsPage = () => {
  const optionsPageClassName = useMemo(() => {
    const UILanguage = browser.i18n.getUILanguage();
    const rtlLanguage = ["he", "ar"].includes(UILanguage);
    return "optionsPage" + (rtlLanguage ? " rtl-language" : "");
  }, []);

  const handleSettingsChange = useCallback((newSettings) => {
    log.debug(logDir, "Settings changed:", newSettings);
    const newTheme = newSettings.theme;
    document.body.className = `${newTheme}-theme`;
  }, []);

  useEffect(() => {
    const setupTheme = async () => {
      await initSettings();
      const theme = getSettings("theme");
      document.body.classList.add(`${theme}-theme`);

      const unsubscribe = subscribeToSettingsChanges(handleSettingsChange);
      return unsubscribe;
    };

    setupTheme();
  }, [handleSettingsChange]);

  return (
    <HashRouter>
      <ScrollToTop>
        <div className={optionsPageClassName}>
          <SideBar />
          <Routes>
            <Route path="/*" element={<ContentsArea />} />
          </Routes>
        </div>
      </ScrollToTop>
    </HashRouter>
  );
};

export default OptionsPage;
