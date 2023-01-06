library PHQ9_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireName default 'phq9'
parameter QuestionnaireURL default 'http://www.cdc.gov/ncbddd/fasd/phq9'
parameter ScoringQuestionId default '/44261-6'

// -----------------------------------------------------------------------------
// PATIENT INFORMATION
// -----------------------------------------------------------------------------
context Patient


define question1LinkId: '/44250-9'
define question2LinkId: '/44255-8'
define question3LinkId: '/44259-0'
define question4LinkId: '/44254-1'
define question5LinkId: '/44251-7'
define question6LinkId: '/44258-2'
define question7LinkId: '/44252-5'
define question8LinkId: '/44253-3'
define question9LinkId: '/44260-8'
define question10LinkId: '/69722-7'

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
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question10LinkId)), 0),
    authoredDate: I.authored,
    lastUpdated: I.meta.lastUpdated.value
  }
  sort by authoredDate desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)
