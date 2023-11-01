import dayjs from "dayjs";
import ChartConfig from "../config/chart_config.js";
// import QuestionnaireConfig from "../config/questionnaire_config";
import {
  QUESTIONNAIRE_ANCHOR_ID_PREFIX,
  queryNeedPatientBanner,
} from "../consts/consts";
import commonLibrary from "../cql/InterventionLogic_Common.json";
// import Worker from "cql-worker/src/cql.worker.js"; // https://github.com/webpack-contrib/worker-loader
import valueSetJson from "../cql/valueset-db.json";
// import { initialzieCqlWorker } from "cql-worker";
import defaultSections from "../config/sections_config.js";
import {
  DEFAULT_OBSERVATION_CATEGORIES,
  DEFAULT_TOOLBAR_HEIGHT,
} from "../consts/consts";

export function getCorrectedISODate(dateString) {
  if (!dateString || dateString instanceof Date) return dateString;
  let dateObj = new Date(dateString); // Date.now() returns [millisecods]
  let timeZoneCorrection = dateObj.getTimezoneOffset() * 60 * 1000; // [minutes] * [seconds/minutes] * [milliseconds/second]
  let correctedDate = new Date(dateObj.getTime() - timeZoneCorrection);
  return correctedDate.toISOString().split("T")[0]; // just the date portion
}

export async function getInterventionLogicLib(interventionId) {
  let fileName = "InterventionLogicLibrary.json";
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
      if (elmJson)
        sessionStorage.setItem(`lib_${fileName}`, JSON.stringify(elmJson));
    } catch (e) {
      throw new Error("Error loading Cql ELM library " + e);
    }
  }
  return [elmJson, valueSetJson];
}

export function getFHIRResourcesToLoad() {
  const defaultList = [
    "Condition",
    "Observation",
    "Questionnaire",
    "QuestionnaireResponse",
  ];
  const resourcesToLoad = getEnv("REACT_APP_FHIR_RESOURCES");
  const sections = getSectionsToShow();
  const envResourcesToLoad = resourcesToLoad ? resourcesToLoad.split(",") : [];
  let resourcesForSection = [];
  if (sections && sections.length) {
    sections.forEach((section) => {
      if (section.resources && section.resources.length) {
        resourcesForSection = [...resourcesForSection, ...section.resources];
      }
    });
  }
  const combinedResources = [...envResourcesToLoad, ...resourcesForSection];
  const allResources = [...new Set(combinedResources)];
  const resources = allResources.length
    ? [...new Set([...allResources, ...defaultList])]
    : defaultList;

  //console.log("Resources to load : ", resources);
  return resources;
}

export function getFHIRResourceQueryParams(resourceType, options) {
  if (!resourceType) return null;
  let paramsObj = {
    _sort: "-_lastUpdated",
    _count: 200,
  };
  const queryOptions = options ? options : {};
  switch (String(resourceType).toLowerCase()) {
    case "careplan":
      const envCategory = getEnv("REACT_APP_FHIR_CAREPLAN_CATEGORY");
      if (queryOptions.patientId) {
        paramsObj["subject"] = `Patient/${queryOptions.patientId}`;
      }
      if (envCategory) {
        paramsObj["category:text"] = envCategory;
      }
      break;
    case "questionnaire":
      if (
        queryOptions.questionnaireList &&
        Array.isArray(queryOptions.questionnaireList) &&
        queryOptions.questionnaireList.length
      ) {
        paramsObj[queryOptions.exactMatch ? "_id" : "name:contains"] =
          queryOptions.questionnaireList.join(",");
      }
      break;
    case "observation":
      const envObCategories = getEnv("REACT_APP_FHIR_OBSERVATION_CATEGORIES");
      const observationCategories = envObCategories
        ? envObCategories
        : DEFAULT_OBSERVATION_CATEGORIES;
      paramsObj["category"] = observationCategories;
      if (queryOptions.patientId) {
        paramsObj["patient"] = `Patient/${queryOptions.patientId}`;
      }
      break;
    default:
      if (queryOptions.patientId) {
        paramsObj["patient"] = `Patient/${queryOptions.patientId}`;
      }
  }
  return paramsObj;
}

export function getFHIRResourcePaths(patientId, resourcesToLoad, options) {
  if (!patientId) return [];
  const resources =
    resourcesToLoad && Array.isArray(resourcesToLoad) && resourcesToLoad.length
      ? resourcesToLoad
      : getFHIRResourcesToLoad();
  return resources.map((resource) => {
    let path = `/${resource}`;
    const paramsObj = getFHIRResourceQueryParams(resource, {
      ...(options ? options : {}),
      patientId: patientId,
    });
    if (paramsObj) {
      const searchParams = new URLSearchParams(paramsObj);
      path = path + "?" + searchParams.toString();
    }
    return {
      resourceType: resource,
      resourcePath: path,
    };
  });
}

export function getResourcesByResourceType(patientBundle, resourceType) {
  if (!patientBundle || !patientBundle.length) return null;
  return patientBundle
    .filter((item) => {
      return (
        item.resource &&
        String(item.resource.resourceType).toLowerCase() ===
          String(resourceType).toLowerCase()
      );
    })
    .map((item) => item.resource);
}

export function getQuestionnairesByCarePlan(arrCarePlans) {
  if (!arrCarePlans) return [];
  let activities = [];
  arrCarePlans.forEach((item) => {
    if (item.resource.activity) {
      activities = [...activities, ...item.resource.activity];
    }
  });
  let qList = [];
  activities.forEach((a) => {
    if (
      a.detail &&
      a.detail.instantiatesCanonical &&
      a.detail.instantiatesCanonical.length
    ) {
      const qId = a.detail.instantiatesCanonical[0].split("/")[1];
      if (qId && qList.indexOf(qId) === -1) qList.push(qId);
    }
  });
  return qList;
}

export function getFhirResourcesFromQueryResult(result) {
  let bundle = [];
  if (!result) return [];
  if (result.resourceType === "Bundle" && result.entry) {
    result.entry.forEach((o) => {
      if (o && o.resource) bundle.push({ resource: o.resource });
    });
  } else if (Array.isArray(result)) {
    result.forEach((o) => {
      if (o.resourceType) bundle.push({ resource: o });
    });
  } else {
    bundle.push({ resource: result });
  }
  return bundle;
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

export function getChartConfig(questionnaire) {
  const qChartConfig = ChartConfig[questionnaire.toLowerCase()] || {};
  return { ...ChartConfig["default"], ...qChartConfig };
}

export function getEnvQuestionnaireList() {
  const configList = getEnv("REACT_APP_QUESTIONNAIRES");
  if (configList)
    return configList.split(",").map((item) => item.replace(/_/g, "-").trim());
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

export function getIntroTextFromQuestionnaire(questionnaireJson) {
  if (!questionnaireJson) return "";
  const targetItem = questionnaireJson.item
    ? questionnaireJson.item.filter(
        (item) => String(item.linkId).toLowerCase() === "introduction"
      )
    : null;
  if (targetItem && targetItem.length) {
    const textElement = targetItem[0]._text;
    if (!textElement || !textElement.extension || !textElement.extension[0])
      return "";
    return textElement.extension[0].valueString;
  }
  return questionnaireJson.description;
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

export function getQuestionnaireName(questionnaireJson) {
  if (!questionnaireJson) return "";
  const { id, title, name } = questionnaireJson;
  if (name) return name;
  if (title) return title;
  return `Questionnaire ${id}`;
}

export function getLocaleDateStringFromDate(dateString, format) {
  if (!dateString) return "";
  const dateFormat = format ? format : "YYYY-MM-DD hh:mm";
  if (!dayjs(dateString).isValid()) return dateString;
  return dayjs(dateString).format(dateFormat);
}

export function getFhirItemValue(item) {
  if (!item) return null;
  if (hasValue(item.valueQuantity)) {
    if (item.valueQuantity.unit) {
      return [item.valueQuantity.value, item.valueQuantity.unit].join(" ");
    }
    return item.valueQuantity.value;
  }
  if (hasValue(item.valueString)) {
    if (hasValue(item.valueString.value)) return String(item.valueString.value);
    return item.valueString;
  }
  if (hasValue(item.valueBoolean)) {
    if (hasValue(item.valueBoolean.value))
      return String(item.valueBoolean.value);
    return String(item.valueBoolean);
  }
  if (hasValue(item.valueInteger)) {
    if (hasValue(item.valueInteger.value)) return item.valueInteger.value;
    return item.valueInteger;
  }
  if (hasValue(item.valueDecimal)) {
    if (hasValue(item.valueDecimal.value)) return item.valueDecimal.value;
    return item.valueDecimal;
  }
  if (item.valueDate) {
    if (hasValue(item.valueDate.value)) return item.valueDate.value;
    return item.valueDate;
  }
  if (hasValue(item.valueDateTime)) {
    if (item.valueDateTime.value) return item.valueDateTime.value;
    return item.valueDateTime;
  }
  if (item.valueCodeableConcept) {
    if (item.valueCodeableConcept.text) {
      return item.valueCodeableConcept.text;
    } else if (
      item.valueCodeableConcept.coding &&
      Array.isArray(item.valueCodeableConcept.coding) &&
      item.valueCodeableConcept.coding.length
    ) {
      return item.valueCodeableConcept.coding[0].display;
    }
    return null;
  }
  // need to handle date/time value

  return null;
}
export function getFhirComponentDisplays(item) {
  let displayText = getFhirItemValue(item);
  if (!item || !item.component || !item.component.length) return displayText;
  const componentDisplay = item.component
    .map((o) => {
      const textDisplay = o.code && o.code.text ? o.code.text : null;
      const valueDisplay = getFhirItemValue(o);
      if (hasValue(valueDisplay))
        return textDisplay
          ? [textDisplay, valueDisplay].join(": ")
          : valueDisplay;
      return "";
    })
    .join(", ");
  if (displayText && componentDisplay) {
    return [displayText, componentDisplay].join(", ");
  }
  if (componentDisplay) return componentDisplay;
  if (displayText) return displayText;
  return null;
}

export function hasValue(value) {
  return value != null && value !== "" && typeof value !== "undefined";
}
