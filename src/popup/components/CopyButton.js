import React, { useState, useEffect } from "react";
import browser from "webextension-polyfill";
import log from "loglevel";
import { CopyToClipboard } from "react-copy-to-clipboard";
import CopyIcon from "../icons/copy.svg";
import "../styles/CopyButton.scss";

const logDir = "popup/CopyButton";

const CopyButton = ({ text }) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    log.debug(logDir, "Text changed, resetting copied state", { text });
    setIsCopied(false);
  }, [text]);

  const handleCopy = (copiedText) => {
    log.debug(logDir, "Copying text to clipboard", { copiedText });
    navigator.clipboard.writeText(copiedText);
    setIsCopied(true);
  };

  if (!text) {
    log.debug(logDir, "No text to copy, not rendering button");
    return null;
  }

  return (
    <div className="copy">
      {isCopied && (
        <span className="copiedText">
          {browser.i18n.getMessage("copiedLabel")}
        </span>
      )}
      <CopyToClipboard text={text} onCopy={handleCopy}>
        <button
          className="copyButton"
          title={browser.i18n.getMessage("copyLabel")}
        >
          <CopyIcon />
        </button>
      </CopyToClipboard>
    </div>
  );
};

export default CopyButton;
