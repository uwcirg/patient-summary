import dayjs from "dayjs";
import ChartConfig from "../config/chart_config.js";
import {
  QUESTIONNAIRE_ANCHOR_ID_PREFIX,
  queryNeedPatientBanner,
} from "../consts/consts";
import commonLibrary from "../cql/InterventionLogic_Common.json";
import valueSetJson from "../cql/valueset-db.json";
import defaultSections from "../config/sections_config.js";
import { DEFAULT_TOOLBAR_HEIGHT } from "../consts/consts";

export function getCorrectedISODate(dateString) {
  if (!dateString || dateString instanceof Date) return dateString;
  let dateObj = new Date(dateString); // Date.now() returns [millisecods]
  let timeZoneCorrection = dateObj.getTimezoneOffset() * 60 * 1000; // [minutes] * [seconds/minutes] * [milliseconds/second]
  let correctedDate = new Date(dateObj.getTime() - timeZoneCorrection);
  return correctedDate.toISOString().split("T")[0]; // just the date portion
}

export async function getInterventionLogicLib(interventionId) {
  const DEFAULT_FILENAME = "InterventionLogicLibrary.json";
  let fileName = DEFAULT_FILENAME;
  if (interventionId) {
    // load questionnaire specific CQL
    fileName = `${interventionId.toUpperCase()}_InterventionLogicLibrary.json`;
  }
  const storageLib = sessionStorage.getItem(`lib_${fileName}`);
  let elmJson = storageLib ? JSON.parse(storageLib) : null;
  if (!elmJson) {
    try {
      elmJson = await import(`../cql/${fileName}`).then(
        (module) => module.default
      );
      if (interventionId && elmJson)
        sessionStorage.setItem(`lib_${fileName}`, JSON.stringify(elmJson));
    } catch (e) {
      elmJson = await import(`../cql/${DEFAULT_FILENAME}`).then(
        (module) => module.default
      );
      console.log("Error loading Cql ELM library " + e);
    }
  }
  return [elmJson, valueSetJson];
}

export function getDisplayQTitle(questionnaireId) {
  if (!questionnaireId) return "";
  return String(questionnaireId.replace(/cirg-/gi, "")).toUpperCase();
}

export function isValidDate(date) {
  return (
    date &&
    Object.prototype.toString.call(date) === "[object Date]" &&
    !isNaN(date)
  );
}

export function getChartConfig(questionnaireId) {
  const qChartConfig = ChartConfig[questionnaireId.toLowerCase()];
  if (qChartConfig) return { ...ChartConfig["default"], ...qChartConfig };
  const matchItems = Object.values(ChartConfig);
  const matchConfig = matchItems.find((item) => {
    if (!item.keys || isEmptyArray(item.keys)) return false;
    const arrMatches = item.keys.map((key) => key.toLowerCase());
    console.log("arr matches ", arrMatches);
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
    if (targetSections.indexOf(section.id.toLowerCase()) !== -1)
      sectionsToShow.push(section);
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
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function hasData(arrObj) {
  return arrObj && arrObj.length > 0;
}

export function getTomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

export function callback(callbackFunc, params) {
  if (!callbackFunc || typeof callbackFunc !== "function") return;
  callbackFunc(params);
}

export function fetchEnvData() {
  if (window["appConfig"] && Object.keys(window["appConfig"]).length) {
    console.log("Window config variables added. ");
    return;
  }
  const setConfig = function () {
    if (!xhr.readyState === xhr.DONE) {
      return;
    }
    if (xhr.status !== 200) {
      console.log("Request failed! ");
      return;
    }
    let envObj;
    try {
      envObj = JSON.parse(xhr.responseText);
    } catch (e) {
      console.log("Error parsing response text into json ", e);
    }
    window["appConfig"] = {};
    //assign window process env variables for access by app
    //won't be overridden when Node initializing env variables
    for (var key in envObj) {
      if (!window["appConfig"][key]) {
        window["appConfig"][key] = envObj[key];
      }
    }
  };
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "/env.json", false);
  xhr.onreadystatechange = function () {
    //in the event of a communication error (such as the server going down),
    //or error happens when parsing data
    //an exception will be thrown in the onreadystatechange method when accessing the response properties, e.g. status.
    try {
      setConfig();
    } catch (e) {
      console.log("Caught exception " + e);
    }
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
  if (window["appConfig"] && window["appConfig"][key])
    return window["appConfig"][key];
  const envDefined = typeof process !== "undefined" && process.env;
  //enviroment variables as defined in Node
  if (envDefined && process.env[key]) return process.env[key];
  return "";
}

export function getEnvs() {
  const appConfig = window["appConfig"] ? window["appConfig"] : {};
  const processEnvs = process.env ? process.env : {};
  return {
    ...appConfig,
    ...processEnvs,
  };
}

export function scrollToAnchor(anchorElementId) {
  const targetElement = document.querySelector(
    `#${QUESTIONNAIRE_ANCHOR_ID_PREFIX}_${anchorElementId}`
  );
  if (!targetElement) return;
  targetElement.scrollIntoView();
}

export function scrollToElement(elementId) {
  const targetElement = document.querySelector(`#${elementId}`);
  if (!targetElement) return;
  targetElement.scrollIntoView();
}

export function getElmDependencies() {
  const elmJsonDependencyArray = [commonLibrary];
  // Reformat ELM JSON value set references to match what is expected by the
  // code service built into the cql execution engine
  return elmJsonDependencyArray.reduce((acc, elm) => {
    let refs = elm?.library?.valueSets?.def;
    if (refs) {
      refs = refs.map((r) => {
        return {
          ...r,
          id: r.id.split("/").pop(),
        };
      });
      elm.library.valueSets.def = refs;
    }
    return {
      ...acc,
      [elm.library.identifier.id]: elm,
    };
  }, {});
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
  if (tokenResponse && tokenResponse.hasOwnProperty("need_patient_banner"))
    return tokenResponse["need_patient_banner"];
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
      .join("")
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
