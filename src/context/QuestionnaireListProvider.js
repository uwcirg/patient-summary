import { useContext, useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { getEnvQuestionnaireList, getEnv } from "../util/util";
import { QuestionnaireListContext } from "./QuestionnaireListContext";
import { FhirClientContext } from "../context/FhirClientContext";

let loadComplete = false;

export default function QuestionnaireListProvider({ children }) {
  const [error, setError] = useState();
  const [questionnaireList, setQuestionnaireList] = useState(
    getEnvQuestionnaireList()
  );
  const [exactMatch, setExactMatch] = useState(
<<<<<<< HEAD
    getEnv("REACT_APP_MATCH_QUESTIONNAIRE_BY_ID")
=======
    getEnv("REACT_APP_EPIC_QUERIES")
>>>>>>> c6e2b0cd0ad0abc60fa0ee9a65744574da22ccc4
  );
  const { client, patient } = useContext(FhirClientContext);

  useEffect(() => {
    const handleErrorCallback = (message) => {
      setError(message);
      loadComplete = true;
    };
    if (!client || !patient) {
      handleErrorCallback("No FHIR client or patient provided");
      return;
    }
    if (loadComplete) return;
    if (questionnaireList && questionnaireList.length) {
      console.log(
        "questionnaire list to load from environment variable ",
        questionnaireList
      );
      loadComplete = true;
      return;
    }
    // load questionnaires based on questionnaire responses
    client
      .request(
        "QuestionnaireResponse?_sort=-_lastUpdated&_count=500&patient=" +
          patient.id
      )
      .then((results) => {
        const matchedResults =
          results &&
          results.entry &&
          Array.isArray(results.entry) &&
          results.entry.length
            ? results.entry.filter(
                (item) =>
                  item.resource &&
                  item.resource.questionnaire &&
                  item.resource.questionnaire.split("/")[1]
              )
            : null;
        console.log(
          "matched results for questionnaire from QuestionnaireResponse ",
          matchedResults
        );
        if (!matchedResults || !matchedResults.length) {
          handleErrorCallback("No questionnaire list set");
          return;
        }
        const qIds = matchedResults.map(
          (item) => item.resource.questionnaire.split("/")[1]
        );
        let uniqueQIds = [...new Set(qIds)];
        console.log(
          "questionnaire list from questionnaire responses to load ",
          uniqueQIds
        );
        setExactMatch(true);
        setQuestionnaireList(uniqueQIds);
        loadComplete = true;
      })
      .catch((e) => {
        handleErrorCallback(e);
      });
  }, [client, patient, questionnaireList]);

  return (
    <QuestionnaireListContext.Provider
      value={{
        questionnaireList: questionnaireList,
        exactMatch: exactMatch,
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
