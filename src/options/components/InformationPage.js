import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import queryString from "query-string";
import log from "loglevel";
import OptionsContainer from "./OptionContainer";
import {
  paypalLink,
  patreonLink,
  email,
  chromeExtensionUrl,
  firefoxAddonUrl,
} from "src/common/personalUrls";
import manifest from "src/manifest-chrome.json";

const logDir = "options/InformationPage";

const InformationPage = () => {
  const location = useLocation();
  const query = queryString.parse(location.search);
  const extensionVersion = manifest.version;

  const [sponsorsHeight, setSponsorsHeight] = useState(0);
  const [hasPermission, requestPermission] = useAdditionalPermission();

  useEffect(() => {
    log.debug(logDir, "InformationPage mounted");
    const setHeight = (e) => {
      if (e.data[0] !== "setSponsorsHeight") return;
      log.debug(logDir, "Setting sponsors height", e.data[1]);
      setSponsorsHeight(e.data[1]);
    };
    window.addEventListener("message", setHeight);
    return () => {
      log.debug(logDir, "InformationPage unmounted");
      window.removeEventListener("message", setHeight);
    };
  }, []);

  log.debug(logDir, "Rendering InformationPage", {
    query,
    extensionVersion,
    hasPermission,
  });

  return (
    <div>
      <p className="contentTitle">
        {browser.i18n.getMessage("informationLabel")}
      </p>
      <hr />
      <OptionsContainer
        title={"extName"}
        captions={[]}
        type={"none"}
        updated={query.action === "updated"}
        extraCaption={
          <p className="caption">
            <a
              href="https://github.com/amm1rr/simple-translate-plus/releases"
              target="_blank"
              rel="noopener noreferrer"
            >
              Version {extensionVersion}
            </a>
            <span>　</span>
            <a
              href="https://github.com/sienori/simple-translate/blob/master/BACKERS.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              {browser.i18n.getMessage("backersLabel")}
            </a>
          </p>
        }
      />

      <OptionsContainer
        title={"licenseLabel"}
        captions={["Mozilla Public License, Version. 2.0"]}
        useRawCaptions={true}
        type={"none"}
      />

      {!hasPermission && (
        <>
          <hr />
          <OptionsContainer
            title={"additionalPermissionLabel"}
            captions={["additionalPermissionCaptionLabel"]}
            type={"button"}
            value={"enableLabel"}
            onClick={requestPermission}
          />
        </>
      )}

      <hr />
      <OptionsContainer
        title={"donationLabel"}
        captions={["donationCaptionLabel"]}
        type={"none"}
      />
      <OptionsContainer
        title={""}
        captions={[""]}
        type={"none"}
        extraCaption={
          <div>
            <a href={patreonLink} target="_blank" rel="noopener noreferrer">
              <img
                src="/icons/patreonButton.png"
                alt="Patreon"
                style={{ height: 44, marginInlineEnd: 20 }}
              />
            </a>
            <a href={paypalLink} target="_blank" rel="noopener noreferrer">
              <img src="/icons/paypalButton.png" alt="Paypal" />
            </a>
          </div>
        }
      />
      <OptionsContainer
        title={""}
        captions={[]}
        type={"none"}
        extraCaption={
          <div>
            <p className="caption">
              <a
                className="amazonUrl"
                href={browser.i18n.getMessage("amazonUrl")}
                target="_blank"
                rel="noopener noreferrer"
              >
                {browser.i18n.getMessage("amazonTitleLabel")}
              </a>
            </p>
            <p className="caption">email: {email}</p>
          </div>
        }
      />
      <hr />
      <OptionsContainer
        title={"sponsorsLabel"}
        captions={[""]}
        type={"none"}
        extraCaption={
          <iframe
            src="https://simple-translate.sienori.com/sponsors.html"
            style={{ height: sponsorsHeight, marginTop: 10 }}
            title="Sponsors"
          />
        }
      />
      <hr />
      <OptionsContainer
        title={""}
        captions={[]}
        type={"none"}
        extraCaption={
          <div>
            <p>
              {browserInfo().name === "Chrome" ? (
                <a
                  href={chromeExtensionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {browser.i18n.getMessage("extensionPageLabel")}
                </a>
              ) : (
                <a
                  href={firefoxAddonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {browser.i18n.getMessage("addonPageLabel")}
                </a>
              )}
              <span>　</span>
              <a
                href="https://github.com/amm1rr/simple-translate-plus"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <span>　</span>
              <a
                href="https://simple-translate.sienori.com/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                {browser.i18n.getMessage("privacyPolicyLabel")}
              </a>
            </p>
          </div>
        }
      />
    </div>
  );
};

const useAdditionalPermission = () => {
  const [hasPermission, setHasPermission] = useState(true);

  const permissions = {
    origins: ["http://*/*", "https://*/*", "<all_urls>"],
  };

  const checkPermission = async () => {
    const hasPermission = await browser.permissions.contains(permissions);
    log.debug(logDir, "Checking additional permissions", { hasPermission });
    setHasPermission(hasPermission);
  };

  const requestPermission = async () => {
    log.debug(logDir, "Requesting additional permissions");
    await browser.permissions.request(permissions);
    checkPermission();
  };

  useEffect(() => {
    checkPermission();
  }, []);

  return [hasPermission, requestPermission];
};

export default InformationPage;
