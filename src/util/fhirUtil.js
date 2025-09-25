import { getEnv, getSectionsToShow, isEmptyArray, isNil } from "./index.js";
import {
  DEFAULT_OBSERVATION_CATEGORIES,
  DEFAULT_VAL_TO_LOIN_CODE,
  FLOWSHEET_SYSTEM,
  FLOWSHEET_ID_LINK_ID_MAPPINGS,
} from "@/consts/index.js";

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
  const resourceTypes = sections.map((section) => section.resources).flat();
  return [...new Set(resourceTypes)];
}

export function getFHIRResourceQueryParams(resourceType, options) {
  if (!resourceType) return null;
  let paramsObj = {};
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
  if (isEmptyArray(resourceTypesToLoad)) return [];
  return resourceTypesToLoad.map((resource) => {
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
      if (item.resource) return String(item.resource.resourceType).toLowerCase() === String(resourceType).toLowerCase();
      return String(item.resourceType).toLowerCase() === String(resourceType).toLowerCase();
    })
    .map((item) => (item.resource ? item.resource : item));
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

export function normalizeLinkId(id) {
  return (id ?? "").toString().trim().replace(/^\//, "");
}
export function conceptCode(c) {
  if (!c || isEmptyArray(c.coding)) return null;
  const codings = c.coding;
  for (let i = 0; i < codings.length; i++) {
    const code = codings[i]?.code ?? (codings[i]?.code?.value ? codings[i]?.code?.value : null);
    if (code) return code;
  }
  return null;
}

export function conceptText(c) {
  if (!c) return null;
  if (typeof c.text === "string" && c.text.trim()) return c.text;
  if (c.text?.value) return c.text.value;
  const codings = !isEmptyArray(c.coding) ? c.coding : [];
  for (let i = 0; i < codings.length; i++) {
    const d = codings[i]?.display ?? (codings[i]?.display?.value ? codings[i]?.display?.value : "");
    if (d) return d;
  }
  for (let i = 0; i < codings.length; i++) {
    const code = codings[i]?.code ?? (codings[i]?.code?.value ? codings[i]?.code?.value : "");
    if (code) return code;
  }
  return null;
}

/**
 * linkId equality with optional matching mode
 * @param {'strict'|'fuzzy'} mode
 */
export function linkIdEquals(a, b, mode = "fuzzy") {
  const A = normalizeLinkId(a);
  const B = normalizeLinkId(b);
  if (mode === "strict") return A === B;
  return A && B && (A.includes(B) || B.includes(A));
}

// ---------- ranges / display ----------
export function getReferenceRangeDisplay(ranges = []) {
  if (isEmptyArray(ranges)) return null;
  const r = ranges[0];
  const low = r?.low,
    high = r?.high;
  if (low?.value != null && high?.value != null) {
    const unit = low.unit ?? low.code ?? high.unit ?? high.code ?? "";
    return `${low.value}–${high.value} ${unit}`.trim();
  }
  if (low?.value != null) return `≥${low.value} ${low.unit ?? low.code ?? ""}`.trim();
  if (high?.value != null) return `≤${high.value} ${high.unit ?? high.code ?? ""}`.trim();
  return r?.text ?? null;
}

export function formatValueQuantity({ value, unit }, fallbackText) {
  if (!isNil(value)) return unit ? `${value} ${unit}` : String(value);
  return !isNil(fallbackText) ? String(fallbackText) : null;
}

export function getValueText(O) {
  if (!O) return null;
  if (!isNil(O.code)) return conceptText(O.code);
  if (!isNil(O.valueCodeableConcept)) return conceptCode(O.valueCodeableConcept);
  if (!isNil(O.valueString)) return String(O.valueString);
  if (!isNil(O.valueDecimal)) return String(O.valueDecimal);
  if (!isNil(O.valueInteger)) return String(O.valueInteger);
  if (!isNil(O.valueDate)) return String(O.valueDate);
  if (!isNil(O.valueDateTime)) return String(O.valueDateTime);
  if (!isNil(O.valueBoolean)) return String(O.valueBoolean);
  if (O.value && typeof O.value !== "object") {
    return String(O.value);
  }
  return null;
}
export const getValueFromResource = (resourceItem) => {
  const n = resourceItem?.valueQuantity ? Number(resourceItem?.valueQuantity?.value ?? undefined) : undefined;
  if (isFinite(n)) {
    const code = conceptCode(resourceItem?.code);
    const linkId = code ? getLinkIdByFromFlowsheetId(code) : null;
    if (linkId) {
      const coding = DEFAULT_VAL_TO_LOIN_CODE[n];
      if (coding) return { valueCoding: coding };
      return {
        valueQuantity: resourceItem["valueQuantity"],
      };
    }
    return {
      valueQuantity: resourceItem["valueQuantity"],
    };
  }
  const key = [
    "valueCodeableConcept",
    "valueCoding",
    "valueString",
    "valueDecimal",
    "valueInteger",
    "valueDate",
    "valueDateTime",
    "valueBoolean",
    "valueReference",
    "valueUri",
  ].find((k) => !isNil(resourceItem?.[k]));

  return key ? { [key]: resourceItem[key] } : undefined;
};

export function getValueBlockFromQuantity(O) {
  if (!O) {
    return {
      value: null,
      unit: null,
    };
  }
  const q = O.valueQuantity ?? (O.value && typeof O.value === "object" && "value" in O.value ? O.value : null);
  if (!q) return { value: null, unit: O.code ? null : null };
  return { value: q.value ?? null, unit: O.code ? null : (q.unit ?? null) };
}

export function getValueDisplayWithRef(valueStr, rangeSummary) {
  if (!valueStr && rangeSummary) return `(ref ${rangeSummary})`;
  if (valueStr && rangeSummary) return `${valueStr} (ref ${rangeSummary})`;
  return valueStr ?? null;
}

export function getComponentValues(components = []) {
  const list = !isEmptyArray(components) ? components : [];
  return list.map((c) => {
    const text = conceptText(c.code);

    const q = c.valueQuantity ?? (c.value && typeof c.value === "object" && "value" in c.value ? c.value : null);
    const value = q?.value ?? null;
    const unit = c.valueCodeableConcept ? null : q ? (q.unit ?? q.code ?? null) : null;

    let valueText = null;
    if (c.valueCodeableConcept) valueText = conceptText(c.valueCodeableConcept);
    else {
      valueText = getValueText(c);
    }

    const referenceRange = c.referenceRange ?? [];
    const referenceRangeSummary = getReferenceRangeDisplay(referenceRange);
    const displayValue = formatValueQuantity({ value, unit }, valueText);
    const displayValueWithRef = getValueDisplayWithRef(displayValue, referenceRangeSummary);

    return {
      text,
      value,
      valueText,
      unit,
      interpretation: conceptText(c.interpretation?.[0]) ?? null,
      interpretationCode: conceptCode(c.interpretation?.[0]) ?? null,
      referenceRange,
      referenceRangeSummary,
      displayValue,
      displayValueWithRef,
    };
  });
}

export function getDefaultQuestionItemText(linkId, index) {
  const codeBit = String(linkId).match(/(\d+-\d)$/)?.[1]; // grabs "44250-9" if present
  return `Question ${index + 1}${codeBit ? ` (${codeBit})` : ""}`;
}

export const getFlowsheetId = (item) => item?.code?.coding?.find((c) => c.system === FLOWSHEET_SYSTEM)?.code || null;

export const getLinkIdByFromFlowsheetId = (id) => {
  if (id && FLOWSHEET_ID_LINK_ID_MAPPINGS[id]) {
    return FLOWSHEET_ID_LINK_ID_MAPPINGS[id];
  }
  return null;
};

export function getFlowsheetIds() {
  return Object.keys(FLOWSHEET_ID_LINK_ID_MAPPINGS);
}

export function makeQuestionItem(linkId, text, answerOptions) {
  return {
    linkId: normalizeLinkId(linkId),
    type: !isEmptyArray(answerOptions) ? getQuestionItemType(answerOptions[0]) : "string",
    text: text || "",
    ...(!isEmptyArray(answerOptions) ? { answerOption: answerOptions } : {}),
  };
}

// infer a sensible FHIR item.type from one example answer option
export function getQuestionItemType(answerOption) {
  if (!answerOption) return "string";
  const key = Object.keys(answerOption).find((k) => k.startsWith("value"));
  return key ? key.slice(5).replace(/^[A-Z]/, (c) => c.toLowerCase()) : "string";
}

export function getLinkIdsFromObservationFlowsheetIds(obResources) {
  if (isEmptyArray(obResources)) return [];
  let obsLinkIds = obResources
    .filter((o) => getLinkIdByFromFlowsheetId(getFlowsheetId(o)))
    .map((o) => normalizeLinkId(getLinkIdByFromFlowsheetId(getFlowsheetId(o))));
  return [...new Set(obsLinkIds)];
}
