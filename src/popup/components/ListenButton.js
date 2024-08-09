import React from "react";
import browser from "webextension-polyfill";
import log from "loglevel";
import SpeakerIcon from "../icons/speaker.svg";
import "../styles/ListenButton.scss";

const logDir = "popup/AudioButton";

const playAudio = async (text, lang) => {
  const url = `https://translate.google.com/translate_tts?client=tw-ob&q=${encodeURIComponent(
    text
  )}&tl=${lang}`;
  const audio = new Audio(url);
  audio.crossOrigin = "anonymous";
  audio.load();

  await browser.permissions.request({
    origins: ["https://translate.google.com/*"],
  });

  await audio.play().catch((e) => log.error(logDir, "playAudio()", e, url));
};

export const playAudioInBackground = async (text, lang) => {
  const url = `https://translate.google.com/translate_tts?client=tw-ob&q=${encodeURIComponent(
    text
  )}&tl=${lang}`;

  try {
    const response = await fetch(url);
    const audioData = await response.arrayBuffer();

    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(audioData);

    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);
    sourceNode.start(0);
  } catch (error) {
    console.debug("Error playing audio in BACK:", error);
  }
};

export const playAudioOrigin = async (text, lang) => {
  const baseUrl = "https://translate.google.com/translate_tts";
  const params = new URLSearchParams({
    client: "tw-ob",
    q: text,
    tl: lang,
  });
  const googleTtsUrl = `${baseUrl}?${params}`;
  const url = `https://api.allorigins.win/get?url=${encodeURIComponent(
    googleTtsUrl
  )}`;

  console.log("Generated Google TTS URL:", googleTtsUrl);
  console.log("Encoded URL for AllOrigins:", url);

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log("Full response:", data);

    if (data.contents && data.contents.startsWith("data:audio/mpeg;base64,")) {
      console.log("Audio data found, processing...");

      const base64Data = data.contents.split(",")[1];
      console.log("Base64 audio data:", base64Data);

      const audioData = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const uintArray = new Uint8Array(arrayBuffer);

      for (let i = 0; i < audioData.length; i++) {
        uintArray[i] = audioData.charCodeAt(i);
      }

      console.log("Decoded audio data to Uint8Array:", uintArray);

      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      console.log("Decoded audio buffer:", audioBuffer);

      const sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioContext.destination);
      sourceNode.start(0);

      console.log("Audio playback started");
    } else {
      console.error("No valid audio data found in the response");
    }
  } catch (error) {
    console.error("Error playing audio:", error);
  }
};

export const ListenTTS = async (services = "origin", text, lang) => {
  const { tts } = services;
  if (tts == "google") {
    await playAudio(text, lang);
  } else if (tts == "background") {
    await playAudioInBackground(text, lang);
  } else {
    await playAudioOrigin(text, lang);
    // const result = await browser.runtime.sendMessage({
    //   message: "listen",
    //   text: text,
    //   sourceLang: "en",
    //   targetLang: "fa",
    // });
  }
};

export default (props) => {
  const { text, lang } = props;
  const canListen = text && text.length < 200;
  if (!canListen) return null;

  return (
    <button
      className="listenButton"
      onClick={() => ListenTTS("origin", text, lang)}
      title={browser.i18n.getMessage("listenLabel")}
    >
      <SpeakerIcon />
    </button>
  );
};
