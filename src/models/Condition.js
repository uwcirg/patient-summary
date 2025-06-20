import { getCorrectedISODate } from "../util";

// source: Results in cql/source/src/cql/ConditionResourceLibrary.json
class Condition {
  constructor(dataObj) {
    this.data = Object.assign({}, dataObj);
  }
  get id() {
    return this.data.id;
  }
  get displayText() {
    return this.data.condition;
  }
  get status() {
    return this.data.status;
  }
  get onsetDateTimeDisplayText() {
    return this.data.onsetDateTime
      ? getCorrectedISODate(this.data.onsetDateTime)
      : "";
  }
  get recordedDateTimeDisplayText() {
    return this.data.recordedDate
      ? getCorrectedISODate(this.data.recordedDate)
      : "";
  }
  toObj() {
    return {
      id: this.id,
      condition: this.displayText,
      onsetDateTime: this.onsetDateTimeDisplayText,
      recordedDate: this.recordedDateTimeDisplayText,
      status: this.status ? String(this.status).toLowerCase() : "",
    };
  }
  static getGoodData(data) {
    return data.filter((item) => !!item.condition);
  }
}
export default Condition;
