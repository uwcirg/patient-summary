library CP_ECOG_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireName default 'cp-ecog'
parameter QuestionnaireURL default 'http://www.cdc.gov/ncbddd/fasd/cp-ecog'
parameter ScoringQuestionId default 'cp-ecog-total-score'

// -----------------------------------------------------------------------------
// PATIENT INFORMATION
// -----------------------------------------------------------------------------
context Patient

define question1LinkId: '/89286-9/89146-5'
define question2LinkId: '/89286-9/89149-9'
define question3LinkId: '/89287-7/89172-1'
define question4LinkId: '/89287-7/89138-2'
define question5LinkId: '/89288-5/89154-9'
define question6LinkId: '/89288-5/89165-5'
define question7LinkId: '/89289-3/89143-2'
define question8LinkId: '/89289-3/89140-8'
define question9LinkId: '/89290-1/89158-0'
define question10LinkId: '/89290-1/89173-9'
define question11LinkId: '/89285-1/89141-6'
define question12LinkId: '/89285-1/89171-3'

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
          Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question12LinkId)), 0),
    authoredDate: I.authored,
    lastUpdated: I.meta.lastUpdated.value
  }
  sort by authoredDate desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId)
