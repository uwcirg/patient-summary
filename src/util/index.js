import dayjs from "dayjs";
import ChartConfig from "../config/chart_config";
import { DEFAULT_TOOLBAR_HEIGHT, QUESTIONNAIRE_ANCHOR_ID_PREFIX, queryNeedPatientBanner } from "../consts";
import defaultSections from "../config/sections_config";

export const shortDateRE = /^\d{4}-\d{2}-\d{2}$/; // matches '2012-04-05'
export const dateREZ =
  /^(?:(?:19|20)\d{2}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|02-(?:0[1-9]|1\d|2[0-8]))|(?:(?:19|20)(?:[02468][048]|[13579][26])-02-29))T([01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/; //match '2023-11-10T18:30:49Z' with required UTC

/*
 * return Date object for a given input date string
 * @params input date string to be converted
 */
export function getDateObjectInLocalDateTime(input) {
  if (!input) return null;
  if (shortDateRE.test(input)) {
    // If input is in short ISO date (YYYY-MM-DD), appending "T00:00:00" to allow correct conversion to local date/time
    return new Date(input + "T00:00:00");
  }
  if (dateREZ.test(input)) {
    // If input is already a full ISO 8601 timestamp, pass it as-is
    // a date string with a Z designator will result in a local date/time when passed to Date object
    return new Date(input);
  }
  return new Date(input);
}

export function getCorrectedISODate(dateString) {
  if (!dateString || dateString instanceof Date) return dateString;
  let correctedDate = getDateObjectInLocalDateTime(dateString);
  return correctedDate.toISOString().split("T")[0]; // just the date portion
}

export function getDisplayQTitle(questionnaireId) {
  if (!questionnaireId) return "";
  return String(questionnaireId.replace(/cirg-/gi, "")).toUpperCase();
}

export function isValidDate(date) {
  return date && Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date);
}

export function getChartConfig(questionnaireId) {
  const qChartConfig = ChartConfig[questionnaireId.toLowerCase()];
  if (qChartConfig) return { ...ChartConfig["default"], ...qChartConfig };
  const matchItems = Object.values(ChartConfig);
  const matchConfig = matchItems.find((item) => {
    if (!item.keys || isEmptyArray(item.keys)) return false;
    const arrMatches = item.keys.map((key) => key.toLowerCase());
    return arrMatches.indexOf(questionnaireId.toLowerCase()) !== -1;
  });
  if (matchConfig) return { ...ChartConfig["default"], ...matchConfig };
  return ChartConfig["default"];
}

export function getEnvQuestionnaireList() {
  const configList = getEnv("REACT_APP_QUESTIONNAIRES");
  if (configList)
    return configList
      .split(",")
      .filter((item) => item)
      .map((item) => item.trim());
  return [];
}

export function getSectionsToShow() {
  const configSections = getEnv("REACT_APP_SECTIONS");
  if (!configSections) return defaultSections;
  let sectionsToShow = [];
  const targetSections = configSections.split(",").map((item) => {
    item = item.toLowerCase();
    return item;
  });
  defaultSections.forEach((section) => {
    if (targetSections.indexOf(section.id.toLowerCase()) !== -1) sectionsToShow.push(section);
  });
  return sectionsToShow;
}
export function imageOK(img) {
  if (!img) {
    return false;
  }
  if (!img.getAttribute("src")) {
    return false;
  }
  if (!img.complete) {
    return false;
  }
  if (typeof img.naturalWidth !== "undefined" && img.naturalWidth === 0) {
    return false;
  }
  return true;
}

export function injectFaviconByProject() {
  let faviconEl = document.querySelector("link[rel*='icon']");
  if (!faviconEl) return;
  const projectId = getEnv("REACT_APP_PROJECT_ID");
  if (!projectId) return;
  faviconEl.href = `/assets/${projectId}/img/favicon.ico`;
}

export function isInViewport(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function hasData(arrObj) {
  return !isEmptyArray(arrObj);
}

export function getTomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export function callback(callbackFunc, params) {
  if (!callbackFunc || typeof callbackFunc !== "function") return;
  callbackFunc(params);
}

export function fetchEnvData() {
  if (window && window["appConfig"] && !isEmptyArray(Object.keys(window["appConfig"]))) {
    console.log("Window config variables added. ");
    return;
  }
  const setConfig = function (envObj) {
    if (!envObj) return;
    if (!window) return;
    window["appConfig"] = {};
    //assign window process env variables for access by app
    //won't be overridden when Node initializing env variables
    for (var key in envObj) {
      if (!window["appConfig"][key]) {
        window["appConfig"][key] = envObj[key];
      }
    }
    console.log("environment variables set ", window["appConfig"]);
  };
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/env.json", false);
  xhr.onreadystatechange = function () {
    if (!xhr.readyState === xhr.DONE) {
      return;
    }
    if (xhr.status !== 200) {
      console.log("Request failed! ");
      return;
    }
    let envObj;
    if (xhr.readyState === xhr.DONE) {
      try {
        envObj = JSON.parse(xhr.responseText);
      } catch (e) {
        console.log("Error parsing response text into json ", e);
      }
    }
    setConfig(envObj);
  };
  try {
    xhr.send();
  } catch (e) {
    console.log("Request failed to send.  Error: ", e);
  }
  xhr.ontimeout = function (e) {
    // XMLHttpRequest timed out.
    console.log("request to fetch env.json file timed out ", e);
  };
}

export function getEnv(key) {
  //window application global variables
  if (window && window["appConfig"] && window["appConfig"][key]) return window["appConfig"][key];
  const envDefined = typeof import.meta.env !== "undefined" && import.meta.env;
  //enviroment variables as defined in Node
  if (envDefined && import.meta.env[key]) return import.meta.env[key];
  return "";
}

export function getEnvs() {
  const appConfig = window && window["appConfig"] ? window["appConfig"] : {};
  const processEnvs = typeof import.meta.env !== "undefined" && import.meta.env ? import.meta.env : {};
  return {
    ...appConfig,
    ...processEnvs,
  };
}

export function scrollToAnchor(anchorElementId) {
  const targetElement = document.querySelector(`#${QUESTIONNAIRE_ANCHOR_ID_PREFIX}_${anchorElementId}`);
  if (!targetElement) return;
  targetElement.scrollIntoView();
}

export function scrollToElement(elementId) {
  if (!elementId) return;
  const targetElement = document.querySelector(`#${elementId}`);
  if (!targetElement) return;
  targetElement.scrollIntoView();
}

export function range(start, end) {
  return new Array(end - start + 1).fill(undefined).map((_, i) => i + start);
}

/*
 * @param client is a SoF frontend client
 * return the state key property of the client
 */
export function getClientSessionKey(client) {
  if (!client) return null;
  return client.getState().key;
}

export function getEnvProjectId() {
  return getEnv("REACT_APP_PROJECT_ID");
}

export function getEnvSystemType() {
  return getEnv("REACT_APP_SYSTEM_TYPE");
}

export function getEnvDashboardURL() {
  return getEnv("REACT_APP_DASHBOARD_URL");
}

export function isNumber(target) {
  if (isNaN(target)) return false;
  if (typeof target === "number") return true;
  return target != null;
}

export function shouldShowPatientInfo(client) {
  // from query string
  if (sessionStorage.getItem(queryNeedPatientBanner) !== null) {
    return String(sessionStorage.getItem(queryNeedPatientBanner)) === "true";
  }
  // check token response,
  const tokenResponse = client ? client.getState("tokenResponse") : null;
  //check need_patient_banner launch context parameter
  if (tokenResponse && tokenResponse["need_patient_banner"]) return tokenResponse["need_patient_banner"];
  return String(getEnv("REACT_APP_DISABLE_HEADER")) !== "true";
}
export function shouldShowNav() {
  return String(getEnv("REACT_APP_DISABLE_NAV")) !== "true";
}
export function getAppHeight() {
  return `calc(100vh - ${DEFAULT_TOOLBAR_HEIGHT}px)`;
}
export function getUserId(client) {
  if (!client) return null;
  if (client.user && client.user.id) return client.user.id;
  const accessToken = parseJwt(client.getState("tokenResponse.access_token"));
  if (accessToken) return accessToken["preferred_username"];
  return null;
}
export function parseJwt(token) {
  if (!token) return null;
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(""),
  );
  return JSON.parse(jsonPayload);
}
export function addMamotoTracking(userId) {
  if (document.querySelector("#matomoScript")) return;
  const siteId = getEnv("REACT_APP_MATOMO_SITE_ID");
  // no site ID specified, not proceeding
  if (!siteId) return;
  window._paq = [];
  window._paq.push(["trackPageView"]);
  window._paq.push(["enableLinkTracking"]);
  window._paq.push(["setSiteId", siteId]);

  if (userId) {
    window._paq.push(["setUserId", userId]);
  }

  let u = "https://piwik.cirg.washington.edu/";
  window._paq.push(["setTrackerUrl", u + "matomo.php"]);
  let d = document,
    g = d.createElement("script"),
    headElement = document.querySelector("head");
  g.type = "text/javascript";
  g.async = true;
  g.defer = true;
  g.setAttribute("src", u + "matomo.js");
  g.setAttribute("id", "matomoScript");
  headElement.appendChild(g);
}

export function getLocaleDateStringFromDate(dateString, format) {
  if (!dateString) return "";
  const dateFormat = format ? format : "YYYY-MM-DD";
  if (!dayjs(dateString).isValid()) return dateString;
  return dayjs(dateString).format(dateFormat);
}

export function hasValue(value) {
  return value != null && value !== "" && typeof value !== "undefined";
}

export function isEmptyArray(o) {
  return !o || !Array.isArray(o) || !o.length;
}

export async function isImagefileExist(url) {
  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type");
    return response.ok && contentType && contentType.startsWith("image/"); // Returns true if status is 200-299
  } catch (error) {
    console.log(error);
    return false; // Request failed or URL is invalid
  }
}
