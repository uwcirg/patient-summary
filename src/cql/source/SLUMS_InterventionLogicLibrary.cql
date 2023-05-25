library SLUMS_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireName default 'slums'
parameter QuestionnaireURL default 'http://www.cdc.gov/ncbddd/fasd/slums'
parameter ScoringQuestionId default '71492-3'

// -----------------------------------------------------------------------------
// PATIENT INFORMATION
// -----------------------------------------------------------------------------
context Patient


define scoringParams: {
  maximumScore: 30
}

// Load Questionnaire
define Questionnaires:
  LogicHelpers.GetMatchQuestionnaire(QuestionnaireName, QuestionnaireURL)

define CurrentQuestionnaire:
  First(Questionnaires)

define QuestionnaireItems:
  CurrentQuestionnaire Q
  return Q.item

// Load Questionnaire responses
define QuestionnaireResponses:
  LogicHelpers.MatchedReponsesByQuestionnaire([QuestionnaireResponse], CurrentQuestionnaire)

define ResponsesSummary:
  (QuestionnaireResponses) I
  let
    responses: LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId),
    score: responses[0].value.value,
    educationLevel: if HasLowerLevelEducation is true then 'low' else 'high',
    scoreSeverity:
        case
          when educationLevel = 'low' and score <= 19 then 'high'
          //TBD
          //when educationLevel = 'low' and score between 20 and 24 then 'moderate'
          when educationLevel = 'high' and score <= 20 then 'high'
          //TBD
          //when educationLevel = 'high' and score between 21 and 26 then 'moderate'
          else 'low'
        end
    return {
      id: I.id.value,
      date: LogicHelpers.DateTimeText(I.authored),
      responses: responses,
      score: score,
      scoreSeverity: scoreSeverity,
      // TBD
      // scoreMeaning: if scoreSeverity = 'high' then 'dementia' else if scoreSeverity = 'moderate' then 'mild neurocognitive disorder' else null,
      scoreMeaning: null,
      comparisonToAlert: 'lower',
      scoringParams: scoringParams,
      totalAnsweredItems: Length((I.item) O where O.linkId.value != ScoringQuestionId),
      totalItems: Length(LogicHelpers.GetAnswerLinkIdsByQuestionnaire(CurrentQuestionnaire, ScoringQuestionId)),
      authoredDate: I.authored.value,
      lastUpdated: I.meta.lastUpdated.value,
      educationLevel: educationLevel
    }
    sort by authoredDate desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)


define LessThanHighSchoolCondition:
  ["Condition"] C where (
    C.code.coding[0].code.value = 'Z55.5'
  )

define HasLowerLevelEducation:
  Length(LessThanHighSchoolCondition) > 0

define FirstResponsesScore:
  (First(ResponsesSummary)) R 
  return R.score

define FirstResponsesScoreSeverity:
  (First(ResponsesSummary)) R 
  return R.scoreSeverity

define FirstResponsesScoreMeaning:
  (First(ResponsesSummary)) R 
  return R.scoreMeaning