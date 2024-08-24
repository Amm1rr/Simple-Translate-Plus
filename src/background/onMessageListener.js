import { initSettings } from "src/settings/settings";
import translate from "src/common/translate";
import { fetchAndListen } from "src/background/background";
// import { ListenTTS } from "../popup/components/ListenButton";

export default async (data, sender, sendResponse) => {
  await initSettings();
  switch (data.message) {
    case "translate": {
      console.debug("onMessageListener -> TRANSLATE : ", data);
      return await translate(data.text, data.sourceLang, data.targetLang);
    }
    case "listen": {
      console.debug("onMessageListener -> LISTEN : ", data);
      fetchAndListen(data.text, data.sourceLang);
      sendResponse({ success: true });
      return true;
      // return await translate(data.text, data.sourceLang, data.targetLang, true);
      // return await ListenTTS("origin", data.text, data.sourceLang);
    }
    case "VoiceLanguage": {
      console.debug("onMessageListener -> VoiceLanguage : ", data);
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
