// src/options/components/OptionsPage.js
import React, { useEffect } from "react";
import browser from "webextension-polyfill";
import { HashRouter } from "react-router-dom";
import { initSettings, getSettings } from "../../settings/settings";
import SideBar from "./SideBar";
import ContentsArea from "./ContentsArea";
import ScrollToTop from "./ScrollToTop";
import "../styles/OptionsPage.scss";

const AUDIO_CACHE_KEY = "SimpleTranslatePlusAudioCache";

const setupTheme = async () => {
  await initSettings();
  const theme = getSettings("theme");
  document.body.classList.add(`${theme}-theme`);

  browser.storage.local.onChanged.addListener((changes) => {
    // Ignore changes to the audio cache
    if (AUDIO_CACHE_KEY in changes) return;

    if (
      changes.Settings &&
      changes.Settings.newValue &&
      changes.Settings.oldValue
    ) {
      const newTheme = changes.Settings.newValue.theme;
      const oldTheme = changes.Settings.oldValue.theme;

      if (newTheme && oldTheme && newTheme !== oldTheme) {
        document.body.classList.replace(
          `${oldTheme}-theme`,
          `${newTheme}-theme`
        );
      }
    }
  });
};

const UILanguage = browser.i18n.getUILanguage();
const rtlLanguage = ["he", "ar"].includes(UILanguage);
const optionsPageClassName =
  "optionsPage" + (rtlLanguage ? " rtl-language" : "");

const OptionsPage = () => {
  useEffect(() => {
    setupTheme();
  }, []);

  return (
    <HashRouter hashType="noslash">
      <ScrollToTop>
        <div className={optionsPageClassName}>
          <SideBar />
          <ContentsArea />
        </div>
      </ScrollToTop>
    </HashRouter>
  );
};

export default OptionsPage;
