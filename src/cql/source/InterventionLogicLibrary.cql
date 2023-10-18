library InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireName default ''
parameter QuestionnaireURL default ''
parameter ScoringQuestionId default ''

// -----------------------------------------------------------------------------
// PATIENT INFORMATION
// -----------------------------------------------------------------------------
context Patient

//------------------------------------------------------------------------------
// QUESTIONNAIRE & QUESTIONNAIRERESPONSE LOGIC
//------------------------------------------------------------------------------

define Questionnaires:
  LogicHelpers.GetMatchQuestionnaire(QuestionnaireName, QuestionnaireURL)

// Load Questionnaire
define CurrentQuestionnaire:
  First(Questionnaires)

define QuestionnaireItems:
  CurrentQuestionnaire Q
  return Q.item

//Load Questionnaire responses
define QuestionnaireResponses:
  if QuestionnaireItems is not null then 
    LogicHelpers.MatchedReponsesByQuestionnaire([QuestionnaireResponse], CurrentQuestionnaire)
  else
    LogicHelpers.MatchedReponsesByQuestionnaireName([QuestionnaireResponse], QuestionnaireName)

define ResponsesSummary:
  (QuestionnaireResponses) I
  return {
    id: I.id.value,
    date: LogicHelpers.DateTimeText(I.authored),
    responses: 
      if QuestionnaireItems is not null then
        LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)
      else
        LogicHelpers.ResponsesOnly(I.item),
    totalAnsweredItems: Length((I.item) O where O.linkId.value != ScoringQuestionId),
    totalItems: 
      if QuestionnaireItems is not null then
        Length(LogicHelpers.GetAnswerLinkIdsByQuestionnaire(CurrentQuestionnaire, ScoringQuestionId))
      else
        Length(I.item),
   // totalItems: Length(LogicHelpers.GetAnswerLinkIdsByQuestionnaire(CurrentQuestionnaire, ScoringQuestionId)),
    authoredDate: I.authored.value,
    lastUpdated: I.meta.lastUpdated.value
  }
  sort by date desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)
