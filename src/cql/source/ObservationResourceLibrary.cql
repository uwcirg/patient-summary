library ObservationResourceLibrary version '1.0.0'

using FHIR version '4.0.1'

include "FHIRHelpers" version '4.0.1' called FHIRHelpers


// -----------------------------------------------------------------------------
// PATIENT INFORMATION
// -----------------------------------------------------------------------------
context Patient

// Returns the first-found display text for a CodeableConcept, looking first at the `text` attribute, then the
// `display` on each `coding` until it finds a non-null value.  Some PEG codes are normalized due to length.
// @param c - a FHIR CodeableConcept to get text from
// @returns {System.String} the display text or null if none is found
define function ConceptText(c FHIR.CodeableConcept):
    Coalesce(c.text.value, Coalesce((c.coding) c2 return c2.display.value))

// Returns a text representation of a dateTime using the CQL `ToString` function.
// @param d - a FHIR dateTime to get text for
// @returns {System.String} the text representation of the dateTime
define function DateTimeText(d FHIR.dateTime):
  ToString(d.value)

/**
 * Extracts the quantity value from an Observation, returning it as a CQL Quantity
 * @param Obs - an observation
 * @returns {System.Quantity} the Observation's value as a quantity, or null if there is no quantity value
 */

define function GetComponentValues(component List<FHIR.Observation.Component>):
  (component) c
    let 
      cq: (c.value as FHIR.Quantity),
      displayText: ConceptText(c.code),
      value: FHIRHelpers.ToQuantity(c.value as FHIR.Quantity),
      valueText: if 
        c.value is CodeableConcept then ConceptText(c.value) else
          case
            when c.value.value is String then c.value.value
            when c.value.value is Integer then ToString(c.value.value as Integer)
            when c.value.value is DateTime then ToString(c.value.value as DateTime)
            when c.value.value is Boolean then ToString(c.value.value as Boolean)
            else null
          end,
        valueUnit: if c.value is CodeableConcept then 
                    null 
                  else
                    if cq.unit.value is not null then
                      cq.unit.value else cq.code.value
    return  {
                text: displayText,
                value: cq.value.value,
                valueText: valueText,
                unit: valueUnit
            }

define Results:
  ([Observation]) O
  let
    value: (O.value as FHIR.Quantity),
    valueUnit: if O.value is CodeableConcept then null else if O.value.unit.value is not null then  O.value.unit.value else O.value.code.value,
    oDate: Coalesce(
      (O.effective as FHIR.dateTime).value,
      (O.effective as FHIR.instant).value,
      (O.effective as FHIR.Period)."end".value,
      (O.effective as FHIR.Period)."start".value,
      O.issued.value)
    return {
      id: O.id.value,
      category: ConceptText(O.category[0]),
      status: O.status.value,
      displayText: ConceptText(O.code),
      componentValues: GetComponentValues(O.component),
      value: {
        value: value.value.value,
        unit: valueUnit
      },
      valueText: if 
        O.value is CodeableConcept then ConceptText(O.value) else
          case
            when O.value.value is String then O.value.value
            when O.value.value is Integer then ToString(O.value.value as Integer)
            when O.value.value is DateTime then ToString(O.value.value as DateTime)
            when O.value.value is Boolean then ToString(O.value.value as Boolean)
            else null
          end,
      dateText: ToString(oDate),
      date: oDate
    }
    sort by date desc
