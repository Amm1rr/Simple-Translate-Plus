import { initSettings } from "src/settings/settings";
import translate from "src/common/translate";
import log from "loglevel";
import browser from "webextension-polyfill";
import { fetchAndPlayAudioFromGoogle } from "../common/audioUtils";

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
      case "listen": {
        log.debug(
          logDir,
          "Listening to:",
          data.text,
          "in language:",
          data.sourceLang,
          "forcePlay:",
          data.forcePlay
        );
        fetchAndPlayAudioFromGoogle(data.text, data.sourceLang, data.forcePlay);
        sendResponse({ success: true });
        log.debug(logDir, "Listen response sent");
        return true;
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
        log.debug(logDir, "VoiceLanguage response sent");
        return true;
      }
      default:
        log.debug(logDir, "Unhandled message type:", data.message);
        sendResponse({ success: true });
        return true;
    }
  } catch (error) {
    log.error(logDir, "Error in onMessageListener:", error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
};
