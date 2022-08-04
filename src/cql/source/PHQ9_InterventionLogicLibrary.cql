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
    Lower(QR.identifier.value) ~ Lower(QuestionnaireName) or
    PositionOf(CurrentQuestionnaire.id, QR.questionnaire.value) != -1) and QR.status.value = 'completed'
  )
  
define function GetResponseAnswerByLinkId(linkId String, responses List<FHIR.QuestionnaireResponse.Item>):
  (responses r where r.linkId.value = linkId) I
  return case
      //answer in FHIR coding format 
      when I.answer[0].value is FHIR.Coding then I.answer[0].value.display.value
      else I.answer[0].value.value
    end

define function GetResponseValueByLinkId(linkId String, responses List<FHIR.QuestionnaireResponse.Item>):
  (responses r where r.linkId.value = linkId) I
  return I.answer[0].value

define function FormattedResponses(responses List<FHIR.QuestionnaireResponse.Item>):
  QuestionnaireItems Q
  return {
    id: Q.linkId.value,
    answer: singleton from (GetResponseAnswerByLinkId(Q.linkId.value, responses)),
    value: singleton from (GetResponseValueByLinkId(Q.linkId.value, responses)),
    question: if Q.linkId.value= scoringQuestionId then '<b>' + Q.text.value + '</b>' else Q.text.value,
    text: Q.text.value
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
