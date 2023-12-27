import { getCorrectedISODate } from "../util/util";
class Condition {
  constructor(dataObj) {
    this.data = dataObj;
  }
  get displayText() {
    return this.data.code.text
      ? this.data.code.text
      : this.data.code.coding.map((o) => o.display).join(", ");
  }
  get status() {
    return this.data.verificationStatus
      ? this.data.verificationStatus.text
        ? this.data.verificationStatus.text
        : this.data.verificationStatus.coding &&
          Array.isArray(this.data.verificationStatus.coding) &&
          this.data.verificationStatus.coding.length
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
  static getGoodData(bundledData) {
    return bundledData.filter(
      (item) =>
        String(item.resourceType).toLowerCase() === "condition" &&
        item.code &&
        ((item.code.coding &&
          Array.isArray(item.code.coding) &&
          item.code.coding.length > 0 &&
          item.code.coding.find((o) => o.display)) ||
          item.code.text)
    );
  }
}
export default Condition;
