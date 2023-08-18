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

define scoringParams: {
  maximumScore: 27
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
  let
    scoredResponses: (I.item R where R.linkId.value != ScoringQuestionId),
    score: 
          if Length(scoredResponses) > 0 then 
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question1LinkId)), 0) +
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question2LinkId)), 0) +
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question3LinkId)), 0) + 
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question4LinkId)), 0) +
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question5LinkId)), 0) +
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question6LinkId)), 0) +
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question7LinkId)), 0) +
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question8LinkId)), 0) + 
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question9LinkId)), 0)
          else null,
    scoreSeverity:
      case
        when score >= 20 then 'high'
        when score between 15 and 19 then 'moderately high'
        when score between 10 and 14 then 'moderate'
        when score between 5 and 9 then 'mild'
        else 'low'
      end
  return {
    id: I.id.value,
    date: LogicHelpers.DateTimeText(I.authored),
    responses: LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId),
    score: score,
    scoreSeverity: scoreSeverity,
    highSeverityScoreCutoff: 20,
    scoreMeaning: case
        when scoreSeverity = 'high' then 'severe depression'
        when scoreSeverity = 'moderately high' then 'moderately severe depression'
        when scoreSeverity = 'moderate' then 'moderate depression'
        when scoreSeverity = 'mild' then 'mild depression'
        else null 
      end,
    scoringParams: scoringParams,
    totalAnsweredItems: Length((I.item) O where O.linkId.value != ScoringQuestionId),
    totalItems: Length(LogicHelpers.GetAnswerLinkIdsByQuestionnaire(CurrentQuestionnaire, ScoringQuestionId)),
    authoredDate: I.authored.value,
    lastUpdated: I.meta.lastUpdated.value
  }
  sort by authoredDate desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)
