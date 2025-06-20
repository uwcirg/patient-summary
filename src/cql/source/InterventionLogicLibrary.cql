library InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireID default ''
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
  LogicHelpers.GetMatchQuestionnaire(QuestionnaireID, QuestionnaireName, QuestionnaireURL)


define QuestionnaresList: 
  [Questionnaire]

// Load Questionnaire
define CurrentQuestionnaire:
  First(Questionnaires)

define QuestionnaireItems:
  CurrentQuestionnaire Q
  return Q.item

//Load Questionnaire responses
define QuestionnaireResponses:
  LogicHelpers.MatchedReponsesByQuestionnaireId([QuestionnaireResponse], QuestionnaireID)

define ResponsesSummary:
  (QuestionnaireResponses) I
  return {
    id: I.id.value,
    date: LogicHelpers.DateTimeText(I.authored),
    responses: LogicHelpers.ResponsesOnly(I.item),
    totalAnsweredItems: Length((I.item) O where PositionOf(O.linkId, ScoringQuestionId) = -1 or PositionOf(ScoringQuestionId, O.linkId) = -1),
    totalItems: 
      if QuestionnaireItems is not null then
        Length(LogicHelpers.GetAnswerLinkIdsByQuestionnaire(CurrentQuestionnaire, ScoringQuestionId))
      else
        Length(I.item),
    authoredDate: I.authored.value,
    lastUpdated: I.meta.lastUpdated.value
  }
  sort by date desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)
