import { initSettings } from "src/settings/settings";
import translate from "src/common/translate";
// import { ListenTTS } from "../popup/components/ListenButton";

export default async (data) => {
  await initSettings();
  switch (data.message) {
    case "translate": {
      console.log("onMessageListener -> TRANSLATE : ", data);
      return await translate(data.text, data.sourceLang, data.targetLang);
    }
    case "listen": {
      console.log("onMessageListener -> LISTEN : ", data);
      return await translate(data.text, data.sourceLang, data.targetLang, true);
      // return await ListenTTS("origin", data.text, data.sourceLang);
    }
    default:
      console.log("onMessageListener.js -> ", data);
  }
};
