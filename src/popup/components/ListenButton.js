import React, { Component } from "react";
import browser from "webextension-polyfill";
import log from "loglevel";
import SpeakerIcon from "../icons/speaker.svg";
import "../styles/ListenButton.scss";

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
