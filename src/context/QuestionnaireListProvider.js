import { useContext, useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { getEnvQuestionnaireList, getFhirResourcesFromQueryResult } from "../util/util";
import { QuestionnaireListContext } from "./QuestionnaireListContext";
import { FhirClientContext } from "../context/FhirClientContext";

let loadComplete = false;

export default function QuestionnaireListProvider({ children }) {
  const [error, setError] = useState(null);
  const [questionnaireList, setQuestionnaireList] = useState([]);
  const [questionnaireResponses, setQuestionnaireResponses] = useState([]);
  const { client, patient } = useContext(FhirClientContext);

  useEffect(() => {
    if (!client || !patient) {
      setError("No FHIR client provided");
      return;
    }
    if (loadComplete || error) return;

    const envQList = getEnvQuestionnaireList() || [];
    const handleErrorCallback = (message) => {
      if (envQList.length) {
        setQuestionnaireList(
          envQList.map((q) => ({
            id: q,
            exactMatch: false,
          }))
        );
      } else {
        setError(message ? message : "No questionnaire list set");
      }
      loadComplete = true;
    };
    client
      .request(
        "QuestionnaireResponse?_sort=-_lastUpdated&_count=200&patient=" +
          patient.id
      )
      .then((results) => {
        const matchedResults =
          results && results.entry && results.entry.length
            ? results.entry.filter(
                (item) =>
                  item.resource &&
                  item.resource.questionnaire &&
                  item.resource.questionnaire.split("/")[1]
              )
            : null;
        //console.log("matched results ", matchedResults)
        if (!matchedResults || !matchedResults.length) {
          handleErrorCallback();
          return;
        }

        const qIds = matchedResults.map(
          (item) => item.resource.questionnaire.split("/")[1]
        );
        let uniqueQIds = [...new Set(qIds)];
        if (envQList.length) {
          // check if questionnaire key matches any questionnaire response
          uniqueQIds = envQList.map((q) => {
            const match = uniqueQIds.filter((item) =>
              String(item).toLowerCase().includes(String(q).toLowerCase())
            );
            if (match.length)
              return {
                id: match[0],
                exactMatch: true,
              };
            return {
              id: q,
              exactMatch: false,
            };
          });
        } else {
          uniqueQIds = uniqueQIds.map((q) => ({
            id: q,
            exactMatch: true,
          }));
        }
        console.log("questionnaire list to load ", uniqueQIds);
        setQuestionnaireList(uniqueQIds);

        const responseResources = getFhirResourcesFromQueryResult(results);
        //console.log("responses ", responseResources);
        setQuestionnaireResponses(responseResources);
        loadComplete = true;
      })
      .catch((e) => {
        handleErrorCallback(e);
      });
  }, [client, patient, error]);

  return (
    <QuestionnaireListContext.Provider
      value={{
        questionnaireList: questionnaireList,
        questionnaireResponses: questionnaireResponses,
        error: error,
      }}
    >
      <QuestionnaireListContext.Consumer>
        {({ questionnaireList, error }) => {
          // if client and patient are available render the children component(s)
          if (questionnaireList.length || error) {
            return children;
          }

          // loading
          return (
            <Stack spacing={2} direction="row" style={{ padding: "24px" }}>
              <CircularProgress></CircularProgress>
              <div>Loading...</div>
            </Stack>
          );
        }}
      </QuestionnaireListContext.Consumer>
    </QuestionnaireListContext.Provider>
  );
}
