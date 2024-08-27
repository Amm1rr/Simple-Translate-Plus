import React, { Component } from "react";
import browser from "webextension-polyfill";
import log from "loglevel";
import SpeakerIcon from "../icons/speaker.svg";
import "../styles/ListenButton.scss";

const logDir = "popup/ListenButton";

export default class ListenButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      voiceLang: props.initialVoiceLang || "en",
      audioCache: new Map(),
    };
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    log.debug(logDir, "Constructor called", props);
  }

  updateVoiceLang = (e) => {
    log.debug(logDir, "Updating voice language", e.voiceLang);
    this.setState({ voiceLang: e.voiceLang });
  };

  componentDidMount() {
    log.debug(logDir, "Component mounted");
    if (this.isContentScript()) {
      browser.runtime.onMessage.addListener(this.handleMessage);
      log.debug(logDir, "Message listener added");
    }
  }

  componentWillUnmount() {
    log.debug(logDir, "Component will unmount");
    if (this.isContentScript()) {
      browser.runtime.onMessage.removeListener(this.handleMessage);
      log.debug(logDir, "Message listener removed");
    }
  }

  isContentScript() {
    const isContent = typeof window !== "undefined" && window.document;
    log.debug(logDir, "Is content script?", isContent);
    return isContent;
  }

  handleMessage = (message) => {
    log.debug(logDir, "Received message", message);
    if (message.action == "VoiceLanguage") {
      this.updateVoiceLang(message);
    }
  };

  getPageLanguage = () => {
    // ... (existing code)
    const lang = "en"; // Default value, replace with actual implementation
    log.debug(logDir, "Page language detected", lang);
    return lang;
  };

  handleClick = () => {
    const { text, lang, inPanel } = this.props;
    const { voiceLang } = this.state;
    log.debug(logDir, "Handle click", { text, lang, inPanel, voiceLang });

    // Skip TTS for short phrases in the popup panel to improve performance
    if (inPanel && text.split(/\s+/).length > 5) {
      log.debug(logDir, "Skipping TTS for short phrase in popup panel");
      console.info(
        "Simple Translate+ Tip: Use sentences with 5+ words in popup panel for optimal performance."
      );
      return;
    }

    log.debug(logDir, "Sending listen message");
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
    log.debug(logDir, "Rendering", {
      text,
      lang,
      inPanel,
      voiceLang,
      canListen,
    });

    if (!canListen) {
      log.debug(logDir, "Cannot listen, returning null");
      return null;
    }

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
