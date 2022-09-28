library MINICOG_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireName default 'MINICOG'
parameter QuestionnaireURL default 'http://www.cdc.gov/ncbddd/fasd/minicog'

// -----------------------------------------------------------------------------
// PATIENT INFORMATION
// -----------------------------------------------------------------------------
context Patient

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------
// Returns a text representation of a dateTime using the CQL `ToString` function.
// @param d - a FHIR dateTime to get text for
// @returns {System.String} the text representation of the dateTime
define function DateTimeText(d FHIR.dateTime):
  ToString(d.value)


//------------------------------------------------------------------------------
// QUESTIONNAIRE & QUESTIONNAIRERESPONSE LOGIC
//------------------------------------------------------------------------------

define question1Id: 'minicog-question1'
define question2Id: 'minicog-question2'
define scoringQuestionId: 'minicog-total-score'


define function MatchedQuestionnaireByReponses(responses FHIR.QuestionnaireResponse):
  ([Questionnaire] Q
    where 
    (Q.id = QuestionnaireName or Q.url.value = QuestionnaireURL) 
    and (
      (
        PositionOf(Q.name, responses.questionnaire.value) != -1 or
        PositionOf(Q.id, responses.questionnaire.value) != -1
      ) and 
      responses.status.value = 'completed')
  )

// Load Questionnaire
define CurrentQuestionnaire:
  First([Questionnaire] Q
    where Q.url.value = QuestionnaireURL)

define QuestionnaireItems:
  CurrentQuestionnaire Q
  return Q.item

// Load Questionnaire responses
define QuestionnaireResponses:
  ([QuestionnaireResponse] QR
    where Length(MatchedQuestionnaireByReponses(QR)) > 0
  )

define function FormattedResponses(responses List<FHIR.QuestionnaireResponse.Item>):
  responses R 
  return {
    id: R.linkId.value,
    answer: R.answer[0].value.value,
    value: R.answer[0].value,
    question: if R.linkId.value = scoringQuestionId then '<b>' + R.text.value + '</b>' else R.text.value,
    text: R.text.value
  }
  sort by id asc


define ResponsesSummary:
  (QuestionnaireResponses) I
  return {
    date: DateTimeText(I.authored),
    responses: FormattedResponses(I.item)
  }
  sort by date desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return FormattedResponses(I.item)

define ChartData:
  ResponsesSummary R 
  return {
    date: R.date,
    word_recall: First((R.responses) I where I.id = question1Id return I.value.value),
    clock_draw: First((R.responses) I where I.id = question2Id return I.value.value),
    total: First((R.responses) I where I.id = scoringQuestionId return I.value.value)
  }
  sort by date
