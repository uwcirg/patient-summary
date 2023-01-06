library InterventionLogicLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers

// -----------------------------------------------------------------------------
// PARAMETERS
// -----------------------------------------------------------------------------
parameter QuestionnaireName default ''
parameter QuestionnaireURL default ''
parameter ScoringQuestionId default ''

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


define function MatchedQuestionnaireByReponses(responses FHIR.QuestionnaireResponse):
  (Questionnaires Q
    where 
    (
      (
        PositionOf(Lower(Q.name), Lower(responses.questionnaire.value)) != -1 or
        PositionOf(Lower(Q.id), Lower(responses.questionnaire.value)) != -1
      ) and 
      responses.status.value = 'completed')
  )

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
    where Length(MatchedQuestionnaireByReponses(QR)) > 0
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
  ((QuestionnaireItems) O where O.linkId.value != 'introduction') Q
    let
      answerText: GetResponseAnswerByLinkId(Q.linkId.value, responses),
      answerValue: GetResponseValueByLinkId(Q.linkId.value, responses)

    return {
      id: Q.linkId.value,
      answer: if answerText is not null then First(answerText) else null,
      value: if answerValue is not null then First(answerValue) else null,
      question: if Q.linkId.value = ScoringQuestionId then '<b>' + Q.text.value + '</b>' else Q.text.value,
      text: Q.text.value
    }


define ResponsesSummary:
  (QuestionnaireResponses) I
  return {
    id: I.id.value,
    date: DateTimeText(I.authored),
    responses: FormattedResponses(I.item),
    authoredDate: I.authored,
    lastUpdated: I.meta.lastUpdated.value
  }
  sort by authoredDate desc, lastUpdated desc

define ResponsesOnly:
  (QuestionnaireResponses) I
  return FormattedResponses(I.item)

define ChartData:
  if ScoringQuestionId is null or ScoringQuestionId = '' then null
  else (
    ResponsesSummary R 
    return {
      date: R.date,
      total: First((R.responses) I where I.id = ScoringQuestionId return I.value.value)
    }
  )
