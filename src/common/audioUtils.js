// src/common/audioUtils.js

import log from "loglevel";
import { getSettings } from "src/settings/settings";
import {
  getAudioFromCache,
  setAudioInCache,
  playAudioFromCache,
} from "./audioCache";

const logDir = "common/audioUtils";

let currentlyPlayingAudio = null;

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
    currentlyPlayingAudio = await playAudioFromCache(audioBlob);
    return currentlyPlayingAudio;
  } catch (error) {
    if (error.message.includes("status: 400")) {
      log.info(
        logDir,
        "Received a 400 error. This might be due to an invalid request or unsupported language."
      );
    } else {
      log.error(logDir, "Error fetching or playing audio:", error);
    }
    throw error;
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

    if (currentlyPlayingAudio) {
      log.debug(logDir, "Stopping currently playing audio");
      currentlyPlayingAudio.pause();
      currentlyPlayingAudio = null;
    }

    const cachedAudio = await getAudioFromCache(text, sourceLang);
    if (cachedAudio) {
      log.debug(logDir, "Using cached audio");
      currentlyPlayingAudio = await playAudioFromCache(cachedAudio);
      return currentlyPlayingAudio;
    }

    if (!forcePlay && !getSettings("ifautoPlayListen")) {
      log.debug(
        logDir,
        "Not forced to play and autoplay is disabled, skipping fetch"
      );
      return null;
    }

    log.debug(logDir, "Fetching audio");
    currentlyPlayingAudio = await fetchAndPlayAudioFromGoogle(text, sourceLang);
    return currentlyPlayingAudio;
  } catch (error) {
    log.error(logDir, "playAudioWithCaching error:", error);
    return null;
  }
};

// This function can be used to stop any currently playing audio
export const stopCurrentlyPlayingAudio = () => {
  if (currentlyPlayingAudio) {
    currentlyPlayingAudio.pause();
    currentlyPlayingAudio = null;
    log.debug(logDir, "Stopped currently playing audio");
  }
};
