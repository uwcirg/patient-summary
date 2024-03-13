import {
  getCorrectedISODate,
  getFhirItemValue,
  getFhirComponentDisplays,
} from "../util/util";

class Observation {
  constructor(dataObj) {
    this.data = dataObj;
  }
  get category() {
    return this.data.category &&
      Array.isArray(this.data.category) &&
      this.data.category.length
      ? this.data.category
          .map((o) =>
            o.text
              ? o.text
              : o.coding && o.coding.length && o.coding[0].display
              ? o.coding[0].display
              : ""
          )
          .join(", ")
      : this.data.category
      ? this.data.category
      : "";
  }
  get status() {
    return this.data.status;
  }
  get displayText() {
    if (
      !this.data.code ||
      !this.data.code.coding ||
      !Array.isArray(this.data.code.coding)
    ) {
      return "";
    }
    return this.data.code.coding
      .filter((o) => o.display)
      .map((o) => o.display)
      .join(", ");
  }
  get dateText() {
    return getCorrectedISODate(this.data.issued);
  }
  get providerText() {
    return this.data.performer && this.data.performer.length
      ? this.data.performer.map((item) => item.display).join(", ")
      : "";
  }
  get valueText() {
    const value = this.data.component
      ? getFhirComponentDisplays(this.data)
      : getFhirItemValue(this.data);
    if (value == null || value === "" || typeof value === "undefined")
      return "";
    return value;
  }
 
  static getGoodData(bundledData) {
    return bundledData.filter(
      (item) =>
        String(item.resourceType).toLowerCase() === "observation" &&
        item.code &&
        item.code.coding &&
        item.code.coding.length > 0
    );
  }
}
export default Observation;
