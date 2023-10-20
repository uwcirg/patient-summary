library GAD7_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

parameter QuestionnaireID default null
parameter QuestionnaireName default 'gad7'
parameter QuestionnaireURL default 'http://www.cdc.gov/ncbddd/fasd/gad7'
parameter ScoringQuestionId default '/70274-6'

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
  LogicHelpers.GetMatchQuestionnaire(QuestionnaireID, QuestionnaireName, QuestionnaireURL)

// Load Questionnaire
define CurrentQuestionnaire:
  First(Questionnaires)

define CurrentQuestionnaireName:
  QuestionnaireName

define QuestionnaireItems:
  CurrentQuestionnaire Q
  return Q.item

define sortedResponses:
  [QuestionnaireResponse] QR 
  return QR
  sort by authored desc
// Load Questionnaire responses
define QuestionnaireResponses:
  if QuestionnaireItems is not null then 
    LogicHelpers.MatchedReponsesByQuestionnaire([QuestionnaireResponse], CurrentQuestionnaire)
  else
    LogicHelpers.MatchedReponsesByQuestionnaire([QuestionnaireResponse], QuestionnaireID, QuestionnaireName)

define ResponsesSummary:
  (QuestionnaireResponses) I
  let
    scoringQuestionScore: if ScoringQuestionId is not null then First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, ScoringQuestionId)) else null,
    scoredResponses: (I.item R where PositionOf(R.linkId, ScoringQuestionId) = -1 or PositionOf(ScoringQuestionId, R.linkId) = -1),
    totalItems: if QuestionnaireItems is not null then 
                  Length(LogicHelpers.GetAnswerLinkIdsByQuestionnaire(CurrentQuestionnaire, ScoringQuestionId))
                else
                  Length((I.item) O where PositionOf(O.linkId, ScoringQuestionId) = -1 or PositionOf(ScoringQuestionId, O.linkId) = -1),
    totalAnsweredItems: Min({Length(
                    (I.item) O where 
                            (PositionOf(O.linkId, ScoringQuestionId) = -1 or PositionOf(ScoringQuestionId, O.linkId) = -1)
                            and O.answer is not null
                    ), totalItems}),
    question1Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question1LinkId)),
    question2Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question2LinkId)),
    question3Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question3LinkId)),
    question4Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question4LinkId)),
    question5Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question5LinkId)),
    question6Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question6LinkId)),
    question7Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question7LinkId)),
    score: 
          case
            when scoringQuestionScore is not null then scoringQuestionScore
            when Length(scoredResponses) > 0 and (
              question1Score is not null and
              question2Score is not null and
              question3Score is not null and
              question4Score is not null and
              question5Score is not null and
              question6Score is not null and
              question7Score is not null
            ) then
            (
            Coalesce(question1Score, 0) +
            Coalesce(question2Score, 0) +
            Coalesce(question3Score, 0) + 
            Coalesce(question4Score, 0) +
            Coalesce(question5Score, 0) +
            Coalesce(question6Score, 0) +
            Coalesce(question7Score, 0))
            else null
          end,
    scoreSeverity: 
        case
          when score > 14 then 'high'
          when score between 10 and 14 then 'moderate'
          when score between 5 and 9 then 'mild'
          else 'low'
        end
    return {
      id: I.id.value,
      date: LogicHelpers.DateTimeText(I.authored),
      responses: LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId),
      currentQ: CurrentQuestionnaire,
      items: I.item,
      score: score,
      scoreSeverity: scoreSeverity,
      highSeverityScoreCutoff: 15,
      scoreMeaning: case
        when scoreSeverity = 'high' then 'severe anxiety'
        when scoreSeverity = 'moderate' then 'moderate anxiety'
        when scoreSeverity = 'mild' then 'mild anxiety'
        else if score > 0 then 'minimal anxiety' else '' 
      end,
      scoringParams: scoringParams,
      totalItems: totalItems,
      totalAnsweredItems: totalAnsweredItems,
      authoredDate: I.authored.value,
      lastUpdated: I.meta.lastUpdated.value
    }
    
define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)

define FirstResponsesScore:
  (First(ResponsesSummary)) R 
  return R.score

define FirstResponsesScoreSeverity:
  (First(ResponsesSummary)) R 
  return R.scoreSeverity

define FirstResponsesScoreMeaning:
  (First(ResponsesSummary)) R 
  return R.scoreMeaning