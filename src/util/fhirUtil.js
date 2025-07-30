import { DEFAULT_OBSERVATION_CATEGORIES } from "../consts/index.js";
import { extractResourcesFromELM } from "./elmUtil.js";
import { getEnv, getSectionsToShow, hasValue, isEmptyArray } from "./index.js";

/*
 * @param client, FHIR client object
 * @param uri, path including search parameters if applicable, e.g. Patient?_sort=_lastUpdated
 * return re-constructed URL string including server url if applicable
 */
function getRequestURL(client, uri = "") {
  if (!client) return uri;
  let serverURL = "";
  if (client && client.state) {
    //e.g. https://backend.uwmedicine.cosri.app/fhir-router/4bc20310-8963-4440-b6aa-627ce6def3b9/
    //e.g. https://launch.smarthealthit.org/v/r4/fhir
    serverURL = client.state.serverUrl;
  }
  if (!serverURL) return "";
  let uriToUse = uri;
  if (uriToUse.startsWith("/")) uriToUse = uri.slice(1);
  return serverURL + (!serverURL.endsWith("/") ? "/" : "") + uriToUse;
}

export function processPage(client, resources = []) {
  return (bundle) => {
    if (bundle && bundle.link && bundle.link.some((l) => l.relation === "self" && l.url != null)) {
      bundle.link = bundle.link.map((o) => {
        if (!o.url) return o;
        let reuseURL = null;
        try {
          reuseURL = new URL(o.url);
        } catch (e) {
          console.log(`Unable to create URL object for ${o.url}`, e);
          reuseURL = null;
        }
        if (reuseURL) {
          const requestURL = getRequestURL(client, reuseURL.search);
          if (requestURL) o.url = requestURL;
        }
        // if (o.relation === "next")
        //   console.log("Next URL ", o.url)
        return o;
      });
    }
    // Add to the resources
    if (bundle.entry) {
      //prevent addition of null entry
      //each entry is not always wrapped in resource node
      bundle.entry.forEach((e) => {
        if (!e) return true;
        let resource = e.resource ? e.resource : e;
        resources.push(resource);
      });
    }
  };
}

export function getFHIRResourceTypesToLoad() {
  const sections = getSectionsToShow();
  const libraries = [...new Set(sections.map((section) => section.library))];
  const resourceTypes = libraries.map((item) => extractResourcesFromELM(item)).flat();
  return [...new Set(resourceTypes)];
}

export function getFHIRResourceQueryParams(resourceType, options) {
  if (!resourceType) return null;
  let paramsObj = {
    _sort: "-_lastUpdated"
  };
  const queryOptions = options ? options : {};
  const envCategory = getEnv("REACT_APP_FHIR_CAREPLAN_CATEGORY");
  const envObCategories = getEnv("REACT_APP_FHIR_OBSERVATION_CATEGORIES");
  const observationCategories = envObCategories ? envObCategories : DEFAULT_OBSERVATION_CATEGORIES;
  switch (String(resourceType).toLowerCase()) {
    case "careplan":
      if (queryOptions.patientId) {
        paramsObj["subject"] = `Patient/${queryOptions.patientId}`;
      }
      if (envCategory) {
        paramsObj["category:text"] = envCategory;
      }
      break;
    case "questionnaire":
      if (!isEmptyArray(queryOptions.questionnaireList)) {
        let qList = queryOptions.questionnaireList.join(",");
        paramsObj[queryOptions.exactMatchById ? "_id" : "name:contains"] = qList;
      }
      break;
    case "observation":
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

export function getFHIRResourcePath(patientId, resourceType, options) {
  const { resourcePath } = getFHIRResourcePaths(patientId, resourceType, options)[0];
  return resourcePath;
}

export function getFHIRResourcePaths(patientId, resourceTypesToLoad, options) {
  if (!patientId) return [];
  const resources = !isEmptyArray(resourceTypesToLoad) ? resourceTypesToLoad : getFHIRResourceTypesToLoad();
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
  if (isEmptyArray(patientBundle)) return null;
  if (!resourceType) return patientBundle;
  return patientBundle
    .filter((item) => {
      return item.resource && String(item.resource.resourceType).toLowerCase() === String(resourceType).toLowerCase();
    })
    .map((item) => item.resource);
}

export function getResourceTypesFromResources(resources) {
  if (!resources) return [];
  return [...new Set(resources.map((o) => (o.resource ? o.resource.resourceType : o.resourceType)))];
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
    if (a.detail && a.detail.instantiatesCanonical && a.detail.instantiatesCanonical.length) {
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

export function getFhirItemValue(item) {
  if (!item) return null;
  if (hasValue(item.valueQuantity)) {
    const unit = item.valueQuantity.unit ?? "";
    const value = item.valueQuantity.value ?? "";
    const comparator = item.valueQuantity.comparator ?? "";
    return [value, comparator, unit].join(" ");
  }
  if (hasValue(item.valueString)) {
    if (hasValue(item.valueString.value)) return String(item.valueString.value);
    return item.valueString;
  }
  if (hasValue(item.valueBoolean)) {
    if (hasValue(item.valueBoolean.value)) return String(item.valueBoolean.value);
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
  if (item.valueRatio) {
    if (
      item.valueRatio.numerator &&
      item.valueRatio.numerator.value &&
      item.valueRatio.denominator &&
      item.valueRatio.denominator.value
    ) {
      return `${item.valueRatio.numerator.value} / ${item.valueRatio.denominator.value}`;
    }
    return "";
  }
  if (item.valueRange) {
    let rangeText = "";
    if (item.valueRange.low && item.valueRange.low.value) {
      rangeText += `low: ${item.valueRange.low.value} ${item.valueRange.low.unit ?? ""} `;
    }
    if (item.valueRange.high && item.valueRange.high.value) {
      rangeText += `high: ${item.valueRange.high.value} ${item.valueRange.high.unit ?? ""} `;
    }
    return rangeText;
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
      return item.valueCodeableConcept.coding.map((item) => item.display).join(", ");
    }
    return null;
  }
  // need to handle date/time value

  return null;
}
export function getFhirComponentDisplays(item) {
  let displayText = getFhirItemValue(item);
  if (!item || !item.component || !Array.isArray(item.component) || !item.component.length) return displayText;
  const componentDisplay = item.component
    .map((o) => {
      const textDisplay = o.code && o.code.text ? o.code.text : null;
      const valueDisplay = getFhirItemValue(o);
      if (hasValue(valueDisplay)) return textDisplay ? [textDisplay, valueDisplay].join(": ") : valueDisplay;
      return "";
    })
    .join(", ");
  if (displayText && componentDisplay) {
    return [displayText, componentDisplay].join(", ");
  }
  if (componentDisplay) return componentDisplay;
  return displayText;
}
