import { createRef, forwardRef, useEffect, useCallback, useState } from "react";
import Fab from "@mui/material/Fab";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import {
  getQuestionnaireList,
  isInViewport,
  QUESTIONNAIRE_ANCHOR_ID_PREFIX,
} from "../util/util";
import QuestionnaireSelector from "./QuestionnaireSelector";
import Summary from "./Summary";
let scrollIntervalId = 0;

export default function Summaries() {
  const fabRef = createRef();
  const anchorRef = createRef();
  const selectorRef = createRef();
  const questionnaireList = getQuestionnaireList();
  const [updated, setUpdated] = useState(0);
  const [error, setError] = useState(false);

  const BoxRef = forwardRef((props, ref) => (
    <Box {...props} ref={ref}>
      {props.children}
    </Box>
  ));
  const FabRef = forwardRef((props, ref) => (
    <Fab ref={ref} {...props}>
      {props.children}
    </Fab>
  ));
  const handleFab = useCallback(() => {
    const selectorElement = selectorRef.current;
    const fabElement = fabRef.current;
    if (!fabElement || !selectorElement) return;
    clearInterval(scrollIntervalId);
    scrollIntervalId = setInterval(() => {
      if (isInViewport(selectorElement)) {
        fabElement.classList.remove("flex");
        fabElement.classList.add("hide");
        return;
      }
      fabElement.classList.add("flex");
      fabElement.classList.remove("hide");
    }, 150);
  }, [fabRef, selectorRef]);

  const handleCallback = (obj) => {
    if (isReady()) return;
    if (obj && obj.status === "error") setError(true);
    if (obj && obj.status === "ok") {
      setUpdated((prev) => prev + 1);
    }
  };

  const isReady = () => updated === questionnaireList.length || error;

  useEffect(() => {
    window.addEventListener("scroll", handleFab);
    return () => {
      clearInterval(scrollIntervalId);
      window.removeEventListener("scroll", handleFab, false);
    };
  }, [handleFab]);

  return (
    <>
      {isReady() && (
        <BoxRef
          ref={anchorRef}
          sx={{
            position: "relative",
            top: "-64px",
            height: "2px",
            width: "2px",
          }}
        ></BoxRef>
      )}
      {isReady() && (
        <FabRef
          className={"hide"}
          ref={fabRef}
          color="primary"
          aria-label="add"
          size="small"
          sx={{ position: "fixed", bottom: "24px", right: "24px" }}
          onClick={(e) => {
            e.stopPropagation();
            if (!anchorRef.current) return;
            anchorRef.current.scrollIntoView();
          }}
          title="Back to Top"
        >
          <ArrowUpwardIcon aria-label="Back to Top" />
        </FabRef>
      )}
      <Stack className="summaries">
        <BoxRef ref={selectorRef} style={{ opacity: isReady() ? 1 : 0.4 }}>
          <QuestionnaireSelector
            title="Go to Questionnaire"
            list={questionnaireList}
            handleSelectorChange={(event) => {
              setTimeout(
                () =>
                  document
                    .querySelector(
                      `#${QUESTIONNAIRE_ANCHOR_ID_PREFIX}_${event.target.value}`
                    )
                    .scrollIntoView(),
                50
              );
            }}
          ></QuestionnaireSelector>
        </BoxRef>
        {questionnaireList.map((questionnaire, index) => {
          return (
            <Summary
              questionnaire={questionnaire}
              key={`questionnaire_${index}`}
              callbackFunc={handleCallback}
              sectionAnchorPrefix={QUESTIONNAIRE_ANCHOR_ID_PREFIX}
            ></Summary>
          );
        })}
      </Stack>
    </>
  );
}
