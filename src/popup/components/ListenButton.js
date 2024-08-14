import React from "react";
import browser from "webextension-polyfill";
import log from "loglevel";
import SpeakerIcon from "../icons/speaker.svg";
import "../styles/ListenButton.scss";
import { LOCAL_TTS_SERVER } from "../../common/local_tts_server";

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
    console.debug("Error playing audio in playAudioInBackground:", error);
  }
};

export const playAudioInBackgroundOrigin = async (text, lang) => {
  const url = `${LOCAL_TTS_SERVER}/translate_tts?text=${encodeURIComponent(
    text
  )}&lang=${lang}`;

  try {
    console.log("Generated Google TTS URL:", url);
    const response = await fetch(url);
    const audioData = await response.arrayBuffer();

    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(audioData);

    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioContext.destination);
    sourceNode.start(0);
  } catch (error) {
    console.debug("Error playing audio in playAudioInBackgroundOrigin:", error);
  }
};

export const getPageLanguage = () => {
  // Helper function to extract the base language code
  const getBaseLanguage = (lang) => {
    if (!lang) return "en"; // Default to English if no language is found
    return lang.split("-")[0].toLowerCase();
  };

  // Check if the language is specified in the HTML lang attribute
  const htmlLang = document.documentElement.lang;
  if (htmlLang) {
    return getBaseLanguage(htmlLang);
  }

  // Check if the language is specified in the meta tag
  const metaLang = document.querySelector('meta[name="language"]');
  if (metaLang && metaLang.content) {
    return getBaseLanguage(metaLang.content);
  }

  // Check the user's preferred language
  const userLang = navigator.language || navigator.userLanguage;
  if (userLang) {
    return getBaseLanguage(userLang);
  }

  // Default to English if no language is found
  return "en";
};

export const ListenTTS = async (services = "origin", text, lang) => {
  const { tts } = services;
  if (tts == "google") {
    await playAudio(text, lang);
    console.log("Playing audio : ", text);
  } else if (tts == "background") {
    console.log("Playing audio in background : ", text);
    await playAudioInBackground(text, lang);
  } else {
    console.log("Playing audio in origin : ", text, lang);

    const currentLanguage = getPageLanguage();

    playAudioInBackgroundOrigin(text, currentLanguage);
  }
};

export default (props) => {
  const { text, lang, inPanel } = props;
  const canListen = text && text.length < 200;
  if (!canListen) return null;

  return (
    <button
      className="listenButton"
      onClick={() => ListenTTS("origin", text, lang)}
      title={browser.i18n.getMessage("listenLabel")}
      style={inPanel ? { marginRight: "5px", marginTop: "2px" } : {}}
    >
      <SpeakerIcon />
    </button>
  );
};
