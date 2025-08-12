import QuestionnaireScoringBuilder from "./QuestionnaireScoringBuilder";
import { isEmptyArray } from "@/util";
import { getResourcesByResourceType } from "@/util/fhirUtil";

export class FhirResultBuilder {
  constructor(patientBundle) {
    this.patientBundle = patientBundle;
  }
  // ---------- core utils ----------
  isNil(v) {
    return v == null || v === "";
  }
  coalesce(...vals) {
    return vals.find((v) => !this.isNil(v));
  }
  toMaybeDate(s) {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  toMillis(s) {
    if (!s) return 0;
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : 0;
  }

  normalizeStr(s) {
    return (s ?? "").toString().trim().toLowerCase();
  }
  fuzzyMatch(a, b) {
    const A = this.normalizeStr(a);
    const B = this.normalizeStr(b);
    return A && B ? A.includes(B) || B.includes(A) : false;
  }

  normalizeLinkId(id) {
    return (id ?? "").toString().trim().replace(/^\//, "");
  }
  /**
   * linkId equality with optional matching mode
   * @param {'strict'|'fuzzy'} mode
   */
  linkIdEquals(a, b, mode = "fuzzy") {
    const A = this.normalizeLinkId(a);
    const B = this.normalizeLinkId(b);
    if (mode === "strict") return A === B;
    return A && B && (A.includes(B) || B.includes(A));
  }

  // ---------- CodeableConcept helpers ----------
  conceptText(c) {
    if (!c) return null;
    if (typeof c.text === "string" && c.text.trim()) return c.text;
    if (c.text?.value) return c.text.value;
    const codings = !isEmptyArray(c.coding) ? c.coding : [];
    for (let i = 0; i < codings.length; i++) {
      const d = codings[i]?.display ?? codings[i]?.display?.value;
      if (d) return d;
    }
    for (let i = 0; i < codings.length; i++) {
      const code = codings[i]?.code ?? codings[i]?.code?.value;
      if (code) return code;
    }
    return null;
  }
  conceptCode(c) {
    if (!c || isEmptyArray(c.coding)) return null;
    for (let i = 0; i < c.coding.length; i++) {
      const code = c.coding[i]?.code ?? c.coding[i]?.code?.value;
      if (code) return code;
    }
    return null;
  }

  // ---------- ranges / display ----------
  summarizeReferenceRange(ranges = []) {
    if (isEmptyArray(ranges)) return null;
    const r = ranges[0];
    const low = r?.low,
      high = r?.high;
    if (low?.value != null && high?.value != null) {
      const unit = low.unit ?? low.code ?? high.unit ?? high.code ?? "";
      return `${low.value}–${high.value} ${unit}`.trim();
    }
    if (low?.value != null) return `≥${low.value} ${low.unit ?? low.code ?? ""}`.trim();
    if (high?.value != null) return `≤${high.value} ${high.unit ?? high.code ?? ""}`.trim();
    return r?.text ?? null;
  }
  formatValue({ value, unit }, fallbackText) {
    if (!this.isNil(value)) return unit ? `${value} ${unit}` : String(value);
    return !this.isNil(fallbackText) ? String(fallbackText) : null;
  }
  withRef(valueStr, rangeSummary) {
    if (!valueStr && rangeSummary) return `(ref ${rangeSummary})`;
    if (valueStr && rangeSummary) return `${valueStr} (ref ${rangeSummary})`;
    return valueStr ?? null;
  }

  // ---------- sorting helpers ----------
  sortRowsByDateDesc(rows) {
    if (isEmptyArray(rows)) return rows;
    return rows.sort((a, b) => {
      const ta = a.date instanceof Date ? a.date.getTime() : this.toMillis(a.date);
      const tb = b.date instanceof Date ? b.date.getTime() : this.toMillis(b.date);
      return tb - ta;
    });
  }

  /**
   * Sort newest-first by authoredDate/lastUpdated
   */
  sortByNewestAuthoredOrUpdated(rows) {
    if (isEmptyArray(rows)) return [];
    return rows
      .map((row) => ({
        ...row,
        _sortDate:
          this.toMaybeDate(this.coalesce(row.authoredDate, row.lastUpdated)) ??
          this.coalesce(row.authoredDate, row.lastUpdated) ??
          0,
      }))
      .sort((a, b) => {
        const ta = a._sortDate instanceof Date ? a._sortDate.getTime() : Number(new Date(a._sortDate)) || 0;
        const tb = b._sortDate instanceof Date ? b._sortDate.getTime() : Number(new Date(b._sortDate)) || 0;
        return tb - ta;
      })
      .map(({ _sortDate, ...rest }) => rest);
  }

  build(resourceType, patientBundle, params) {
    const bundle = patientBundle ? patientBundle : this.patientBundle;
    switch (String(resourceType).toLowerCase()) {
      case "condition":
        return new ConditionResultsBuilder().build(getResourcesByResourceType(bundle, "condition"));
      case "observation":
        return new ObservationResultsBuilder().build(getResourcesByResourceType(bundle, "observation"));
      case "questionnaireresponse":
        return new QuestionnaireScoringBuilder(params?.config, bundle).summariesByQuestionnaireFromBundle(
          null,
          params?.options,
        );
      default:
        return bundle;
    }
  }
}

export class ConditionResultsBuilder extends FhirResultBuilder {
  constructor(patientBundle) {
    super(patientBundle);
  }
  build(patientBundle) {
    const conditions = getResourcesByResourceType(patientBundle ?? this.patientBundle, "condition");
    const rows = (conditions || []).map((C) => {
      const oDateRaw = this.coalesce(C.onsetDateTime, C.onsetPeriod?.end, C.onsetPeriod?.start, C.recordedDate);
      const dateForSort = this.toMaybeDate(oDateRaw);

      return {
        id: C.id ?? null,
        condition: this.conceptText(C.code),
        status: this.conceptText(C.verificationStatus),
        clinicalStatus: this.conceptText(C.clinicalStatus) ?? null,
        recordedDate: C.recordedDate ?? null,
        onsetDateTime: oDateRaw ?? null,
        date: dateForSort ?? oDateRaw ?? null,
      };
    });

    return this.sortRowsByDateDesc(rows);
  }
}

export class ObservationResultsBuilder extends FhirResultBuilder {
  constructor(patientBundle) {
    super(patientBundle);
  }
  valueTextFromChoice(O) {
    if (!O) return null;
    if (O.valueCodeableConcept) return this.conceptText(O.valueCodeableConcept);
    if (!this.isNil(O.valueString)) return String(O.valueString);
    if (!this.isNil(O.valueInteger)) return String(O.valueInteger);
    if (!this.isNil(O.valueDateTime)) return String(O.valueDateTime);
    if (!this.isNil(O.valueBoolean)) return String(O.valueBoolean);
    if (O.value && typeof O.value === "object" && "value" in O.value && typeof O.value.value !== "object") {
      return String(O.value.value);
    }
    return null;
  }
  valueBlockFromQuantity(O) {
    if (!O) {
      return {
        value: null,
        unit: null,
      };
    }
    const q = O.valueQuantity ?? (O.value && typeof O.value === "object" && "value" in O.value ? O.value : null);
    if (!q) return { value: null, unit: O.valueCodeableConcept ? null : null };
    return { value: q.value ?? null, unit: O.valueCodeableConcept ? null : (q.unit ?? q.code ?? null) };
  }

  getComponentValues(components = []) {
    const list = !isEmptyArray(components) ? components : [];
    return list.map((c) => {
      const text = this.conceptText(c.code);

      const q = c.valueQuantity ?? (c.value && typeof c.value === "object" && "value" in c.value ? c.value : null);
      const value = q?.value ?? null;
      const unit = c.valueCodeableConcept ? null : q ? (q.unit ?? q.code ?? null) : null;

      let valueText = null;
      if (c.valueCodeableConcept) valueText = this.conceptText(c.valueCodeableConcept);
      else if (!this.isNil(c.valueString)) valueText = String(c.valueString);
      else if (!this.isNil(c.valueInteger)) valueText = String(c.valueInteger);
      else if (!this.isNil(c.valueDateTime)) valueText = String(c.valueDateTime);
      else if (!this.isNil(c.valueBoolean)) valueText = String(c.valueBoolean);
      else if (c.value && typeof c.value === "object" && "value" in c.value && typeof c.value.value !== "object") {
        valueText = String(c.value.value);
      }

      const referenceRange = c.referenceRange ?? [];
      const referenceRangeSummary = this.summarizeReferenceRange(referenceRange);
      const displayValue = this.formatValue({ value, unit }, valueText);
      const displayValueWithRef = this.withRef(displayValue, referenceRangeSummary);

      return {
        text,
        value,
        valueText,
        unit,
        interpretation: this.conceptText(c.interpretation?.[0]) ?? null,
        interpretationCode: this.conceptCode(c.interpretation?.[0]) ?? null,
        referenceRange,
        referenceRangeSummary,
        displayValue,
        displayValueWithRef,
      };
    });
  }

  build(patientBundle) {
    const bundle = patientBundle ?? this.patientBundle;
    const observations = getResourcesByResourceType(bundle, "Observation");
    const rows = (observations || []).map((O) => {
      const oDateRaw = this.coalesce(
        O.effectiveDateTime,
        O.effectiveInstant,
        O.effectivePeriod?.end,
        O.effectivePeriod?.start,
        O.issued,
      );
      const dateForSort = this.toMaybeDate(oDateRaw);
      const categoryFirst = !isEmptyArray(O.category)? O.category[0] : null;

      const valueBlock = this.valueBlockFromQuantity(O);
      const valueText = this.valueTextFromChoice(O);
      const referenceRange = O.referenceRange ?? [];
      const referenceRangeSummary = this.summarizeReferenceRange(referenceRange);
      const displayValue = this.formatValue(valueBlock, valueText);
      const displayValueWithRef = this.withRef(displayValue, referenceRangeSummary);

      return {
        id: O.id ?? null,
        category: this.conceptText(categoryFirst),
        status: O.status ?? null,
        displayText: this.conceptText(O.code),
        componentValues: this.getComponentValues(O.component),
        value: valueBlock,
        valueText,
        dateText: oDateRaw ?? null,
        date: dateForSort ?? oDateRaw ?? null,
        interpretation: this.conceptText(O.interpretation?.[0]) ?? null,
        interpretationCode: this.conceptCode(O.interpretation?.[0]) ?? null,
        referenceRange,
        referenceRangeSummary,
        displayValue,
        displayValueWithRef,
      };
    });

    return this.sortRowsByDateDesc(rows);
  }
}

export default FhirResultBuilder;
