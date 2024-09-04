// src/background/background.js

import browser from "webextension-polyfill";
import log from "loglevel";
import { initSettings, handleSettingsChange } from "src/settings/settings";
import { updateLogLevel, overWriteLogLevel } from "src/common/log";
import onInstalledListener from "./onInstalledListener";
import {
  showMenus,
  onMenusShownListener,
  onMenusClickedListener,
} from "./menus";
import { onCommandListener } from "./keyboardShortcuts";
import onMessageListener from "./onMessageListener";

const logDir = "background/background";

const init = async () => {
  try {
    await Promise.all([initSettings(), overWriteLogLevel(), updateLogLevel()]);
    log.info(logDir, "Initialization complete");
    await showMenus();
  } catch (error) {
    log.error(logDir, "Initialization failed:", error);
  }
};

browser.runtime.onInstalled.addListener(onInstalledListener);
browser.commands.onCommand.addListener(onCommandListener);
browser.runtime.onMessage.addListener(onMessageListener);
browser.storage.local.onChanged.addListener((changes) => {
  const newSettings = handleSettingsChange(changes);
  if (newSettings) {
    log.debug(logDir, "Settings changed:", newSettings);
    updateLogLevel();
    showMenus();
  }
});

if (browser.contextMenus?.onShown) {
  browser.contextMenus.onShown.addListener(onMenusShownListener);
}
browser.contextMenus.onClicked.addListener(onMenusClickedListener);

init();
