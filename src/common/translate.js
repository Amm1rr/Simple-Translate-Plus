import browser from "webextension-polyfill";
import log from "loglevel";
import { getSettings } from "src/settings/settings";

const logDir = "common/translate";

const getCacheKey = (sourceWord, sourceLang, targetLang, translationApi) => {
  return `${sourceLang}-${targetLang}-${translationApi}-${sourceWord}`;
};

const getHistory = async (
  sourceWord,
  sourceLang,
  targetLang,
  translationApi
) => {
  const cacheKey = getCacheKey(
    sourceWord,
    sourceLang,
    targetLang,
    translationApi
  );
  const result = await browser.storage.session.get(cacheKey);
  const cachedResult = result[cacheKey] || false;
  log.debug(
    logDir,
    "Checking cache for key:",
    cacheKey,
    "Result:",
    cachedResult
  );
  return cachedResult;
};

const setHistory = async (
  sourceWord,
  sourceLang,
  targetLang,
  translationApi,
  result
) => {
  if (result.isError) return;
  const cacheKey = getCacheKey(
    sourceWord,
    sourceLang,
    targetLang,
    translationApi
  );
  await browser.storage.session.set({ [cacheKey]: result });
  log.debug(logDir, "Set cache for key:", cacheKey);
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
    voiceLang: "",
  };

  if (response.status !== 200) {
    resultData.isError = true;

    if (response.status === 0)
      resultData.errorMessage = browser.i18n.getMessage("networkError");
    else if (response.status === 429 || response.status === 503)
      resultData.errorMessage = browser.i18n.getMessage("unavailableError");
    else if (response.status === 400)
      resultData.errorMessage = browser.i18n.getMessage(
        "ttsLanguageUnavailable"
      );
    else
      resultData.errorMessage = `${browser.i18n.getMessage("unknownError")} [${
        response.status
      } ${response.statusText}]`;

    log.error(logDir, "sendRequestToGoogle() error:", resultData.errorMessage);
    return resultData;
  }

  const result = await response.json();

  resultData.sourceLanguage = result.src;
  resultData.voiceLang = result.src;
  resultData.percentage = result.ld_result.srclangs_confidences[0];
  resultData.resultText = result.sentences
    .map((sentence) => sentence.trans)
    .join("");
  if (result.dict) {
    resultData.candidateText = result.dict
      .map(
        (dict) =>
          `${dict.pos}${dict.pos !== "" ? ": " : ""}${
            dict.terms !== undefined ? dict.terms.join(", ") : ""
          }\n`
      )
      .join("");
  }

  log.debug(logDir, "sendRequestToGoogle() result:", resultData);

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

const updateVoiceLanguage = async (word, sourceLang) => {
  log.debug(logDir, "Updating Voice Language:", sourceLang);

  browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, {
        action: "VoiceLanguage",
        text: word,
        voiceLang: sourceLang,
      });
    }
  });
};

export default async (sourceWord, sourceLang = "auto", targetLang, listen) => {
  log.debug(logDir, "translate()", {
    sourceWord,
    sourceLang,
    targetLang,
    listen,
  });
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
  if (cachedResult) {
    log.info(logDir, "Cached result found:", cachedResult);
    await updateVoiceLanguage(sourceWord, cachedResult.sourceLanguage);
    return cachedResult;
  }

  const result =
    translationApi === "google"
      ? await sendRequestToGoogle(sourceWord, sourceLang, targetLang, listen)
      : await sendRequestToDeepL(sourceWord, sourceLang, targetLang);

  result.voiceLang = result.sourceLanguage;

  await updateVoiceLanguage(sourceWord, result.sourceLanguage);
  setHistory(sourceWord, sourceLang, targetLang, translationApi, result);
  return result;
};
