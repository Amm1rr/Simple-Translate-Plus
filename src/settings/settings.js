// src/settings/settings.js

import browser from "webextension-polyfill";
import log from "loglevel";
import defaultSettings from "./defaultSettings";

const logDir = "settings/settings";
let currentSettings = {};

export const initSettings = async () => {
  const response = await browser.storage.local.get("Settings");
  currentSettings = response.Settings || {};
  let shouldSave = false;

  const pushSettings = (element) => {
    if (element.id == undefined || element.default == undefined) return;
    if (currentSettings[element.id] == undefined) {
      currentSettings[element.id] = element.default;
      shouldSave = true;
    }
  };

  const fetchDefaultSettings = () => {
    defaultSettings.forEach((category) => {
      category.elements.forEach((optionElement) => {
        pushSettings(optionElement);
        if (optionElement.childElements) {
          optionElement.childElements.forEach((childElement) => {
            pushSettings(childElement);
          });
        }
      });
    });
  };

  fetchDefaultSettings();
  if (shouldSave) {
    await browser.storage.local.set({ Settings: currentSettings });
    log.debug(logDir, "Initialized settings:", currentSettings);
  } else {
    log.debug(logDir, "Settings already initialized:", currentSettings);
  }
};

export const setSettings = async (id, value) => {
  log.info(logDir, "setSettings()", id, value);
  currentSettings[id] = value;
  await browser.storage.local.set({ Settings: currentSettings });
  notifySettingsChange();
};

export const getSettings = (id) => {
  return currentSettings[id];
};

export const getAllSettings = () => {
  return currentSettings;
};

export const resetAllSettings = async () => {
  log.info(logDir, "resetAllSettings()");
  currentSettings = {};
  await browser.storage.local.set({ Settings: currentSettings });
  await initSettings();
  notifySettingsChange();
};

export const handleSettingsChange = (changes) => {
  if (changes.Settings) {
    currentSettings = changes.Settings.newValue || {};
    log.debug(logDir, "Settings updated:", currentSettings);
    return currentSettings;
  }
  return null;
};

let settingsChangeListeners = [];

export const subscribeToSettingsChanges = (listener) => {
  settingsChangeListeners.push(listener);
  return () => {
    settingsChangeListeners = settingsChangeListeners.filter(
      (l) => l !== listener
    );
  };
};

const notifySettingsChange = () => {
  settingsChangeListeners.forEach((listener) => listener(currentSettings));
};

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.Settings) {
    const newSettings = handleSettingsChange(changes);
    if (newSettings) {
      notifySettingsChange();
    }
  }
});

export const exportSettings = async () => {
  const settingsIds = getSettingsIds();

  let settingsObj = {};
  for (const id of settingsIds) {
    settingsObj[id] = getSettings(id);
  }

  const downloadUrl = URL.createObjectURL(
    new Blob([JSON.stringify(settingsObj, null, "  ")], {
      type: "aplication/json",
    })
  );

  const a = document.createElement("a");
  document.body.appendChild(a);
  a.download = "SimpleTranslatePlus_Settings.json";
  a.href = downloadUrl;
  a.click();
  a.remove();
  URL.revokeObjectURL(downloadUrl);
};

export const importSettings = async (e) => {
  const reader = new FileReader();

  reader.onload = async () => {
    const importedSettings = JSON.parse(reader.result);
    const settingsIds = getSettingsIds();

    for (const id of settingsIds) {
      if (importedSettings[id] !== undefined)
        await setSettings(id, importedSettings[id]);
    }

    location.reload(true);
  };

  const file = e.target.files[0];
  reader.readAsText(file);
};

const getSettingsIds = () => {
  let settingsIds = [];
  defaultSettings.forEach((category) => {
    category.elements.forEach((optionElement) => {
      if (optionElement.id && optionElement.default !== undefined)
        settingsIds.push(optionElement.id);
      if (optionElement.childElements) {
        optionElement.childElements.forEach((childElement) => {
          if (childElement.id && childElement.default !== undefined)
            settingsIds.push(childElement.id);
        });
      }
    });
  });
  return settingsIds;
};
