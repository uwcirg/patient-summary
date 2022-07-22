library PHQ9_InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireName default 'PHQ9'
parameter QuestionnaireURL default 'http://www.cdc.gov/ncbddd/fasd/phq9'

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

define scoringQuestionId: '/44261-6'

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
    where (QR.questionnaire.value = QuestionnaireURL or
    Lower(QR.identifier.value) ~ Lower(QuestionnaireName)) and QR.status.value = 'completed'
  )

define function FormattedResponses(responses List<FHIR.QuestionnaireResponse.Item>):
  responses R 
  return {
    id: R.linkId.value,
   answer: case
      //answer in FHIR coding format 
      when R.answer[0].value is FHIR.Coding then R.answer[0].value.display.value
      else R.answer[0].value.value
    end,
    value: R.answer[0].value,
    question: if R.linkId.value = scoringQuestionId then '<b>' + R.text.value + '</b>' else R.text.value,
    text: R.text.value
  }


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
    total: First((R.responses) I where I.id = scoringQuestionId return I.value.value)
  }
  sort by date
