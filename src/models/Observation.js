import { getCorrectedISODate, isEmptyArray } from "../util";

// source: Results in cql/source/src/cql/ObservationResourceLibrary.json
class Observation {
  constructor(dataObj) {
    this.data = Object.assign({}, dataObj);
  }
  get id() {
    return this.data.id;
  }
  get category() {
    return this.data.category;
  }
  get status() {
    return this.data.status;
  }
  get displayText() {
    return this.data.displayText;
  }
  get dateText() {
    return getCorrectedISODate(this.data.dateText);
  }
  get valueText() {
    if (!isEmptyArray(this.data.componentValues)) {
      return this.data.componentValues
        .map((o) => {
          const displayValue = (o.value ?? "") + " " + (o.unit ?? "");
          return o.text ? o.text + ": " + displayValue : displayValue;
        })
        .join("; ");
    }
    if (this.data.valueText) return this.data.valueText;
    if (this.data.value && this.data.value.value) {
      return [this.data.value.value, this.data.value.unit ?? ""].join(" ");
    }
    return "";
  }

  toObj() {
    return {
      id: this.id,
      category: this.category,
      status: this.status,
      displayText: this.displayText,
      valueText: this.valueText,
      dateText: this.dateText,
    };
  }

  static getGoodData(data) {
    return data.filter(
      (item) =>
        item.componentValues ||
        (item.value && item.value.value) ||
        item.valueText
    );
  }
}
export default Observation;
