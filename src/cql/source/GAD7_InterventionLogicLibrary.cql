library GAD7_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

define QuestionnaireName:'gad7'
define QuestionnaireURL: 'http://www.cdc.gov/ncbddd/fasd/gad7'
define ScoringQuestionId: '/70274-6'

// -----------------------------------------------------------------------------
// PATIENT INFORMATION
// -----------------------------------------------------------------------------
context Patient

define question1LinkId: '/69725-0'
define question2LinkId: '/68509-9'
define question3LinkId: '/69733-4'
define question4LinkId: '/69734-2'
define question5LinkId: '/69735-9'
define question6LinkId: '/69689-8'
define question7LinkId: '/69736-7'

define scoringParams: {
  maximumScore: 21
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
            (
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question1LinkId)), 0) +
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question2LinkId)), 0) +
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question3LinkId)), 0) + 
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question4LinkId)), 0) +
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question5LinkId)), 0) +
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question6LinkId)), 0) +
            Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question7LinkId)), 0))
          else null
    return {
      id: I.id.value,
      date: LogicHelpers.DateTimeText(I.authored),
      responses: LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId),
      currentQ: CurrentQuestionnaire,
      items: I.item,
      score: score,
      scoreSeverity: 
        case
          when score > 14 then 'high'
          when score between 10 and 14 then 'moderate'
          when score between 5 and 9 then 'mild'
          else 'low'
        end,
      scoringParams: scoringParams,
      authoredDate: I.authored,
      lastUpdated: I.meta.lastUpdated.value
    }
    sort by authoredDate desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)

define FirstResponsesScore:
  (First(ResponsesSummary)) R 
  return R.score

define FirstResponsesScoreSeverity:
  (First(ResponsesSummary)) R 
  return R.scoreSeverity
