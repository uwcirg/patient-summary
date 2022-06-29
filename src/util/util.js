export async function getExpressionLogicLib (expressionParam) {
  let elmJson, valueSetJson;
  try {
    elmJson = await import(`../cql/ExpressionLogicLibrary.json`).then(module=>module.default);
    valueSetJson = await import(`../cql/valueset-db.json`).then(module=>module.default);
  } catch(e) {
    throw new Error('Error loading Cql ELM library ' + e);
  }
  return [elmJson, valueSetJson, expressionParam];
}

export function getFHIRResourcePaths(patientId) {
  if (!patientId) return [];
  let resources = process.env.REACT_APP_FHIR_RESOURCES ? process.env.REACT_APP_FHIR_RESOURCES.split(','): ['Questionnaire','QuestionnaireResponse'];
  return resources.map(resource => {
    let path = `/${resource}`;
    path = path + (resource.toLowerCase() !== 'questionnaire'?`?patient=${patientId}`:'');
    if (resource.toLowerCase() === "observation" && process.env.REACT_APP_FHIR_OBSERVATION_CATEGORIES) {
      let categories = process.env.REACT_APP_FHIR_OBSERVATION_CATEGORIES.split(',');
      path += '&' + encodeURIComponent((categories.map(cat => 'category=' + cat)).join('&'));
    }
    return path;
  });
}

export const queryPatientIdKey = 'launch_queryPatientId';
