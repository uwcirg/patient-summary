library GDS_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireName default 'gds'
parameter QuestionnaireURL default 'http://www.cdc.gov/ncbddd/fasd/gds'
parameter ScoringQuestionId default '/48545-8'

// -----------------------------------------------------------------------------
// PATIENT INFORMATION
// -----------------------------------------------------------------------------
context Patient

define question1LinkId: '/48512-8'
define question2LinkId: '/48513-6'
define question3LinkId: '/48514-4'
define question4LinkId: '/48515-1'
define question5LinkId: '/48518-5'
define question6LinkId: '/48519-3'
define question7LinkId: '/48520-1'
define question8LinkId: '/48521-9'
define question9LinkId: '/48523-5'
define question10LinkId: '/48525-0'
define question11LinkId: '/48526-8'
define question12LinkId: '/48528-4'
define question13LinkId: '/48532-6'
define question14LinkId: '/48533-4'
define question15LinkId: '/48534-2'

define scoringParams: {
  maximumScore: 15
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
    score1: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question1LinkId)),
    score2: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question2LinkId)),
    score3: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question3LinkId)),
    score4: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question4LinkId)),
    score5: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question5LinkId)),
    score6: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question6LinkId)),
    score7: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question7LinkId)),
    score8: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question8LinkId)),
    score9: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question9LinkId)),
    score10: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question10LinkId)),
    score11: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question11LinkId)),
    score12: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question12LinkId)),
    score13: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question13LinkId)),
    score14: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question14LinkId)),
    score15: First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question15LinkId)),
    score: 
      (if score1 is null then 0 else if score1 = 1 then 0 else 1) +
      (if score2 is null then 0 else if score2 = 1 then 1 else 0) +
      (if score3 is null then 0 else if score3 = 1 then 1 else 0) +
      (if score4 is null then 0 else if score4 = 1 then 1 else 0) +
      (if score5 is null then 0 else if score5 = 1 then 0 else 1) +
      (if score6 is null then 0 else if score6 = 1 then 1 else 0) +
      (if score7 is null then 0 else if score7 = 1 then 0 else 1) +
      (if score8 is null then 0 else if score8 = 1 then 1 else 0) +
      (if score9 is null then 0 else if score9 = 1 then 1 else 0) +
      (if score10 is null then 0 else if score10 = 1 then 1 else 0) +
      (if score11 is null then 0 else if score11 = 1 then 0 else 1) +
      (if score12 is null then 0 else if score12 = 1 then 1 else 0) +
      (if score13 is null then 0 else if score13 = 1 then 0 else 1) +
      (if score14 is null then 0 else if score14 = 1 then 1 else 0) +
      (if score15 is null then 0 else if score15 = 1 then 1 else 0),
      scoredResponses: (I.item R where R.linkId.value != ScoringQuestionId),
      scoreSeverity: if score > 4 then 'high' else 'low'
    return {
      id: I.id.value,
      date: LogicHelpers.DateTimeText(I.authored),
      responses: LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId),
      score: if (Length(scoredResponses) > 0) then score else null,
      scoreSeverity: scoreSeverity,
      scoreMeaning: if scoreSeverity = 'high' then 'depression' else null,
      scoringParams: scoringParams,
      totalAnsweredItems: Length((I.item) O where O.linkId.value != ScoringQuestionId),
      totalItems: Length(LogicHelpers.GetAnswerLinkIdsByQuestionnaire(CurrentQuestionnaire, ScoringQuestionId)),
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

define FirstResponsesScoreMeaning:
  (First(ResponsesSummary)) R 
  return R.scoreMeaning