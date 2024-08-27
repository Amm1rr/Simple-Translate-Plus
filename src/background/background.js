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

export async function fetchAndListen(text, sourceLang = "en") {
  log.debug(logDir, "fetchAndListen called", { text, sourceLang });
  try {
    sourceLang = sourceLang === "auto" ? "en" : sourceLang;

    const cachedAudio = await getAudioFromCache(text, sourceLang);
    if (cachedAudio) {
      log.debug(logDir, "Using cached audio");
      return playAudioFromCache(cachedAudio);
    }

    const url = new URL("https://translate.google.com/translate_tts");
    url.searchParams.set("client", "tw-ob");
    url.searchParams.set("q", text);
    url.searchParams.set("tl", sourceLang);
    url.searchParams.set("samesite", "none");
    url.searchParams.set("secure", "");

    log.debug(logDir, "Fetching audio from URL", url.toString());
    const response = await fetch(url);

    if (!response.ok) {
      const errorMessages = {
        0: "networkError",
        400: "ttsLanguageUnavailable",
        429: "unavailableError",
        503: "unavailableError",
      };

      const errorKey = errorMessages[response.status] || "unknownError";
      const errorMessage = browser.i18n.getMessage(errorKey);

      log.warn(
        logDir,
        errorKey === "ttsLanguageUnavailable"
          ? `${errorMessage} (${
              sourceLang.charAt(0).toUpperCase() + sourceLang.slice(1)
            })`
          : `${errorMessage} [${response.status} ${response.statusText}]`
      );

      return false;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("audio/")) {
      log.error(logDir, "The response is not an audio file.");
      return false;
    }

    const audioBlob = await response.blob();
    if (audioBlob.size === 0) {
      log.error(logDir, "Received empty audio file.");
      return false;
    }

    log.debug(logDir, "Audio fetched successfully, caching and playing");
    await setAudioInCache(text, sourceLang, audioBlob);
    return playAudioFromCache(audioBlob);
  } catch (error) {
    log.error(logDir, "fetchAndListen error:", error);
    // Consider implementing user-friendly error handling here
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
