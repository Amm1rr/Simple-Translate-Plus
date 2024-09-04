import React, { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import log from "loglevel";
import { updateLogLevel, overWriteLogLevel } from "src/common/log";
import {
  initSettings,
  getAllSettings,
  resetAllSettings,
  exportSettings,
  importSettings,
  subscribeToSettingsChanges,
} from "src/settings/settings";
import defaultSettings from "src/settings/defaultSettings";
import CategoryContainer from "./CategoryContainer";

const logDir = "options/SettingsPage";

const SettingsPage = () => {
  const [isInit, setIsInit] = useState(false);
  const [currentValues, setCurrentValues] = useState({});

  useEffect(() => {
    const init = async () => {
      log.debug(logDir, "Initializing SettingsPage");
      await initSettings();
      overWriteLogLevel();
      updateLogLevel();
      setIsInit(true);
      const allSettings = getAllSettings();
      setCurrentValues(allSettings);
      log.debug(logDir, "Initial settings:", allSettings);

      const unsubscribe = subscribeToSettingsChanges((newSettings) => {
        log.debug(logDir, "Settings changed:", newSettings);
        setCurrentValues(newSettings);
      });

      return unsubscribe;
    };

    init();
  }, []);

  log.debug(logDir, "Rendering SettingsPage", { isInit, currentValues });

  if (!isInit) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <p className="contentTitle">{browser.i18n.getMessage("settingsLabel")}</p>
      <hr />
      <ul>
        {defaultSettings.map((category, index) => (
          <CategoryContainer
            {...category}
            key={index}
            currentValues={currentValues}
          />
        ))}
        <CategoryContainer
          {...additionalCategory}
          currentValues={currentValues}
        />
      </ul>
    </div>
  );
};

const additionalCategory = {
  category: "",
  elements: [
    {
      id: "importSettings",
      title: "importSettingsLabel",
      captions: ["importSettingsCaptionLabel"],
      type: "file",
      accept: ".json",
      value: "importButtonLabel",
      onChange: importSettings,
    },
    {
      id: "exportSettings",
      title: "exportSettingsLabel",
      captions: ["exportSettingsCaptionLabel"],
      type: "button",
      value: "exportButtonLabel",
      onClick: async () => {
        log.debug(logDir, "Exporting settings");
        await exportSettings();
      },
    },
    {
      id: "resetSettings",
      title: "resetSettingsLabel",
      captions: ["resetSettingsCaptionLabel"],
      type: "button",
      value: "resetSettingsButtonLabel",
      onClick: async () => {
        log.debug(logDir, "Resetting settings");
        await resetAllSettings();
        window.location.reload();
      },
    },
  ],
};

export default SettingsPage;
