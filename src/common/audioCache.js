// src/common/audioCache.js
import browser from "webextension-polyfill";
import log from "loglevel";

const logDir = "common/audioCache";
const AUDIO_CACHE_KEY = "SimpleTranslatePlusAudioCache";

const getAudioCache = async () => {
  log.debug(logDir, "Getting audio cache");
  const result = await browser.storage.local.get(AUDIO_CACHE_KEY);
  const cache = result[AUDIO_CACHE_KEY] || {};
  log.debug(logDir, "Audio cache retrieved", {
    cacheSize: Object.keys(cache).length,
  });
  return cache;
};

export const getAudioFromCache = async (text, lang) => {
  log.debug(logDir, "Retrieving audio from cache", { text, lang });
  const cache = await getAudioCache();
  const audioData = cache[`${text}-${lang}`];
  log.debug(
    logDir,
    audioData ? "Audio found in cache" : "Audio not found in cache"
  );
  return audioData;
};

export const setAudioInCache = async (text, lang, audioData) => {
  log.debug(logDir, "Setting audio in cache", { text, lang });
  const cache = await getAudioCache();
  cache[`${text}-${lang}`] = audioData;
  await browser.storage.local.set({ [AUDIO_CACHE_KEY]: cache });
  log.debug(logDir, "Audio set in cache");
};

export const clearAudioCache = async () => {
  log.debug(logDir, "Clearing audio cache");
  await browser.storage.local.remove(AUDIO_CACHE_KEY);
  log.debug(logDir, "Audio cache cleared");
};

export const playAudioFromCache = async (audioData) => {
  log.debug(logDir, "Playing audio from cache", {
    audioDataType: audioData.constructor.name,
  });
  try {
    if (audioData instanceof ArrayBuffer) {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      const sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioContext.destination);
      sourceNode.start(0);
      log.debug(logDir, "ArrayBuffer audio played successfully");
    } else if (audioData instanceof Blob) {
      const audioUrl = URL.createObjectURL(audioData);
      const audio = new Audio(audioUrl);
      await audio.play();
      URL.revokeObjectURL(audioUrl);
      log.debug(logDir, "Blob audio played successfully");
    } else {
      log.warn(logDir, "Unsupported audio data type", {
        type: audioData.constructor.name,
      });
    }
  } catch (error) {
    log.error(logDir, "Error playing audio", error);
  }
};
