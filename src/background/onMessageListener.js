import { initSettings } from "src/settings/settings";
import translate from "src/common/translate";
import { fetchAndListen } from "src/background/background";
// import { ListenTTS } from "../popup/components/ListenButton";

export default async (data) => {
  await initSettings();
  switch (data.message) {
    case "translate": {
      console.debug("onMessageListener -> TRANSLATE : ", data);
      return await translate(data.text, data.sourceLang, data.targetLang);
    }
    case "listen": {
      console.debug("onMessageListener -> LISTEN : ", data);
      fetchAndListen(data.text, data.sourceLang);
      // return await translate(data.text, data.sourceLang, data.targetLang, true);
      // return await ListenTTS("origin", data.text, data.sourceLang);
    }
    default:
      console.debug("onMessageListener -> [DEFAULT] ", data);
  }
};
