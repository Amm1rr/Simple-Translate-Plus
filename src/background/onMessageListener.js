// src/background/onMessageListener.js

import browser from "webextension-polyfill";
import log from "loglevel";
import { initSettings } from "src/settings/settings";
import translate from "src/common/translate";
import {
  playAudioWithCaching,
  stopCurrentlyPlayingAudio,
} from "../common/audioUtils";

const logDir = "background/onMessageListener";

export default async (data, sender, sendResponse) => {
  log.debug(logDir, "Received message", data);

  try {
    await initSettings();
    log.debug(logDir, "Settings initialized");

    switch (data.message) {
      case "translate": {
        log.debug(logDir, "Translating:", data.text);
        try {
          const result = await translate(
            data.text,
            data.sourceLang,
            data.targetLang
          );
          log.debug(logDir, "Translation result:", result);
          return result;
        } catch (error) {
          log.error(logDir, "Translation error:", error);
          return {
            isError: true,
            errorMessage: "Translation failed: " + error.message,
          };
        }
      }
      case "playAudio": {
        log.debug(
          logDir,
          "Playing audio:",
          data.text,
          "in language:",
          data.sourceLang,
          "forcePlay:",
          data.forcePlay
        );
        try {
          stopCurrentlyPlayingAudio(); // Stop any currently playing audio
          const audio = await playAudioWithCaching(
            data.text,
            data.sourceLang,
            data.forcePlay
          );
          sendResponse({ success: !!audio });
        } catch (error) {
          log.error(logDir, "Error playing audio:", error);
          sendResponse({ success: false, error: error.message });
        }
        return true; // Keep the message channel open for the asynchronous response
      }
      case "VoiceLanguage": {
        log.debug(
          logDir,
          "VoiceLanguage request received for language:",
          data.sourceLang
        );
        if (sender.tab) {
          log.debug(logDir, "Sending message to tab:", sender.tab.id);
          browser.tabs
            .sendMessage(sender.tab.id, {
              action: "voiceLang",
              data: data.sourceLang,
            })
            .then(() => {
              log.debug(logDir, "Message sent successfully to tab");
            })
            .catch((error) => {
              log.error(logDir, "Error sending message to tab:", error);
            });
        } else {
          log.error(logDir, "Sender tab not found");
        }
        sendResponse({ success: true });
        return true;
      }
      default:
        log.debug(logDir, "Unhandled message type:", data.message);
        sendResponse({ success: false, error: "Unhandled message type" });
        return true;
    }
  } catch (error) {
    log.error(logDir, "Error in onMessageListener:", error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
};
