import { getCorrectedISODate, isEmptyArray } from "../util/util";
class Condition {
  constructor(dataObj) {
    this.data = Object.assign({}, dataObj);
  }
  get id() {
    return this.data.id;
  }
  get displayText() {
    return this.data.code.text
      ? this.data.code.text
      : !isEmptyArray(this.data.code?.coding)
      ? this.data.code.coding.map((o) => o.display).join(", ")
      : "";
  }
  get status() {
    return this.data.verificationStatus
      ? this.data.verificationStatus.text
        ? this.data.verificationStatus.text
        : !isEmptyArray(this.data.verificationStatus.coding)
        ? this.data.verificationStatus.coding[0].display
          ? this.data.verificationStatus.coding[0].display
          : this.data.verificationStatus.coding[0].code
        : ""
      : "";
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
  static getGoodData(bundledData) {
    return bundledData.filter(
      (item) =>
        String(item.resourceType).toLowerCase() === "condition" &&
        item.code &&
        ((!isEmptyArray(item.code.codin) &&
          item.code.coding.find((o) => o.display)) ||
          item.code.text)
    );
  }
}
export default Condition;
