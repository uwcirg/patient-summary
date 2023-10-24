import { useContext, useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { getEnvQuestionnaireList, getEnv } from "../util/util";
import { QuestionnaireListContext } from "./QuestionnaireListContext";
import { FhirClientContext } from "../context/FhirClientContext";

let loadComplete = false;

export default function QuestionnaireListProvider({ children }) {
  const [error, setError] = useState();
  const [questionnaireList, setQuestionnaireList] = useState([]);
  const [exactMatch, setExactMatch] = useState(getEnv("REACT_APP_MATCH_QUESTIONNAIRE_BY_ID"));
  const { client, patient } = useContext(FhirClientContext);

  useEffect(() => {
    if (!client || !patient) {
      setError("No FHIR client provided");
      return;
    }
    if (loadComplete || error) return;
    const envQList = getEnvQuestionnaireList();
    if (envQList.length) {
      setQuestionnaireList(envQList);
      loadComplete = true;
      return;
    }
    const handleErrorCallback = (message) => {
      setError(message);
      loadComplete = true;
    };
    // load questionnaires based on questionnaire responses
    client
      .request(
        "QuestionnaireResponse?_sort=-_lastUpdated&_count=500&patient=" +
          patient.id
      )
      .then((results) => {
        // if (envQList.length) {
        //   setQuestionnaireList(envQList);
        //   console.log("questionnaire list to load from env var: ", envQList);
        //   } else {
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
          setError("No questionnaire list set");
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
        //  }
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
