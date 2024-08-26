import React, { Component } from "react";
import browser from "webextension-polyfill";
import log from "loglevel";
import SpeakerIcon from "../icons/speaker.svg";
import "../styles/ListenButton.scss";
import { LOCAL_TTS_SERVER } from "../../common/local_tts_server";
import {
  getAudioFromCache,
  setAudioInCache,
  playAudioFromCache,
} from "../../common/audioCache";

const logDir = "popup/AudioButton";

export default class ListenButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      voiceLang: props.initialVoiceLang || "en",
      audioCache: new Map(),
    };
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
  }

  updateVoiceLang = (e) => {
    this.setState({ voiceLang: e.voiceLang });
  };

  componentDidMount() {
    if (this.isContentScript()) {
      browser.runtime.onMessage.addListener(this.handleMessage);
    }
  }

  componentWillUnmount() {
    if (this.isContentScript()) {
      browser.runtime.onMessage.removeListener(this.handleMessage);
    }
  }

  isContentScript() {
    return typeof window !== "undefined" && window.document;
  }

  handleMessage = (message) => {
    if (message.action == "VoiceLanguage") {
      this.updateVoiceLang(message);
    }
  };

  playAudio = async (text, lang) => {
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

  playAudioInBackground = async (text, lang) => {
    const cachedAudio = await getAudioFromCache(text, lang);

    if (cachedAudio) {
      await playAudioFromCache(cachedAudio);
      return;
    }

    const url = `https://translate.google.com/translate_tts?client=tw-ob&q=${encodeURIComponent(
      text
    )}&tl=${lang}`;

    try {
      const response = await fetch(url);
      const audioData = await response.arrayBuffer();

      await setAudioInCache(text, lang, audioData);
      await playAudioFromCache(audioData);
    } catch (error) {
      // console.debug("Error playing audio in playAudioInBackground:", error);
    }
  };

  playAudioInBackgroundOrigin = async (text, lang) => {
    const cachedAudio = await getAudioFromCache(text, lang);

    if (cachedAudio) {
      await playAudioFromCache(cachedAudio);
      return;
    }

    const url = `${LOCAL_TTS_SERVER}/translate_tts?text=${encodeURIComponent(
      text
    )}&lang=${lang}`;

    try {
      // console.debug("Generated Google TTS URL:", url);
      const response = await fetch(url);
      const audioData = await response.arrayBuffer();

      await setAudioInCache(text, lang, audioData);
      await playAudioFromCache(audioData);
    } catch (error) {
      console.debug(
        "Error playing audio in playAudioInBackgroundOrigin:",
        error
      );
    }
  };

  playAudioBuffer = (audioBuffer) => {
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(this.audioContext.destination);
    sourceNode.start(0);
  };

  getPageLanguage = () => {
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

  ListenTTS = async (services = "origin", text, lang) => {
    const { tts } = services;
    if (tts == "google") {
      await this.playAudio(text, lang);
      // console.debug("Playing audio:", text);
    } else if (tts == "background") {
      // console.debug("Playing audio in background:", text);
      await this.playAudioInBackground(text, lang);
    } else {
      // console.debug("Playing audio in origin:", tts, text, lang);
      const currentPageLanguage = lang;
      this.playAudioInBackgroundOrigin(text, currentPageLanguage);
    }
  };

  handleClick = () => {
    const { text, lang, inPanel } = this.props;
    const { voiceLang } = this.state;

    // Skip TTS for short phrases in the popup panel to improve performance
    if (inPanel && text.split(/\s+/).length > 5) {
      console.info(
        "Simple Translate+ Tip: Use sentences with 5+ words in popup panel for optimal performance."
      );
      return;
    }

    browser.runtime.sendMessage({
      action: "listen",
      message: "listen",
      text: text,
      sourceLang: voiceLang,
    });

    // Uncomment one of these lines to use the local caching mechanism
    // this.ListenTTS("origin", text, voiceLang);
    // this.ListenTTS("background", text, voiceLang);
  };

  render() {
    const { text, lang, inPanel } = this.props;
    const { voiceLang } = this.state;
    const canListen = text && text.length < 200;
    if (!canListen) return null;

    return (
      <button
        className="listenButton"
        onClick={this.handleClick}
        title={`${browser.i18n.getMessage("listenLabel")} ${voiceLang} ${text}`}
        style={inPanel ? { marginRight: "5px", marginTop: "2px" } : {}}
        lang={lang}
      >
        <SpeakerIcon />
      </button>
    );
  }
}
