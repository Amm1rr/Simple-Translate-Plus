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

export default (props) => {
  const { text, lang } = props;
  const canListen = text && text.length < 200;
  if (!canListen) return null;

  return (
    <button
      className="listenButton"
      onClick={() => playAudioInBackground(text, lang)}
      title={browser.i18n.getMessage("listenLabel")}
    >
      <SpeakerIcon />
    </button>
  );
};
