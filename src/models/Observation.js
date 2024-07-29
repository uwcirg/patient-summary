import { getFhirItemValue, getFhirComponentDisplays } from "../util/fhirUtil";
import { getCorrectedISODate, hasValue, isEmptyArray } from "../util/util";

class Observation {
  constructor(dataObj) {
    this.data = Object.assign({}, dataObj);
  }
  get id() {
    return this.data.id;
  }
  get category() {
    if (isEmptyArray(this.data.category)) return "";
    return this.data.category
      .map((o) =>
        o.text ? o.text : !isEmptyArray(o.coding) ? o.coding[0].display : ""
      )
      .join(", ");
  }
  get status() {
    return this.data.status;
  }
  get displayText() {
    if (isEmptyArray(this.data.code?.coding)) return "";
    return this.data.code.coding
      .filter((o) => o.display)
      .map((o) => o.display)
      .join(", ");
  }
  get dateText() {
    return getCorrectedISODate(this.data.issued);
  }
  get providerText() {
    if (isEmptyArray(this.data.performer)) return "";
    return this.data.performer.map((item) => item.display).join(", ");
  }
  get valueText() {
    const value = this.data.component
      ? getFhirComponentDisplays(this.data)
      : getFhirItemValue(this.data);
    if (!hasValue(value)) return "";
    return value;
  }

  toObj() {
    return {
      id: this.id,
      category: this.category,
      status: this.status,
      displayText: this.displayText,
      valueText: this.valueText,
      dateText: this.dateText,
      providerText: this.providerText,
    };
  }

  static getGoodData(bundledData) {
    return bundledData.filter(
      (item) =>
        String(item.resourceType).toLowerCase() === "observation" &&
        !isEmptyArray(item.code.coding)
    );
  }
}
export default Observation;
