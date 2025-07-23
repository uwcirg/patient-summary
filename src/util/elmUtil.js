import cql from "cql-execution";
import cqlfhir from "cql-exec-fhir";
import commonLibrary from "../cql/InterventionLogic_Common.json";
import defaultInterventionLibrary from "../cql/InterventionLogicLibrary.json";
import resourcesLogicLibrary from "../cql/ResourcesLogicLibrary.json";
import valueSetJson from "../cql/valueset-db.json";
import r4HelpersELM from "../cql/FHIRHelpers-4.0.1.json";

class VSACAwareCodeService extends cql.CodeService {
  // Override findValueSetsByOid to extract OID from VSAC URLS
  findValueSetsByOid(id) {
    const [oid] = this.extractOidAndVersion(id);
    return super.findValueSetsByOid(oid);
  }

  // Override findValueSet to extract OID from VSAC URLS
  findValueSet(id, version) {
    const [oid, embeddedVersion] = this.extractOidAndVersion(id);
    return super.findValueSet(oid, version != null ? version : embeddedVersion);
  }

  /**
   * Extracts the oid and version from a url, urn, or oid. Only url supports an embedded version
   * (separately by |); urn and oid will never return a version. If the input value is not a valid
   * urn or VSAC URL, it is assumed to be an oid and returned as-is.
   * Borrowed from: https://github.com/cqframework/cql-exec-vsac/blob/master/lib/extractOidAndVersion.js
   * @param {string} id - the urn, url, or oid
   * @returns {[string,string]} the oid and optional version as a pair
   */
  extractOidAndVersion(id) {
    if (id == null) return [];

    // first check for VSAC FHIR URL (ideally https is preferred but support http just in case)
    // if there is a | at the end, it indicates that a version string follows
    let m = id.match(/^https?:\/\/cts\.nlm\.nih\.gov\/fhir\/ValueSet\/([^|]+)(\|(.+))?$/);
    if (m) return m[3] == null ? [m[1]] : [m[1], m[3]];

    // then check for urn:oid
    m = id.match(/^urn:oid:(.+)$/);
    if (m) return [m[1]];

    // finally just return as-is
    return [id];
  }
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

export async function evalExpressionForIntervention(expression, elm, elmDependencies, valueSetDB, bundle, params) {
  if (!elm) return null;
  let evalResult = null;
  let lib = new cql.Library(
    elm,
    new cql.Repository({
      FHIRHelpers: r4HelpersELM,
      ...elmDependencies,
    }),
  );
  const executor = new cql.Executor(lib, new VSACAwareCodeService(valueSetDB), params ? params : {});
  const interventionPatientSource = cqlfhir.PatientSource.FHIRv401();
  interventionPatientSource.loadBundles([bundle]);
  // console.log("bundle to be loaded ", bundle)
  try {
    evalResult = await executor.exec_expression(expression, interventionPatientSource);
  } catch (e) {
    evalResult = null;
    console.log(`Error executing CQL `, e);
  }
  if (evalResult) {
    if (evalResult.patientResults) {
      const values = Object.values(evalResult.patientResults);
      if (values.length) return values[0][expression];
      return null;
    }
    return null;
  }
  return evalResult;
}

export function getResourceLogicLib() {
  return [resourcesLogicLibrary, valueSetJson];
}

export function getDefaultInterventionLogicLib() {
  return defaultInterventionLibrary;
}

const cqlModules = import.meta.glob("../cql/*InterventionLogic*.json");

export async function getInterventionLogicLib(interventionId) {
  const DEFAULT_FILENAME = "InterventionLogicLibrary";
  let fileName = DEFAULT_FILENAME;
  if (interventionId) {
    // load questionnaire specific CQL
    fileName = `${interventionId.toUpperCase()}_InterventionLogicLibrary`;
  }
  const storageLib = sessionStorage.getItem(`lib_${fileName}`);
  let elmJson = storageLib ? JSON.parse(storageLib) : null;
  if (!elmJson) {
    try {
      if (cqlModules[`../cql/${fileName}.json`]) {
        elmJson = await cqlModules[`../cql/${fileName}.json`]()
          .then((module) => module.default)
          .catch((e) => {
            throw new Error(e);
          });
      } else {
        elmJson = getDefaultInterventionLogicLib();
      }
      if (interventionId && elmJson) sessionStorage.setItem(`lib_${fileName}`, JSON.stringify(elmJson));
    } catch (e) {
      console.log("Error loading Cql ELM library for " + fileName, e);
      throw new Error(e);
    }
  }
  return [elmJson, valueSetJson];
}


export function extractResourcesFromELM(elm) {
  const resources = new Set();
  if (elm && elm.library && elm.library.statements && elm.library.statements.def) {
    for (const expDef of Object.values(elm.library.statements.def)) {
      extractResourcesFromExpression(resources, expDef.expression);
    }
  }
  return Array.from(resources);
}

export function extractResourcesFromExpression(resources, expression) {
  if (expression && Array.isArray(expression)) {
    expression.forEach((e) => {
      if (typeof e === "undefined") return true;
      extractResourcesFromExpression(resources, e);
    });
  } else if (expression && typeof expression === "object") {
    if (expression.type === "Retrieve") {
      const match = /^(\{http:\/\/hl7.org\/fhir\})?([A-Z][a-zA-Z]+)$/.exec(expression.dataType);
      if (match) {
        resources.add(match[2]);
      } else {
        console.error("Cannot find resource for Retrieve w/ dataType: ", expression.dataType);
      }
    } else {
      for (const val of Object.values(expression)) {
        if (typeof val === "undefined") {
          continue;
        }
        extractResourcesFromExpression(resources, val);
      }
    }
  }
}

export default extractResourcesFromELM;
