import browser from "webextension-polyfill";
import browserInfo from "browser-info";
import log from "loglevel";
import { getSettings } from "src/settings/settings";

const logDir = "background/menus";

export const showMenus = () => {
  log.info(logDir, "Checking if menu should be shown...");
  if (getSettings("ifShowMenu")) {
    removeMenus();
    createMenus();
    log.info(logDir, "Menus created successfully.");
  } else {
    removeMenus();
    log.info(logDir, "Menus removed as per settings.");
  }
};

export const onMenusShownListener = (info, tab) => {
  log.info(
    `${logDir}: onMenusShownListener called with context:`,
    info.contexts
  );
  if (info.contexts.includes("selection") || info.contexts.includes("link")) {
    browser.contextMenus.update("translatePage", { visible: false });
  } else {
    browser.contextMenus.update("translatePage", { visible: true });
  }
  browser.contextMenus
    .refresh()
    .catch((error) =>
      log.error(`${logDir}: Error refreshing context menus`, error)
    );
};

export const onMenusClickedListener = (info, tab) => {
  log.info(
    `${logDir}: onMenusClickedListener called with menuItemId:`,
    info.menuItemId
  );
  switch (info.menuItemId) {
    case "translatePage":
    case "translatePageOnTab":
      translatePage(info, tab);
      break;
    case "translateText":
      // Check if tab.id is valid
      if (!tab || !tab.id) {
        log.error(`${logDir}: Invalid tab info provided for translateText`);
        return;
      }
      translateText(tab);
      break;
    case "translateLink":
      translateLink(info, tab);
      break;
  }
};

function createMenus() {
  const isValidContextsTypeTab =
    browserInfo().name === "Firefox" && browserInfo().version >= 53;
  if (isValidContextsTypeTab) {
    browser.contextMenus.create({
      id: "translatePageOnTab",
      title: browser.i18n.getMessage("translatePageMenu"),
      contexts: ["tab"],
    });
  }

  browser.contextMenus.create({
    id: "translatePage",
    title: browser.i18n.getMessage("translatePageMenu"),
    contexts: ["all"],
    visible: true,
  });

  browser.contextMenus.create({
    id: "translateText",
    title: browser.i18n.getMessage("translateTextMenu"),
    contexts: ["selection"],
  });

  browser.contextMenus.create({
    id: "translateLink",
    title: browser.i18n.getMessage("translateLinkMenu"),
    contexts: ["link"],
  });
}

function removeMenus() {
  browser.contextMenus.removeAll();
}

function translateText(tab) {
  log.info(
    `${logDir}: Requesting translation for selected text in tab:`,
    tab.id
  );
  browser.tabs
    .get(tab.id)
    .then(() => {
      browser.tabs
        .sendMessage(tab.id, {
          message: "translateSelectedText",
        })
        .catch((error) =>
          log.error(`${logDir}: Error sending message to tab`, error)
        );
    })
    .catch((error) => log.error(`${logDir}: Tab is not accessible`, error));
}

function translatePage(info, tab) {
  const targetLang = getSettings("targetLang");
  const encodedPageUrl = encodeURIComponent(info.pageUrl);
  const translationUrl = `https://translate.google.com/translate?hl=${targetLang}&tl=${targetLang}&sl=auto&u=${encodedPageUrl}`;
  const isCurrentTab = getSettings("pageTranslationOpenTo") === "currentTab";

  if (isCurrentTab) {
    browser.tabs.update(tab.id, {
      url: translationUrl,
    });
  } else {
    browser.tabs.create({
      url: translationUrl,
      active: true,
      index: tab.index + 1,
    });
  }
}

function translateLink(info, tab) {
  const targetLang = getSettings("targetLang");
  const encodedLinkUrl = encodeURIComponent(info.linkUrl);
  const translationUrl = `https://translate.google.com/translate?hl=${targetLang}&tl=${targetLang}&sl=auto&u=${encodedLinkUrl}`;

  browser.tabs.create({
    url: translationUrl,
    active: true,
    index: tab.index + 1,
  });
}
