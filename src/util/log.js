import { getEnv, getEnvProjectId, getEnvSystemType } from "./util";

function getDefaultLogObject() {
  return {
    level: "info",
    tags: ["patient-summary-front-end"],
    projectID: getEnvProjectId(),
    systemURL: window.location.href,
    deployment: getEnvSystemType(),
  };
}
//write to audit log
// @param level, expect string
// @param tags, expect array, e.g. ['info']
// @param body, expect object, e.g. { "projectID": "DCW"}
// @param message, expect object, e.g. { "text": "ok"}
export function writeToLog(level, tags, body, message) {
  const confidentialBackendURL = getEnv("REACT_APP_BACKEND_URL");
  if (!confidentialBackendURL) {
    console.log("audit log skipped; confidential backend URL is not set");
    return;
  }
  let postBody = {...getDefaultLogObject(), ...body};
  if (level) postBody.level = level;
  if (tags) postBody.tags = [...postBody.tags, ...tags];
  if (message)
    postBody.message = {
      ...postBody.message,
      ...message,
    };
  const auditURL = `${confidentialBackendURL || ""}/auditlog`;
  fetch(auditURL, {
    method: "post",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postBody),
  })
    .then((response) => {
      if (!response.ok) {
        throw Error(response.statusText);
      }
      return response.json();
    })
    .then(function (data) {
      console.log("audit request succeeded with response ", data);
    })
    .catch(function (error) {
      console.log("Request failed", error);
    });
}
