// src/content/index.js

import React from "react";
import ReactDOM from "react-dom";
import browser from "webextension-polyfill";
import log from "loglevel";
import {
  initSettings,
  getSettings,
  handleSettingsChange,
} from "src/settings/settings";
import { updateLogLevel, overWriteLogLevel } from "src/common/log";
import TranslateContainer from "./components/TranslateContainer";

const logDir = "content/index";

// Suppress lifecycle warnings
React.useLayoutEffect = React.useEffect;

const init = async () => {
  log.debug(logDir, "Initializing");
  await initSettings();
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  browser.storage.local.onChanged.addListener(handleSettingsChange);
  browser.runtime.onMessage.addListener(handleMessage);
  overWriteLogLevel();
  updateLogLevel();
  disableExtensionByUrlList();
  log.debug(logDir, "Initialization complete");
};
init();

let prevSelectedText = "";
const handleMouseUp = async (e) => {
  log.debug(logDir, "Mouse up event", e);
  await waitTime(10);

  const isLeftClick = e.button === 0;
  if (!isLeftClick) {
    log.debug(logDir, "Not a left click, returning");
    return;
  }

  const isInPasswordField =
    e.target.tagName === "INPUT" && e.target.type === "password";
  if (isInPasswordField) {
    log.debug(logDir, "In password field, returning");
    return;
  }

  const inCodeElement =
    e.target.tagName === "CODE" ||
    (!!e.target.closest && !!e.target.closest("code"));
  if (inCodeElement && getSettings("isDisabledInCodeElement")) {
    log.debug(logDir, "In code element and disabled, returning");
    return;
  }

  const isInThisElement =
    document.querySelector("#simple-translate-plus") &&
    document.querySelector("#simple-translate-plus").contains(e.target);
  if (isInThisElement) {
    log.debug(logDir, "In this element, returning");
    return;
  }

  removeTranslatecontainer();

  const ignoredDocumentLang = getSettings("ignoredDocumentLang")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => !!s);
  if (ignoredDocumentLang.length) {
    const ignoredLangSelector = ignoredDocumentLang
      .map((lang) => `[lang="${lang}"]`)
      .join(",");
    if (!!e.target.closest && !!e.target.closest(ignoredLangSelector)) {
      log.debug(logDir, "In ignored language element, returning");
      return;
    }
  }

  const selectedText = getSelectedText();
  prevSelectedText = selectedText;
  if (selectedText.length === 0) {
    log.debug(logDir, "No text selected, returning");
    return;
  }

  if (getSettings("isDisabledInTextFields")) {
    if (isInContentEditable()) {
      log.debug(logDir, "In content editable and disabled, returning");
      return;
    }
  }

  if (getSettings("ifOnlyTranslateWhenModifierKeyPressed")) {
    const modifierKey = getSettings("modifierKey");
    switch (modifierKey) {
      case "shift":
        if (!e.shiftKey) {
          log.debug(logDir, "Shift key not pressed, returning");
          return;
        }
        break;
      case "alt":
        if (!e.altKey) {
          log.debug(logDir, "Alt key not pressed, returning");
          return;
        }
        break;
      case "ctrl":
        if (!e.ctrlKey) {
          log.debug(logDir, "Ctrl key not pressed, returning");
          return;
        }
        break;
      case "cmd":
        if (!e.metaKey) {
          log.debug(logDir, "Cmd key not pressed, returning");
          return;
        }
        break;
      default:
        break;
    }
  }

  const clickedPosition = { x: e.clientX, y: e.clientY };
  const selectedPosition = getSelectedPosition();
  log.debug(logDir, "Showing translate container", {
    selectedText,
    selectedPosition,
    clickedPosition,
  });
  showTranslateContainer(selectedText, selectedPosition, clickedPosition);
};

const waitTime = (time) => {
  return new Promise((resolve) => setTimeout(() => resolve(), time));
};

const getSelectedText = () => {
  log.debug(logDir, "Getting selected text");
  const element = document.activeElement;
  const isInTextField =
    element.tagName === "INPUT" || element.tagName === "TEXTAREA";
  const selectedText = isInTextField
    ? element.value.substring(element.selectionStart, element.selectionEnd)
    : window.getSelection()?.toString() ?? "";
  log.debug(logDir, "Selected text", selectedText);
  return selectedText;
};

const getSelectedPosition = () => {
  log.debug(logDir, "Getting selected position");
  const element = document.activeElement;
  const isInTextField =
    element.tagName === "INPUT" || element.tagName === "TEXTAREA";
  const selectedRect = isInTextField
    ? element.getBoundingClientRect()
    : window.getSelection().getRangeAt(0).getBoundingClientRect();

  let selectedPosition;
  const panelReferencePoint = getSettings("panelReferencePoint");
  switch (panelReferencePoint) {
    case "topSelectedText":
      selectedPosition = {
        x: selectedRect.left + selectedRect.width / 2,
        y: selectedRect.top,
      };
      break;
    case "bottomSelectedText":
    default:
      selectedPosition = {
        x: selectedRect.left + selectedRect.width / 2,
        y: selectedRect.bottom,
      };
      break;
  }
  log.debug(logDir, "Selected position", selectedPosition);
  return selectedPosition;
};

const isInContentEditable = () => {
  log.debug(logDir, "Checking if in content editable");
  const element = document.activeElement;
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA")
    return true;
  if (element.contentEditable === "true") return true;
  return false;
};

const handleKeyDown = (e) => {
  log.debug(logDir, "Key down event", e);
  if (e.key === "Escape") {
    removeTranslatecontainer();
  }
};

const handleVisibilityChange = () => {
  log.debug(logDir, "Visibility change", document.visibilityState);
  if (document.visibilityState === "hidden") {
    browser.storage.local.onChanged.removeListener(handleSettingsChange);
  } else {
    browser.storage.local.onChanged.addListener(handleSettingsChange);
  }
};

let isEnabled = true;
const handleMessage = async (request) => {
  log.debug(logDir, "Handling message", request);
  const empty = new Promise((resolve) => {
    setTimeout(() => {
      return resolve("");
    }, 100);
  });

  switch (request.message) {
    case "getTabUrl":
      if (!isEnabled) return empty;
      if (window == window.parent) return location.href;
      else return empty;
    case "getSelectedText":
      if (!isEnabled) return empty;
      if (prevSelectedText.length === 0) return empty;
      else return prevSelectedText;
    case "translateSelectedText": {
      if (!isEnabled) return empty;
      const selectedText = getSelectedText();
      if (selectedText.length === 0) return;
      const selectedPosition = getSelectedPosition();
      removeTranslatecontainer();
      showTranslateContainer(selectedText, selectedPosition, null, true);
      break;
    }
    case "getEnabled":
      return isEnabled;
    case "enableExtension":
      isEnabled = true;
      break;
    case "disableExtension":
      removeTranslatecontainer();
      isEnabled = false;
      break;
    case "playAudio":
      if (!isEnabled) return empty;
      log.debug(logDir, "Received playAudio message, forwarding to background");
      browser.runtime.sendMessage(request).catch((error) => {
        log.error(logDir, "Error forwarding playAudio message:", error);
      });
      break;
    default:
      return empty;
  }
};

const disableExtensionByUrlList = () => {
  log.debug(logDir, "Disabling extension by URL list");
  const disableUrls = getSettings("disableUrlList").split("\n");
  let pageUrl;
  try {
    pageUrl = top.location.href;
  } catch (e) {
    pageUrl = document.referrer;
  }

  const matchesPageUrl = (urlPattern) => {
    const pattern = urlPattern
      .trim()
      .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, (match) =>
        match === "*" ? ".*" : "\\" + match
      );
    if (pattern === "") return false;
    return RegExp("^" + pattern + "$").test(pageUrl);
  };

  const isMatched = disableUrls.some(matchesPageUrl);
  if (isMatched) isEnabled = false;
  log.debug(logDir, "Extension enabled", isEnabled);
};

const removeTranslatecontainer = async () => {
  log.debug(logDir, "Removing translate container");
  const element = document.getElementById("simple-translate-plus");
  if (!element) return;

  ReactDOM.unmountComponentAtNode(element);
  element.parentNode.removeChild(element);
};

const showTranslateContainer = (
  selectedText,
  selectedPosition,
  clickedPosition = null,
  shouldTranslate = false
) => {
  log.debug(logDir, "Showing translate container", {
    selectedText,
    selectedPosition,
    clickedPosition,
    shouldTranslate,
  });
  const element = document.getElementById("simple-translate-plus");
  if (element) return;
  if (!isEnabled) return;

  const themeClass = "simple-translate-" + getSettings("theme") + "-theme";

  const container = document.createElement("div");
  container.id = "simple-translate-plus";
  container.className = themeClass;
  document.body.appendChild(container);

  ReactDOM.render(
    <TranslateContainer
      removeContainer={removeTranslatecontainer}
      selectedText={selectedText}
      selectedPosition={selectedPosition}
      clickedPosition={clickedPosition}
      shouldTranslate={shouldTranslate}
    />,
    document.getElementById("simple-translate-plus")
  );
};
