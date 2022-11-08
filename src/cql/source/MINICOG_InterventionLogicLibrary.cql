library MINICOG_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
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

// Load Questionnaire
define CurrentQuestionnaire:
  First([Questionnaire] Q
    where 
    Q.url.value = QuestionnaireURL or
    PositionOf(QuestionnaireName, Q.id) != -1 or
    PositionOf(Lower(QuestionnaireName), Lower(Q.name)) != -1 or
    PositionOf(Lower(Q.name), Lower(QuestionnaireName)) != -1
  )

define QuestionnaireItems:
  CurrentQuestionnaire Q
  return Q.item

// Load Questionnaire responses
define QuestionnaireResponses:
  ([QuestionnaireResponse] QR
    where Length(LogicHelpers.MatchedQuestionnaireByReponses(QR)) > 0
  )

define ResponsesSummary:
  (QuestionnaireResponses) I
  let
    responses: LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, scoringQuestionId),
    word_recall_score: Coalesce(First((responses) I where I.id = question1Id return I.value.value), 0),
    clock_draw_score: Coalesce(First((responses) I where I.id = question2Id return I.value.value), 0)
  return {
    date: LogicHelpers.DateTimeText(I.authored),
    responses: (responses R where 
    R.id != 'minicog-question1-instruction' and 
    R.id != 'minicog-question2-instruction' and 
    R.id != 'minicog-total-score-explanation' and
    R.id != 'minicog-questionnaire-footnote'),
    score: (word_recall_score as Integer) + (clock_draw_score as Integer),
    word_recall_score: word_recall_score,
    clock_draw_score: clock_draw_score,
    authoredDate: I.authored,
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
