library PHQ9_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireID default null
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
  LogicHelpers.GetMatchQuestionnaire(QuestionnaireID, QuestionnaireName, QuestionnaireURL)

// Load Questionnaire
define CurrentQuestionnaire:
  First(Questionnaires)

define CurrentQuestionnaireName:
  QuestionnaireName

define CurrentQuestionnaireID:
  QuestionnaireID

define QuestionnaireItems:
  CurrentQuestionnaire Q
  return Q.item

// Load Questionnaire responses
define QuestionnaireResponses:
  LogicHelpers.MatchedReponsesByQuestionnaire([QuestionnaireResponse], QuestionnaireID, QuestionnaireName)

define ResponsesSummary:
  (QuestionnaireResponses) I
  let
    scoredResponses: (I.item R where R.linkId.value != ScoringQuestionId),
    totalItems: if QuestionnaireItems is not null then 
                  Length(LogicHelpers.GetAnswerLinkIdsByQuestionnaire(CurrentQuestionnaire, ScoringQuestionId))
                else
                  Length((I.item) O where 
                          PositionOf(O.linkId, ScoringQuestionId) = -1 or PositionOf(ScoringQuestionId, O.linkId) = -1),
    totalAnsweredItems:  Min({Length(
                                (I.item) O where 
                                  (PositionOf(O.linkId, ScoringQuestionId) = -1 or PositionOf(ScoringQuestionId, O.linkId) = -1)
                                  and O.answer is not null
                                ), totalItems}),
    scoringQuestionScore: if ScoringQuestionId is not null then First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, ScoringQuestionId)) else null,
    question1Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question1LinkId)),
    question2Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question2LinkId)),
    question3Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question3LinkId)),
    question4Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question4LinkId)),
    question5Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question5LinkId)),
    question6Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question6LinkId)),
    question7Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question7LinkId)),
    question8Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question8LinkId)),
    question9Score: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question9LinkId)),
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
              question7Score is not null and
              question8Score is not null and
              question9Score is not null
            ) then 
              Coalesce(question1Score, 0) +
              Coalesce(question2Score, 0) +
              Coalesce(question3Score, 0) + 
              Coalesce(question4Score, 0) +
              Coalesce(question5Score, 0) +
              Coalesce(question6Score, 0) +
              Coalesce(question7Score, 0) +
              Coalesce(question8Score, 0) + 
              Coalesce(question9Score, 0)
            else null
          end,
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
    scoringQuestionScore: scoringQuestionScore,
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
    totalItems: totalItems,
    totalAnsweredItems: totalAnsweredItems,
    authoredDate: I.authored.value,
    lastUpdated: I.meta.lastUpdated.value
  }
  sort by authoredDate desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)
