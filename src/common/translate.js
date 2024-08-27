import browser from "webextension-polyfill";
import log from "loglevel";
import { getSettings } from "src/settings/settings";
// import ListenButton from "../popup/components/ListenButton";
import {
  getAudioFromCache,
  setAudioInCache,
  playAudioFromCache,
} from "./audioCache";

const logDir = "common/translate";

const getHistory = async (
  sourceWord,
  sourceLang,
  targetLang,
  translationApi
) => {
  const result = await browser.storage.session.get(
    `${sourceLang}-${targetLang}-${translationApi}-${sourceWord}`
  );
  return (
    result[`${sourceLang}-${targetLang}-${translationApi}-${sourceWord}`] ??
    false
  );
};

const setHistory = async (
  sourceWord,
  sourceLang,
  targetLang,
  translationApi,
  result
) => {
  if (result.isError) return;
  await browser.storage.session.set({
    [`${sourceLang}-${targetLang}-${translationApi}-${sourceWord}`]: result,
  });
};

const autoplayPronunciation = async (word, sourceLang, listen) => {
  let autoPlay;
  if (listen == true) {
    autoPlay = true;
  } else if (listen === false) {
    autoPlay = false;
  } else {
    autoPlay = getSettings("ifautoPlayListen");
  }

  // containsMoreThanTwoSpaces checks if a sentence contains more than two spaces.
  if (word.split(" ").length > 2) {
    autoPlay = false;
  }

  if (autoPlay == true) {
    log.log(logDir, "autoPlayListen() ON : ", word);

    // browser.runtime.sendMessage({
    //   action: "listen",
    //   message: "listen",
    //   text: word,
    //   sourceLang: sourceLang,
    // });

    if (sourceLang == "auto") {
      sourceLang = "en";
    }

    const cachedAudio = await getAudioFromCache(word, sourceLang);

    if (cachedAudio) {
      // console.log("Play cached audio");
      await playAudioFromCache(cachedAudio);
      return;
    }

    const url = new URL("https://translate.google.com/translate_tts");
    url.searchParams.set("client", "tw-ob");
    url.searchParams.set("q", word);
    url.searchParams.set("tl", sourceLang);
    url.searchParams.set("samesite", "none");
    url.searchParams.set("secure", "");

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

      console.debug(
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
      console.error("The response is not an audio file.");
      return false;
    }

    const audioBlob = await response.blob();
    if (audioBlob.size === 0) {
      console.error("Received empty audio file.");
      return false;
    }
  }
};

const sendRequestToGoogle = async (word, sourceLang, targetLang, listen) => {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dt=bd&dj=1&q=${encodeURIComponent(
    word
  )}`;
  const response = await fetch(url).catch((e) => ({
    status: 0,
    statusText: "",
  }));

  const resultData = {
    resultText: "",
    candidateText: "",
    sourceLanguage: "",
    percentage: 0,
    isError: false,
    errorMessage: "",
  };

  if (response.status !== 200) {
    resultData.isError = true;

    if (response.status === 0)
      resultData.errorMessage = browser.i18n.getMessage("networkError");
    else if (response.status === 429 || response.status === 503)
      resultData.errorMessage = browser.i18n.getMessage("unavailableError");
    else
      resultData.errorMessage = `${browser.i18n.getMessage("unknownError")} [${
        response.status
      } ${response.statusText}]`;

    log.error(logDir, "sendRequest()", response);
    return resultData;
  }

  const result = await response.json();

  resultData.sourceLanguage = result.src;
  resultData.percentage = result.ld_result.srclangs_confidences[0];
  resultData.resultText = result.sentences
    .map((sentence) => sentence.trans)
    .join("");
  if (result.dict) {
    resultData.candidateText = result.dict
      .map(
        (dict) =>
          `${dict.pos}${dict.pos != "" ? ": " : ""}${
            dict.terms !== undefined ? dict.terms.join(", ") : ""
          }\n`
      )
      .join("");
  }

  await autoplayPronunciation(word, resultData.sourceLanguage, listen);

  // Send the language of text to the ListenButton component
  browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, {
        action: "VoiceLanguage",
        text: word,
        voiceLang: resultData.sourceLanguage,
      });
    }
  });

  log.log(logDir, "sendRequest()", resultData);

  return resultData;
};

const sendRequestToDeepL = async (word, sourceLang, targetLang) => {
  let params = new URLSearchParams();
  const authKey = getSettings("deeplAuthKey");
  params.append("auth_key", authKey);
  params.append("text", word);
  params.append("target_lang", targetLang);
  const url =
    getSettings("deeplPlan") === "deeplFree"
      ? "https://api-free.deepl.com/v2/translate"
      : "https://api.deepl.com/v2/translate";

  const response = await fetch(url, {
    method: "POST",
    body: params,
  }).catch((e) => ({ status: 0, statusText: "" }));

  const resultData = {
    resultText: "",
    candidateText: "",
    sourceLanguage: "",
    percentage: 0,
    isError: false,
    errorMessage: "",
  };

  if (response.status !== 200) {
    resultData.isError = true;

    if (response.status === 0)
      resultData.errorMessage = browser.i18n.getMessage("networkError");
    else if (response.status === 403)
      resultData.errorMessage = browser.i18n.getMessage("deeplAuthError");
    else
      resultData.errorMessage = `${browser.i18n.getMessage("unknownError")} [${
        response.status
      } ${response.statusText}]`;

    log.error(logDir, "sendRequestToDeepL()", response);
    return resultData;
  }

  const result = await response.json();

  resultData.resultText = result.translations[0].text;
  resultData.sourceLanguage =
    result.translations[0].detected_source_language.toLowerCase();
  resultData.percentage = 1;

  log.log(logDir, "sendRequestToDeepL()", resultData);
  return resultData;
};

export default async (sourceWord, sourceLang = "auto", targetLang, listen) => {
  log.log(logDir, "translate()", sourceWord, targetLang);
  sourceWord = sourceWord.trim();
  if (sourceWord === "")
    return {
      resultText: "",
      candidateText: "",
      sourceLanguage: "en",
      percentage: 0,
      statusText: "OK",
    };

  const translationApi = getSettings("translationApi");

  const cachedResult = await getHistory(
    sourceWord,
    sourceLang,
    targetLang,
    translationApi
  );
  if (cachedResult) return cachedResult;

  const result =
    translationApi === "google"
      ? await sendRequestToGoogle(sourceWord, sourceLang, targetLang, listen)
      : await sendRequestToDeepL(sourceWord, sourceLang, targetLang);
  setHistory(sourceWord, sourceLang, targetLang, translationApi, result);
  return result;
};
