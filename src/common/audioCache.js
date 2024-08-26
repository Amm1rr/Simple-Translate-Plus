// src/common/audioCache.js
import browser from "webextension-polyfill";

const AUDIO_CACHE_KEY = "SimpleTranslatePlusAudioCache";

const getAudioCache = async () => {
  const result = await browser.storage.local.get(AUDIO_CACHE_KEY);
  return result[AUDIO_CACHE_KEY] || {};
};

export const getAudioFromCache = async (text, lang) => {
  const cache = await getAudioCache();
  return cache[`${text}-${lang}`];
};

export const setAudioInCache = async (text, lang, audioData) => {
  const cache = await getAudioCache();
  cache[`${text}-${lang}`] = audioData;
  await browser.storage.local.set({ [AUDIO_CACHE_KEY]: cache });
};

export const clearAudioCache = async () => {
  await browser.storage.local.remove(AUDIO_CACHE_KEY);
};

export const playAudioFromCache = async (audioData) => {
  if (audioData instanceof ArrayBuffer) {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);
    sourceNode.start(0);
  } else if (audioData instanceof Blob) {
    const audioUrl = URL.createObjectURL(audioData);
    const audio = new Audio(audioUrl);
    await audio.play();
    URL.revokeObjectURL(audioUrl);
  }
};
