library MINICOG_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireID default 'CIRG-MINICOG'
parameter QuestionnaireName default 'MINICOG'
parameter QuestionnaireURL default 'http://www.cdc.gov/ncbddd/fasd/minicog'

// -----------------------------------------------------------------------------
// PATIENT INFORMATION
// -----------------------------------------------------------------------------
context Patient

//------------------------------------------------------------------------------
// QUESTIONNAIRE & QUESTIONNAIRERESPONSE LOGIC
//------------------------------------------------------------------------------

define question1Id: 'minicog-question1'
define question2Id: 'minicog-question2'
define scoringQuestionId: 'minicog-total-score'

define scoringParams: {
  maximumScore: 5
}

// Load Questionnaire
define Questionnaires:
  LogicHelpers.GetMatchQuestionnaire(QuestionnaireID, QuestionnaireName, QuestionnaireURL)

// Load Questionnaire
define CurrentQuestionnaire:
  First(Questionnaires)

define QuestionnaireItems:
  CurrentQuestionnaire Q
  return Q.item

// Load Questionnaire responses
define QuestionnaireResponses:
  LogicHelpers.MatchedReponsesByQuestionnaire([QuestionnaireResponse], QuestionnaireID, QuestionnaireName)

define ResponsesSummary:
  (QuestionnaireResponses) I
  let
    responses: LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, scoringQuestionId),
    answeredResponses: (responses R where R.id != 'minicog-question1-instruction' and R.id != 'minicog-question2-instruction' and R.id != 'minicog-total-score-explanation' and R.id != 'minicog-questionnaire-footnote'),
    scoredResponses: (I.item R where 
      R.linkId.value != 'minicog-question1-instruction' and 
      R.linkId.value != 'minicog-question2-instruction' and 
      R.linkId.value != 'minicog-total-score-explanation' and
      R.linkId.value != 'minicog-questionnaire-footnote' and
      R.linkId.value != scoringQuestionId),
    word_recall_score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question1Id)), 0),
    clock_draw_score:  Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question2Id)), 0),
    score: word_recall_score + clock_draw_score,
    scoreSeverity: if score between 0 and 5 then 'high' else 'low'
    return {
      id: I.id.value,
      date: LogicHelpers.DateTimeText(I.authored),
      responses: answeredResponses,
      score: if Length(scoredResponses) > 0 then score else null,
      scoreSeverity: scoreSeverity,
      highSeverityScoreCutoff: 3,
      comparisonToAlert: 'lower',
      totalAnsweredItems: Length((I.item) O where O.linkId.value != scoringQuestionId),
      totalItems: Length(LogicHelpers.GetAnswerLinkIdsByQuestionnaire(CurrentQuestionnaire, scoringQuestionId)),
      word_recall_score: word_recall_score,
      clock_draw_score: clock_draw_score,
      scoringParams: scoringParams,
      authoredDate: I.authored.value,
      lastUpdated: I.meta.lastUpdated.value
    }
    sort by authoredDate desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, scoringQuestionId)

define ChartData:
  ResponsesSummary R
  return {
    date: R.date,
    word_recall: R.word_recall_score,
    clock_draw: R.clock_draw_score,
    total: R.score
  }

define FirstResponsesScore:
  (First(ResponsesSummary)) R 
  return R.score

define FirstResponsesScoreSeverity:
  (First(ResponsesSummary)) R 
  return R.scoreSeverity

// define FirstResponsesScoreMeaning:
//   (First(ResponsesSummary)) R 
//   return R.scoreMeaning
