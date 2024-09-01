// src/common/audioUtils.js
import browser from "webextension-polyfill";
import log from "loglevel";
import { getSettings } from "src/settings/settings";
import {
  getAudioFromCache,
  setAudioInCache,
  playAudioFromCache,
} from "./audioCache";

const logDir = "common/audioUtils";

export const fetchAndPlayAudioFromGoogle = async (word, sourceLang) => {
  log.debug(logDir, "Fetching audio", { word, sourceLang });
  const url = new URL("https://translate.google.com/translate_tts");
  url.searchParams.set("client", "tw-ob");
  url.searchParams.set("q", word);
  url.searchParams.set("tl", sourceLang);
  url.searchParams.set("samesite", "none");
  url.searchParams.set("secure", "");

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("audio/")) {
      throw new Error("The response is not an audio file.");
    }

    const audioBlob = await response.blob();
    if (audioBlob.size === 0) {
      throw new Error("Received empty audio file.");
    }

    log.debug(logDir, "Audio fetched successfully, caching and playing");
    await setAudioInCache(word, sourceLang, audioBlob);
    playAudioFromCache(audioBlob); // Remove await here
  } catch (error) {
    if (error.message.includes("status: 400")) {
      console.info(
        "Received a 400 error. This might be due to an invalid request or unsupported language."
      );
    } else {
      log.error(logDir, "Error fetching or playing audio:", error);
    }
  }
};

export const playPronunciationIfEnabled = async (word, sourceLang, listen) => {
  log.debug(logDir, "playPronunciationIfEnabled called", {
    word,
    sourceLang,
    listen,
  });
  let autoPlay;
  if (listen === true) {
    autoPlay = true;
  } else if (listen === false) {
    autoPlay = false;
  } else {
    autoPlay = getSettings("ifautoPlayListen");
  }

  if (word.split(" ").length > 2) {
    autoPlay = false;
  }

  if (autoPlay === true) {
    if (sourceLang === "auto") {
      sourceLang = "en";
    }

    const cachedAudio = await getAudioFromCache(word, sourceLang);

    if (cachedAudio) {
      log.debug(logDir, "Playing cached audio");
      await playAudioFromCache(cachedAudio);
    } else {
      log.debug(logDir, "No cached audio found, fetching and playing");
      await fetchAndPlayAudioFromGoogle(word, sourceLang);
    }
  } else {
    log.debug(logDir, "Autoplay is disabled, skipping audio playback");
  }
};

export const playAudioWithCaching = async (
  text,
  sourceLang = "en",
  forcePlay = false
) => {
  log.debug(logDir, "playAudioWithCaching called", {
    text,
    sourceLang,
    forcePlay,
  });
  try {
    sourceLang = sourceLang === "auto" ? "en" : sourceLang;

    const cachedAudio = await getAudioFromCache(text, sourceLang);
    if (cachedAudio) {
      log.debug(logDir, "Using cached audio");
      return playAudioFromCache(cachedAudio);
    }

    if (!forcePlay) {
      log.debug(logDir, "Not forced to play, skipping fetch");
      return;
    }

    log.debug(logDir, "Fetching audio");
    await fetchAndPlayAudioFromGoogle(text, sourceLang);
  } catch (error) {
    log.error(logDir, "playAudioWithCaching error:", error);
  }
};
