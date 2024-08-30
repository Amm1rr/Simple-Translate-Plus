import browser from "webextension-polyfill";
import log from "loglevel";
import { initSettings, handleSettingsChange } from "src/settings/settings";
import { updateLogLevel, overWriteLogLevel } from "src/common/log";
import {
  getAudioFromCache,
  setAudioInCache,
  playAudioFromCache,
} from "../common/audioCache";
import onInstalledListener from "./onInstalledListener";
import {
  showMenus,
  onMenusShownListener,
  onMenusClickedListener,
} from "./menus";
import { onCommandListener } from "./keyboardShortcuts";
import onMessageListener from "./onMessageListener";

const logDir = "background/background";

browser.runtime.onInstalled.addListener(onInstalledListener);
browser.commands.onCommand.addListener(onCommandListener);
browser.runtime.onMessage.addListener(onMessageListener);
browser.storage.local.onChanged.addListener((changes) => {
  handleSettingsChange(changes);
  updateLogLevel();
  showMenus();
});

if (!!browser.contextMenus?.onShown)
  browser.contextMenus.onShown.addListener(onMenusShownListener);
browser.contextMenus.onClicked.addListener(onMenusClickedListener);

// Set-Cookie > SameSite=Strict|Lax|None
if (browser.webNavigation) {
  browser.webNavigation.onCompleted.addListener(function (details) {
    browser.tabs.executeScript({
      code: `
        document.head.insertAdjacentHTML('beforeend', '<meta http-equiv="Set-Cookie" content="SameSite=None;Secure">');
      `,
    });
  });
}

export async function fetchAndListen(
  text,
  sourceLang = "en",
  forcePlay = false
) {
  log.debug(logDir, "fetchAndListen called", { text, sourceLang, forcePlay });
  try {
    sourceLang = sourceLang === "auto" ? "en" : sourceLang;

    const cachedAudio = await getAudioFromCache(text, sourceLang);
    if (cachedAudio) {
      log.debug(logDir, "Using cached audio");
      return playAudioFromCache(cachedAudio);
    }

    if (!forcePlay) {
      log.debug(logDir, "Not forced to play, skipping fetch");
      return;
    }

    log.debug(logDir, "Fetching audio");
    await fetchAndPlayAudio(text, sourceLang);
  } catch (error) {
    log.error(logDir, "fetchAndListen error:", error);
  }
}

const init = async () => {
  try {
    await Promise.all([initSettings(), overWriteLogLevel(), updateLogLevel()]);
    log.info(logDir, "Initialization complete");
    showMenus();
  } catch (error) {
    log.error(logDir, "Initialization failed:", error);
  }
};

init();
