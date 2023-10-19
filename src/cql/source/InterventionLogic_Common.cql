library InterventionLogic_Common version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers


define AnswerQuestionTypes: {
    'boolean',
    'decimal',
    'integer',
    'date',
    'dateTime',
    'time',
    'string',
    'text',
    'choice',
    'open-choice'
}

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------
// Returns a text representation of a dateTime using the CQL `ToString` function.
// @param d - a FHIR dateTime to get text for
// @returns {System.String} the text representation of the dateTime
define function DateTimeText(d FHIR.dateTime):
  ToString(d.value)



define function GetMatchQuestionnaire(QuestionnaireName String, QuestionnaireURL String):
  ([Questionnaire] Q
    where
    Q.id = QuestionnaireName or
    (Q.url is not null and Q.url.value = QuestionnaireURL) or 
    Lower(Q.name) = Lower(QuestionnaireName) or
    PositionOf(Lower(QuestionnaireName), Lower(Q.name)) != -1 or
    PositionOf(Lower(Q.name), Lower(QuestionnaireName)) != -1
  )

/*
 * retrieve questionnaire responses matched to the target questionnaire
 * @param responses as FHIR.QuestionnaireResponse
 * @param questionnaire as FHIR.Questionnaire to match against
 */
define function MatchedReponsesByQuestionnaire(responses List<FHIR.QuestionnaireResponse>, currentQuestionnaire FHIR.Questionnaire):
  ((responses) Q
    where 
    (
      (
        PositionOf(Lower(currentQuestionnaire.name), Lower(Q.questionnaire.value)) != -1 or
        PositionOf(Lower(currentQuestionnaire.id), Lower(Q.questionnaire.value)) != -1
      ) and 
      Q.status.value = 'completed')
      sort by authored desc, meta.lastUpdated desc
  )

/*
 * retrieve questionnaire responses matched by keyward for questionnaire name
 * @param responses as FHIR.QuestionnaireResponse
 * @param questionnaireName as String to match against
 */
define function MatchedReponsesByQuestionnaireName(responses List<FHIR.QuestionnaireResponse>, QuestionnaireName String):
  ((responses) Q
    where 
    (
      (
        PositionOf(Lower(QuestionnaireName), Lower(Q.questionnaire.value)) != -1 or
        PositionOf(Lower(QuestionnaireName), Lower(Q.questionnaire.value)) != -1
      ) and 
      Q.status.value = 'completed')
      sort by authored desc, meta.lastUpdated desc
  )
  

define function GetAnswerLinkIdsByQuestionnaire(currentQuestionnaire FHIR.Questionnaire, scoringQuestionId String):
  (currentQuestionnaire C) O
  let
    responseItems: ((O.item) I where I.type is not null and I.linkId is not null and IndexOf(AnswerQuestionTypes, I.type.value) != -1 and I.linkId.value != scoringQuestionId)
    return responseItems.linkId.value

/*
 * retrieve answer value by response item
 * @param linkId as String
 * @param responses as a list of FHIR.QuestionnaireResponse.Item
 */
define function GetResponseAnswerByLinkId(linkId String, responses List<FHIR.QuestionnaireResponse.Item>):
  (responses r where r.linkId.value = linkId) I
  return case
      //answer in FHIR coding format 
      when I.answer[0].value is FHIR.Coding then I.answer[0].value.display.value
      else I.answer[0].value.value
    end

/*
 * retrieve answer value FHIR object by response item
 * @param linkId as String
 * @param responses as a list of FHIR.QuestionnaireResponse.Item
 */
define function GetResponseValueByLinkId(linkId String, responses List<FHIR.QuestionnaireResponse.Item>):
  (responses r where r.linkId.value = linkId) I
  return I.answer[0].value

/*
 * retrieve the numeric value for the answer from extension
 * @param a list of elements of type FHIR.Extension
 * @return the value as Integer
 */
define function getAnswerOptionExtensionValue(extList List<FHIR.Extension>):
  (extList e where e.url ~ 'http://hl7.org/fhir/StructureDefinition/ordinalValue')[0].value.value as Integer

/*
 * retrieve the numeric value for the answer based on value code
 * @param questionnaire as FHIR.Questionnaire where code in question is queried
 * @param code as String
 * @return the value as Integer
 */
define function getAnswerValueByCode(questionnaire FHIR.Questionnaire, code String):
  (singleton from ((questionnaire.item.answerOption) Q where Q.value.code = code)) a
  let 
    extensionItem: a.extension
  return if extensionItem is not null then getAnswerOptionExtensionValue(extensionItem) else (0 as Integer)

/*
 * retrieve the numeric value for the score for an questionnaire response item
 * @param questionnaire as FHIR.Questionnaire where answer option code based on link id will be queried
 * @param responses as a list of FHIR.QuestionnaireResponse.Item
 * @param linkId as String
 * @return score in Integer
 */
define function getScoringByResponseItem(questionnaire FHIR.Questionnaire, responses List<FHIR.QuestionnaireResponse.Item>, linkId String):
    (singleton from (((responses) o where o.linkId.value = linkId) I
      let answerCode: I.answer[0].value.code.value
      return 
        if I is null then ({null as Integer})
        else
          case 
            when questionnaire is not null and answerCode is not null then getAnswerValueByCode(questionnaire, answerCode) 
            when  answerCode is not null then
              case
                when answerCode = 'LA6568-5' then 0
                when answerCode = 'LA6569-3' then 1
                when answerCode = 'LA6570-1' then 2
                when answerCode = 'LA6571-9' then 3
                else 0
              end
            else 0 as Integer
          end)
    )

/* 
 * retrieve responses in a list of Tuple of formatted question and answer
 * @param questionnaireItems as a list of FHIR.Questionnaire.Item
 * @param responses as a list FHIR.QuestionnaireResponse.Item
 * @param scoringQuestionId as String
 */
define function FormattedResponses(questionnaireItems List<FHIR.Questionnaire.Item>, responses List<FHIR.QuestionnaireResponse.Item>, scoringQuestionId String):
  ((questionnaireItems) O where O.linkId.value != 'introduction' and O.linkId.value != scoringQuestionId) Q
    let
      answerText: GetResponseAnswerByLinkId(Q.linkId.value, responses),
      answerValue: GetResponseValueByLinkId(Q.linkId.value, responses)

    return {
      id: Q.linkId.value,
      answer: if answerText is not null then First(answerText) else null,
      value: if answerValue is not null then First(answerValue) else null,
      question: if Q.linkId.value = scoringQuestionId then '<b>' + Q.text.value + '</b>' else Q.text.value,
      text: Q.text.value
    }
//return responses from QuestionnaireResponse
// @param responsesItems of type FHIR.QuestionnaireResponse.Item
define function ResponsesOnly(responseItems List<FHIR.QuestionnaireResponse.Item>):
  (responseItems) I
  let
    value: I.answer[0].value.value
  return {
      id: I.linkId.value,
      answer: 
        case
          when value is String then value
          when value is Integer then value
          when value is Date then ToString(value as Date)
          when value is DateTime then ToString(value as DateTime)
          else value
        end,
      value: null,
      valueObject: I.answer[0].value,
      question: I.text.value,
      text: I.text.value
  }


define function ResponsesSummary (
  currentQuestionnaire FHIR.Questionnaire,
  questionnaireResponse FHIR.QuestionnaireResponse,
  scoringQuestionId String
):
  (questionnaireResponse) I
  return {
    id: I.id.value,
    date: DateTimeText(I.authored),
    currentQ: currentQuestionnaire,
    responses: FormattedResponses(currentQuestionnaire.item, I.item, scoringQuestionId),
    items: I.item,
    totalAnsweredItems: Length((I.item) O where O.linkId.value != scoringQuestionId),
    totalItems: Length(GetAnswerLinkIdsByQuestionnaire(currentQuestionnaire, scoringQuestionId)),
    authoredDate: I.authored,
    lastUpdated: I.meta.lastUpdated.value
  }
