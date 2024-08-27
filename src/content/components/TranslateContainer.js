import React, { Component } from "react";
import browser from "webextension-polyfill";
import log from "loglevel";
import { getSettings } from "src/settings/settings";
import TranslateButton from "./TranslateButton";
import TranslatePanel from "./TranslatePanel";
import "../styles/TranslateContainer.scss";

const logDir = "content/TranslateContainer";

const translateText = async (text, targetLang = getSettings("targetLang")) => {
  log.debug(logDir, "Translating text", { text, targetLang });
  try {
    const result = await browser.runtime.sendMessage({
      message: "translate",
      text: text,
      sourceLang: "auto",
      targetLang: targetLang,
    });
    if (result.isError) {
      log.error(logDir, "Translation error:", result.errorMessage);
      return result;
    }
    log.debug(logDir, "Translation successful", result);
    return result;
  } catch (error) {
    log.error(logDir, "Error sending message:", error);
    return {
      isError: true,
      errorMessage: "Failed to send message to background script",
    };
  }
};

const detectLang = async (selectedText) => {
  log.debug(logDir, "Detecting language for", selectedText);
  const langInfo = await browser.i18n.detectLanguage(selectedText);
  log.debug(logDir, "Language detection result", langInfo);
  return langInfo.languages?.[0]?.language;
};

const matchesTargetLang = async (selectedText) => {
  log.debug(logDir, "Checking if text matches target language", selectedText);
  const targetLang = getSettings("targetLang");
  const langInfo = await browser.i18n.detectLanguage(selectedText);
  const matchsLangsByDetect =
    langInfo.isReliable && langInfo.languages[0].language === targetLang;
  if (matchsLangsByDetect) {
    log.debug(logDir, "Text matches target language by detection");
    return true;
  }

  const partSelectedText = selectedText.substring(0, 100);
  const result = await translateText(partSelectedText);
  if (result.isError) {
    log.warn(logDir, "Error in translation during language matching");
    return false;
  }

  const isNotText = result.percentage === 0;
  if (isNotText) {
    log.debug(logDir, "Text is not translatable");
    return true;
  }

  const matchsLangs =
    targetLang.split("-")[0] === result.sourceLanguage.split("-")[0];
  log.debug(logDir, "Language matching result", { matchsLangs });
  return matchsLangs;
};

export default class TranslateContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      shouldShowButton: false,
      buttonPosition: { x: 0, y: 0 },
      shouldShowPanel: false,
      panelPosition: { x: 0, y: 0 },
      currentLang: getSettings("targetLang"),
      resultText: "",
      candidateText: "",
      isError: false,
      errorMessage: "",
    };
    this.selectedText = props.selectedText;
    this.selectedPosition = props.selectedPosition;
    log.debug(logDir, "TranslateContainer constructed", {
      props: this.props,
      state: this.state,
    });
  }

  componentDidMount = () => {
    log.debug(logDir, "Component mounted", {
      shouldTranslate: this.props.shouldTranslate,
    });
    if (this.props.shouldTranslate) this.showPanel();
    else this.handleTextSelect(this.props.clickedPosition);
  };

  handleTextSelect = async (clickedPosition) => {
    log.debug(logDir, "Handling text select", { clickedPosition });
    const onSelectBehavior = getSettings("whenSelectText");
    if (onSelectBehavior === "dontShowButton") {
      log.debug(logDir, "Don't show button behavior, removing container");
      return this.props.removeContainer();
    }

    if (getSettings("ifCheckLang")) {
      const matchesLang = await matchesTargetLang(this.selectedText);
      if (matchesLang) {
        log.debug(logDir, "Text matches target language, removing container");
        return this.props.removeContainer();
      }
    }

    if (onSelectBehavior === "showButton") {
      log.debug(logDir, "Showing button");
      this.showButton(clickedPosition);
    } else if (onSelectBehavior === "showPanel") {
      log.debug(logDir, "Showing panel");
      this.showPanel(clickedPosition);
    }
  };

  showButton = (clickedPosition) => {
    log.debug(logDir, "Showing button", { clickedPosition });
    this.setState({ shouldShowButton: true, buttonPosition: clickedPosition });
  };

  hideButton = () => {
    log.debug(logDir, "Hiding button");
    this.setState({ shouldShowButton: false });
  };

  handleButtonClick = (e) => {
    log.debug(logDir, "Button clicked", {
      clientX: e.clientX,
      clientY: e.clientY,
    });
    const clickedPosition = { x: e.clientX, y: e.clientY };
    this.showPanel(clickedPosition);
    this.hideButton();
  };

  showPanel = async (clickedPosition = null) => {
    log.debug(logDir, "Showing panel", { clickedPosition });
    const panelReferencePoint = getSettings("panelReferencePoint");
    const useClickedPosition =
      panelReferencePoint === "clickedPoint" && clickedPosition !== null;
    const panelPosition = useClickedPosition
      ? clickedPosition
      : this.selectedPosition;

    let result = await translateText(this.selectedText);
    const targetLang = getSettings("targetLang");
    const secondLang = getSettings("secondTargetLang");
    const shouldSwitchSecondLang =
      getSettings("ifChangeSecondLangOnPage") &&
      result.sourceLanguage.split("-")[0] === targetLang.split("-")[0] &&
      result.percentage > 0 &&
      targetLang !== secondLang;

    if (shouldSwitchSecondLang) {
      log.debug(logDir, "Switching to second language", { secondLang });
      result = await translateText(this.selectedText, secondLang);
    }

    const LangDetect =
      (await detectLang(this.selectedText)) ||
      (shouldSwitchSecondLang ? secondLang : targetLang);

    log.debug(logDir, "Setting panel state", {
      panelPosition,
      resultText: result.resultText,
      isError: result.isError,
      currentLang: LangDetect,
    });

    this.setState({
      shouldShowPanel: true,
      panelPosition: panelPosition,
      resultText: result.resultText,
      candidateText: getSettings("ifShowCandidate") ? result.candidateText : "",
      isError: result.isError,
      errorMessage: result.errorMessage,
      currentLang: LangDetect,
    });
  };

  hidePanel = () => {
    log.debug(logDir, "Hiding panel");
    this.setState({ shouldShowPanel: false });
  };

  render = () => {
    log.debug(logDir, "Rendering TranslateContainer", { state: this.state });
    return (
      <div>
        <TranslateButton
          shouldShow={this.state.shouldShowButton}
          position={this.state.buttonPosition}
          handleButtonClick={this.handleButtonClick}
        />
        <TranslatePanel
          shouldShow={this.state.shouldShowPanel}
          position={this.state.panelPosition}
          selectedText={this.selectedText}
          currentLang={this.state.currentLang}
          resultText={this.state.resultText}
          candidateText={this.state.candidateText}
          isError={this.state.isError}
          errorMessage={this.state.errorMessage}
          hidePanel={this.hidePanel}
        />
      </div>
    );
  };
}
