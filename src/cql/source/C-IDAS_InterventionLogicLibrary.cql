library CIDAS_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireName default 'c-idas'
parameter QuestionnaireURL default 'http://www.cdc.gov/ncbddd/fasd/c-idas'
parameter ScoringQuestionId default 'c-ids-score'

// -----------------------------------------------------------------------------
// PATIENT INFORMATION
// -----------------------------------------------------------------------------
context Patient


define question1LinkId: 'cs-idas-1'
define question2LinkId: 'cs-idas-2'
define question3LinkId: 'cs-idas-3'
define question4LinkId: 'cs-idas-4'
define question5LinkId: 'cs-idas-5'
define question6LinkId: 'cs-idas-6'
define question7LinkId: 'cs-idas-7'
define question8LinkId: 'cs-idas-8'
define question9LinkId: 'cs-idas-9'
define question10LinkId: 'cs-idas-10'
define question11LinkId: 'cs-idas-11'
define question12LinkId: 'cs-idas-12'
define question13LinkId: 'cs-idas-13'
define question14LinkId: 'cs-idas-14'
define question15LinkId: 'cs-idas-15'
define question16LinkId: 'cs-idas-16'
define question17LinkId: 'cs-idas-17'
define question18LinkId: 'cs-idas-18'

define Questionnaires:
  ([Questionnaire] Q
    where 
    Q.url.value = QuestionnaireURL or 
    Lower(Q.name) = Lower(QuestionnaireName) or
    PositionOf(Lower(QuestionnaireName), Lower(Q.id)) != -1 or
    PositionOf(Lower(QuestionnaireName), Lower(Q.name)) != -1 or
    PositionOf(Lower(Q.name), Lower(QuestionnaireName)) != -1
  )

// Load Questionnaire
define CurrentQuestionnaire:
  First(Questionnaires)

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
  return {
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
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question10LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question11LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question12LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question13LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question14LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question15LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question16LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question17LinkId)), 0) +
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question18LinkId)), 0),
    authoredDate: I.authored,
    lastUpdated: I.meta.lastUpdated.value
  }
  sort by authoredDate desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)

define ChartData:
  if ScoringQuestionId is null or ScoringQuestionId = '' then null
  else (
    ResponsesSummary R 
    return {
      date: R.date,
      total: R.score as Integer
    }
  )