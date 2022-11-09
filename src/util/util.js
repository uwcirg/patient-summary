import ChartConfig from "../config/chart_config.js";
import QuestionnaireConfig from "../config/questionnaire_config";
import { QUESTIONNAIRE_ANCHOR_ID_PREFIX } from "../consts/consts";
import commonLibrary from "../cql/InterventionLogic_Common.json";
import Worker from "cql-worker/src/cql.worker.js"; // https://github.com/webpack-contrib/worker-loader
import valueSetJson from "../cql/valueset-db.json";
import { initialzieCqlWorker } from "cql-worker";

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
      if (elmJson) sessionStorage.setItem(`lib_${fileName}`, JSON.stringify(elmJson));
    } catch (e) {
      throw new Error("Error loading Cql ELM library " + e);
    }
  }
  return [elmJson, valueSetJson];
}

export function getFHIRResourcePaths(patientId) {
  if (!patientId) return [];
  // const defaultList = ["CarePlan", "QuestionnaireResponse"];
  const defaultList = ["QuestionnaireResponse"];
  const resourcesToLoad = getEnv("REACT_APP_FHIR_RESOURCES");
  let resources = resourcesToLoad ? resourcesToLoad.split(",") : defaultList;
  defaultList.forEach((item) => {
    let inList =
      resources.filter((r) => r.toLowerCase() === item.toLowerCase()).length >
      0;
    if (!inList) {
      resources.push(item);
    }
  });
  return resources.map((resource) => {
    let path = `/${resource}`;
    const observationCategories = getEnv(
      "REACT_APP_FHIR_OBSERVATION_CATEGORIES"
    );
    const qList = getQuestionnaireList().join(",");
    if (resource.toLowerCase() === "questionnaire") {
      const params = qList;
      if (params) path = path + `?name:contains:${params}`;
    }
    if (resource.toLowerCase() === "careplan") {
      path =
        path +
        `?subject=Patient/${patientId}&_sort=-_lastUpdated&category:text=Questionnaire`;
    } else {
      path =
        path +
        (resource.toLowerCase() !== "questionnaire"
          ? `?patient=${patientId}&_sort=-_lastUpdated`
          : "");
    }
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

export function getQuestionnaireList() {
  const configList = getEnv("REACT_APP_QUESTIONNAIRES");
  if (configList) return configList.split(",").map((item) => item.trim());
  return [];
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
    var envObj;
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

export function gatherSummaryDataByQuestionnaireId(
  client,
  patientBundle,
  questionnaireId
) {
  return new Promise((resolve, reject) => {
    // search for matching questionnaire
    const searchMatchingResources = async () => {
      const storageKey = `questionnaire_${questionnaireId}`;
      const storageQuestionnaire = sessionStorage.getItem(storageKey);
      if (storageQuestionnaire) return JSON.parse(storageQuestionnaire);
      const fhirSearchOptions = { pageLimit: 0 };
      const qResult = await client.request(
        {
          url: "Questionnaire?name:contains=" + questionnaireId,
        },
        fhirSearchOptions
      ).catch(e => {
        throw new Error(e)
      });
      if (qResult) sessionStorage.setItem(storageKey, JSON.stringify(qResult));
      return qResult;
    };
    const gatherSummaryData = async (questionnaireJson) => {
      // Define a web worker for evaluating CQL expressions
      const cqlWorker = new Worker();
      // Initialize the cql-worker
      const [setupExecution, sendPatientBundle, evaluateExpression] =
        initialzieCqlWorker(cqlWorker);
      const questionaireKey = String(questionnaireId).toLowerCase();
      const chartConfig = getChartConfig(questionaireKey);
      const questionnaireConfig = QuestionnaireConfig[questionaireKey] || {};

      /* get CQL expressions */
      const [elmJson, valueSetJson] = await getInterventionLogicLib(
        questionnaireConfig.customCQL ? questionnaireId : ""
      ).catch((e) => {
        console.log("Error retrieving ELM lib son for " + questionnaireId, e);
        throw new Error("Error retrieving ELM lib son for " + questionnaireId);
      });

      setupExecution(
        elmJson,
        valueSetJson,
        {
          QuestionnaireName: questionnaireJson.name,
          QuestionnaireURL: questionnaireJson.url,
        },
        getElmDependencies()
      );

      // Send patient info to CQL worker to process
      sendPatientBundle(patientBundle);

      // get formatted questionnaire responses
      const cqlData = await evaluateExpression("ResponsesSummary").catch(
        (e) => {
          console.log(e);
          throw new Error(
            "CQL evaluation expression, ResponsesSummary, error "
          );
        }
      );
      const scoringData =
        cqlData && cqlData.length
          ? cqlData.filter((item) => {
              return (
                item.responses &&
                item.score
              );
            })
          : null;
      const chartData = scoringData && scoringData.length
        ? scoringData.map((item) => ({
            date: item.date,
            total: item.score,
          }))
        : null;

      const returnResult = {
        chartConfig: chartConfig,
        chartData: chartData,
        responses: cqlData,
        questionnaire: questionnaireJson,
      };
      console.log(
        "return result from CQL execution for " + questionnaireId,
        returnResult
      );
      cqlWorker.terminate();
      return returnResult;
    };

    // find matching questionnaire & questionnaire response(s)
    searchMatchingResources()
      .then((result) => {
        let bundles = [];
        result.forEach((item) => {
          bundles = [...bundles, ...getFhirResourcesFromQueryResult(item)];
        });
        const arrQuestionnaires = bundles.filter(
          (entry) =>
            entry.resource &&
            String(entry.resource.resourceType).toLowerCase() ===
              "questionnaire"
        );
        const questionnaireJson = arrQuestionnaires.length
          ? arrQuestionnaires[0].resource
          : null;
        if (!questionnaireJson) {
          reject("No matching questionnaire found");
          return;
        }
        patientBundle = {
          ...patientBundle,
          entry: [...patientBundle.entry, ...bundles],
          questionnaire: questionnaireJson,
        };
        gatherSummaryData(questionnaireJson)
          .then((data) => {
            resolve(data);
          })
          .catch((e) => {
            reject(
              "Error occurred gathering summary data.  See console for detail."
            );
            console.log("Error occurred gathering summary data: ", e);
          });
      })
      .catch((e) => {
        reject("Error occurred retrieving matching resources");
        console.log("Error occurred retrieving matching resources: ", e);
      });
  }); // end promise
}
