library ADL_IADL_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireName default 'adl-iadl'
parameter QuestionnaireURL default 'http://www.cdc.gov/ncbddd/fasd/adl-iadl'
parameter ScoringQuestionId default 'adl-iadls-total-score'

// -----------------------------------------------------------------------------
// PATIENT INFORMATION
// -----------------------------------------------------------------------------
context Patient

define question1LinkId: '/46595-5'
define question2LinkId: '/46597-1'
define question3LinkId: '/46599-7'
define question4LinkId: '/57243-8'
define question5LinkId: '/57244-6'
define question6LinkId: '/57245-3'
define question7LinkId: '/57246-1'
define question8LinkId: '/57247-9'
define question9LinkId: '/57248-7'
define question10LinkId: '/57249-5'
define question11LinkId: '/46569-0'

define scoringParams: {
  maximumScore: 45
}

define Questionnaires:
  LogicHelpers.GetMatchQuestionnaire(QuestionnaireName, QuestionnaireURL)

// Load Questionnaire
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
  return {
    id: I.id.value,
    date: LogicHelpers.DateTimeText(I.authored),
    responses: LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId),
    score: 
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question1LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question2LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question3LinkId)), 0) + 
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question4LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question5LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question6LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question7LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question8LinkId)), 0) + 
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question9LinkId)), 0) + 
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question10LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question11LinkId)), 0),
    scoringParams: scoringParams,
    authoredDate: I.authored,
    lastUpdated: I.meta.lastUpdated.value
  }
  sort by authoredDate desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)
