library ECOG12_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

include "InterventionLogic_Common" version '1.0.0' called LogicHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireName default 'ecog12'
parameter QuestionnaireURL default 'http://www.cdc.gov/ncbddd/fasd/ecog12'
parameter ScoringQuestionId default 'ecog12-total-score'

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

define scoringParams: {
  maximumScore: 48
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
    question1Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question1LinkId)), 0),
    question2Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question2LinkId)), 0),
    question3Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question3LinkId)), 0),
    question4Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question4LinkId)), 0),
    question5Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question5LinkId)), 0),
    question6Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question6LinkId)), 0),
    question7Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question7LinkId)), 0),
    question8Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question8LinkId)), 0),
    question9Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question9LinkId)), 0),
    question10Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question10LinkId)), 0),
    question11Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question11LinkId)), 0),
    question12Score: Coalesce(First(LogicHelpers.getScoringByResponseItem(CurrentQuestionnaire, I.item, question12LinkId)), 0)
  return {
    id: I.id.value,
    date: LogicHelpers.DateTimeText(I.authored),
    responses: LogicHelpers.FormattedResponses(QuestionnaireItems, I.item, ScoringQuestionId),
    score: // a value of 9 is for the answer, I don't know
          if (Length(scoredResponses) > 0) then
            (if question1Score = 9 then 0 else question1Score) + 
            (if question2Score = 9 then 0 else question2Score) +
            (if question3Score = 9 then 0 else question3Score) +
            (if question4Score = 9 then 0 else question4Score) +
            (if question5Score = 9 then 0 else question5Score) +
            (if question6Score = 9 then 0 else question6Score) +
            (if question7Score = 9 then 0 else question7Score) +
            (if question8Score = 9 then 0 else question8Score) +
            (if question9Score = 9 then 0 else question9Score) +
            (if question10Score = 9 then 0 else question10Score) +
            (if question11Score = 9 then 0 else question11Score) +
            (if question12Score = 9 then 0 else question12Score)
          else null,
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
