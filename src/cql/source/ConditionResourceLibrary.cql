library ConditionResourceLibrary version '1.0.0'

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
    Coalesce(c.text.value, Coalesce((c.coding) c2 return c2.display.value), Coalesce((c.coding) c2 return c2.code.value))

// Returns a text representation of a dateTime using the CQL `ToString` function.
// @param d - a FHIR dateTime to get text for
// @returns {System.String} the text representation of the dateTime
define function DateTimeText(d FHIR.dateTime):
  ToString(d.value)

define Results:
  [Condition] C
  let
    oDate: Coalesce(
    (C.onset as FHIR.dateTime).value,
    (C.onset as FHIR.Period)."end".value,
    (C.onset as FHIR.Period)."start".value,
    C.recordedDate.value)
  return {
    id: C.id.value,
    condition: ConceptText(C.code),
    status: ConceptText(C.verificationStatus),
    recordedDate: DateTimeText(C.recordedDate),
    onsetDateTime: ToString(oDate),
    date: oDate
  }
  sort by date desc
