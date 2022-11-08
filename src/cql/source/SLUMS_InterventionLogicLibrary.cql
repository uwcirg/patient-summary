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

define Questionnaires:
  ([Questionnaire] Q
    where 
    Q.url.value = QuestionnaireURL or 
    Lower(Q.name) = Lower(QuestionnaireName) or
    PositionOf(Lower(QuestionnaireName), Lower(Q.id)) != -1 or
    PositionOf(Lower(QuestionnaireName), Lower(Q.name)) != -1 or
    PositionOf(Lower(Q.name), Lower(QuestionnaireName)) != -1
  )

// Load Questionnaire
define CurrentQuestionnaire:
  First(Questionnaires)

define QuestionnaireItems:
  CurrentQuestionnaire Q
  return Q.item

// Load Questionnaire responses
define QuestionnaireResponses:
  ([QuestionnaireResponse] QR
    where Length(LogicHelpers.MatchedQuestionnaireByReponses(QR)) > 0
  )

define ResponsesSummary:
  (QuestionnaireResponses) I
  let
    responses: LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)
  return {
    date: LogicHelpers.DateTimeText(I.authored),
    responses: responses,
    score: responses[0].value.value,
    authoredDate: I.authored,
    lastUpdated: I.meta.lastUpdated.value
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
