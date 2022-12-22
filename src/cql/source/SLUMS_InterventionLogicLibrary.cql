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
    responses: LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)
  return {
    date: LogicHelpers.DateTimeText(I.authored),
    responses: responses,
    score: responses[0].value.value,
    authoredDate: I.authored,
    lastUpdated: I.meta.lastUpdated.value,
    educationLevel: if HasLowerLevelEducation is true then 'low' else 'high'
  }
  sort by authoredDate desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)

define ChartData:
  if ScoringQuestionId is null or ScoringQuestionId = '' then null
  else (
    ResponsesSummary R 
    return {
      date: R.date,
      total: R.score as Integer
    }
  )

define LessThanHighSchoolCondition:
  ["Condition"] C where (
    C.code.coding[0].code.value = 'Z55.5'
  )

define HasLowerLevelEducation:
  Length(LessThanHighSchoolCondition) > 0
