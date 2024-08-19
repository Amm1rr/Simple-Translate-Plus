import browserInfo from "browser-info";

const browserName = browserInfo().name;
const suffix = browserName === "Chrome" ? "fc" : "";
export const email = `amir.khani2810${suffix}@gmail.com`;
// export const paypalLink = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&no_shipping=1&business=m.khani2810@gmail.com&item_name=Simple Translate Plus for ${browserName} - Donation`;
export const paypalLink = `https://www.paypal.com/donate/?hosted_button_id=TKAXW2BR35PAA`;
export const patreonLink = "https://www.patreon.com/Simple_Tranlate_Plus/";
export const chromeExtensionUrl = `https://chrome.google.com/webstore/detail/ibplnjkanclpjokhdolnendpplpjiace`;
export const firefoxAddonUrl = `https://addons.mozilla.org/firefox/addon/simple-translate/`;
