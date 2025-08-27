import { coalesce, isEmptyArray, toMaybeDate, toMillis } from "@util";
import Condition from "@models/Condition";
import Observation from "@models/Observation";
import QuestionnaireScoringBuilder from "./QuestionnaireScoringBuilder";
import {
  conceptCode,
  conceptText,
  formatValueQuantity,
  getComponentValues,
  getReferenceRangeDisplay,
  getResourcesByResourceType,
  getValueBlockFromQuantity,
  getValueDisplayWithRef,
  getValueText,
} from "@/util/fhirUtil";

export class FhirResultBuilder {
  constructor(patientBundle) {
    this.patientBundle = patientBundle;
  }

  // ---------- sorting helpers ----------
  sortRowsByDateDesc(rows) {
    if (isEmptyArray(rows)) return rows;
    return rows.sort((a, b) => {
      const ta = a.date instanceof Date ? a.date.getTime() : toMillis(a.date);
      const tb = b.date instanceof Date ? b.date.getTime() : toMillis(b.date);
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
          toMaybeDate(coalesce(row.authoredDate, row.lastUpdated)) ?? coalesce(row.authoredDate, row.lastUpdated) ?? 0,
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
  formattData(data) {
    if (!data) return null;
    const goodData = Condition.getGoodData(data);
    return goodData.map((item) => {
      const o = new Condition(item);
      return o.toObj();
    });
  }
  build(patientBundle) {
    const conditions = getResourcesByResourceType(patientBundle ?? this.patientBundle, "condition");
    const rows = (conditions || []).map((C) => {
      const oDateRaw = coalesce(C.onsetDateTime, C.onsetPeriod?.end, C.onsetPeriod?.start, C.recordedDate);
      const dateForSort = toMaybeDate(oDateRaw);

      return {
        id: C.id ?? null,
        condition: conceptText(C.code),
        status: conceptText(C.verificationStatus),
        clinicalStatus: conceptText(C.clinicalStatus) ?? null,
        recordedDate: C.recordedDate ?? null,
        onsetDateTime: oDateRaw ?? null,
        date: dateForSort ?? oDateRaw ?? null,
      };
    });

    return this.formattData(this.sortRowsByDateDesc(rows));
  }
}

export class ObservationResultsBuilder extends FhirResultBuilder {
  constructor(patientBundle) {
    super(patientBundle);
  }

  formatData(data) {
    if (!data) return null;
    const goodData = Observation.getGoodData(data);
    return goodData
      .map((item) => {
        const o = new Observation(item);
        return o.toObj();
      })
      .sort((a, b) => {
        return new Date(b.dateText).getTime() - new Date(a.dateText).getTime();
      });
  }

  build(patientBundle) {
    const bundle = patientBundle ?? this.patientBundle;
    const observations = getResourcesByResourceType(bundle, "Observation");
    const rows = (observations || []).map((O) => {
      const oDateRaw = coalesce(
        O.effectiveDateTime,
        O.effectiveInstant,
        O.effectivePeriod?.end,
        O.effectivePeriod?.start,
        O.issued,
      );
      const dateForSort = toMaybeDate(oDateRaw);
      const categoryFirst = !isEmptyArray(O.category) ? O.category[0] : null;
      const valueBlock = getValueBlockFromQuantity(O);
      const valueText = getValueText(O);
      const referenceRange = O.referenceRange ?? [];
      const referenceRangeSummary = getReferenceRangeDisplay(referenceRange);
      const displayValue = formatValueQuantity(valueBlock, valueText);
      const displayValueWithRef = getValueDisplayWithRef(displayValue, referenceRangeSummary);

      return {
        id: O.id ?? null,
        category: conceptText(categoryFirst),
        status: O.status ?? null,
        displayText: conceptText(O.code),
        componentValues: getComponentValues(O.component),
        value: valueBlock,
        valueText,
        dateText: oDateRaw ?? null,
        date: dateForSort ?? oDateRaw ?? null,
        interpretation: conceptText(O.interpretation?.[0]) ?? null,
        interpretationCode: conceptCode(O.interpretation?.[0]) ?? null,
        referenceRange,
        referenceRangeSummary,
        displayValue,
        displayValueWithRef,
      };
    });

    return this.formatData(this.sortRowsByDateDesc(rows));
  }
}

export default FhirResultBuilder;
