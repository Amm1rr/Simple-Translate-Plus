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

export async function fetchAndListen(text, sourceLang = "en") {
  try {
    console.debug("fetchAndListen : ", sourceLang, text);
    if (sourceLang == "auto") {
      sourceLang = "en";
    }
    const url = `https://translate.google.com/translate_tts?client=tw-ob&q=${encodeURIComponent(
      text
    )}&tl=${sourceLang}&samesite=none;secure`;
    const response = await fetch(url);
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  } catch (error) {
    console.error("Error:", error);
  }
}

const init = async () => {
  await initSettings();
  overWriteLogLevel();
  updateLogLevel();
  log.info(logDir, "init()");
  showMenus();
};
init();
