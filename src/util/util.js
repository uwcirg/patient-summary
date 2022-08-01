import ChartConfig from "../config/chart_config.js";

export async function getInterventionLogicLib(interventionId) {
  if (!interventionId) throw new Error("No intervention id specified");
  let elmJson, valueSetJson;
  try {
    elmJson = await import(
      `../cql/${interventionId.toUpperCase()}_InterventionLogicLibrary.json`
    ).then((module) => module.default);
    valueSetJson = await import(`../cql/valueset-db.json`).then(
      (module) => module.default
    );
  } catch (e) {
    throw new Error("Error loading Cql ELM library " + e);
  }
  return [elmJson, valueSetJson];
}

export function getFHIRResourcePaths(patientId) {
  if (!patientId) return [];
  const resourcesToLoad = getEnv("REACT_APP_FHIR_RESOURCES");
  let resources = resourcesToLoad
    ? resourcesToLoad.split(",")
    : ["QuestionnaireResponse"];
  return resources.map((resource) => {
    let path = `/${resource}`;
    const observationCategories = getEnv(
      "REACT_APP_FHIR_OBSERVATION_CATEGORIES"
    );
    path =
      path +
      (resource.toLowerCase() !== "questionnaire"
        ? `?patient=${patientId}`
        : "");
    if (resource.toLowerCase() === "observation" && observationCategories) {
      let categories = observationCategories.split(",");
      path +=
        "&" +
        encodeURIComponent(
          categories.map((cat) => "category=" + cat).join("&")
        );
    }
    return path;
  });
}
export function isValidDate(date) {
  return (
    date &&
    Object.prototype.toString.call(date) === "[object Date]" &&
    !isNaN(date)
  );
}
export const getChartConfig = (questionnaire) => {
  const qChartConfig = ChartConfig[questionnaire.toLowerCase()] || {};
  return { ...ChartConfig["default"], ...qChartConfig };
};
export const getQuestionnaireList = () => {
  const configList = getEnv("REACT_APP_QUESTIONNAIRES");
  if (configList) return configList.split(",");
  return [];
};
export const queryPatientIdKey = "launch_queryPatientId";

export const getEnv = (key) => {
  if (!process || !process.env) return "";
  return process.env[key];
};

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
  faviconEl.href = `/assets/${projectId}/favicon.ico`;
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

export const QUESTIONNAIRE_ANCHOR_ID_PREFIX = "questionnaireAnchor";
