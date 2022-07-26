const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

/*
 * FOR TESTING AGAINST SMART HEALTH IT server
 * this will upload test questionnaire response JSON(s) in test_questionnaire_responses directory to Smart Health IT server
 * run the following command: npm run upload-test-responses
 * if you wish to associate the questionnaire responses with a specific patient id:
 * simply add the patient id at the end of the command, example:
 * npm run upload-test-responses 5ee05359-57bf-4cee-8e89-91382c07e162
 */

upload(
  "https://r4.smarthealthit.org",
  path.join(__dirname, "test_questionnaire_responses")
).then((results) => {
  console.log(results)
});


function upload(baseURL, dirPath) {
  const requests = [];
  for (const fileName of fs.readdirSync(dirPath)) {
    console.log("File to be uploaded ", fileName);
    const file = path.join(dirPath, fileName);
    if (!file.endsWith(".json")) {
      console.log("Skipping non-JSON file:", file);
      continue;
    }
    let json = JSON.parse(fs.readFileSync(file, "utf8"));
    const args = process.argv.slice(2);

    if (args[0]) {
      console.log("patient id argument ", args[0]);
      json.subject = {};
      json.subject.reference = "Patient/"+args[0];
    }

    const ptOptions = {
      method: "POST",
      body: JSON.stringify(json),
      headers: { "Content-Type": "application/json" },
    };
    const request = fetch(`${baseURL}/QuestionnaireResponse`, ptOptions);
    requests.push(request);
  }
  return Promise.all(requests);
}
