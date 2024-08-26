import { initSettings } from "src/settings/settings";
import translate from "src/common/translate";
import { fetchAndListen } from "src/background/background";

export default async (data, sender, sendResponse) => {
  await initSettings();
  // console.debug("onMessageListener: ", data);
  switch (data.message) {
    case "translate": {
      return await translate(data.text, data.sourceLang, data.targetLang);
    }
    case "listen": {
      fetchAndListen(data.text, data.sourceLang);
      sendResponse({ success: true });
      return true;
    }
    case "VoiceLanguage": {
      if (sender.tab) {
        browser.tabs.sendMessage(sender.tab.Id, {
          action: "voiceLang",
          data: data.sourceLang,
        });
      } else {
        console.error("Sender tab not found");
      }
      sendResponse({ success: true });
      return true;
    }
    default:
      console.debug("onMessageListener -> [DEFAULT] ", data);
      sendResponse({ success: true });
      return true;
  }
};
