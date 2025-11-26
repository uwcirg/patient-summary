import dayjs from "dayjs";
import { getEnv, isEmptyArray } from "../util";
class Patient {
  constructor(dataObj) {
    this.data = Object.assign({}, dataObj);
  }
  get name() {
    if (!this.data || isEmptyArray(this.data.name)) return "";
    const ptName = this.data.name[0];
    const familyName = ptName.family ? ptName.family : "";
    const givenName = !isEmptyArray(ptName.given) ? ptName.given[0] : "";
    return [familyName, givenName].join(", ").trim();
  }
  get dob() {
    if (!this.data || !this.data.birthDate) return null;
    return this.data.birthDate;
  }
  get age() {
    const dob = this.dob;
    if (!dob) return null;
    const today = new Date().toLocaleDateString("en-us");
    const date1 = dayjs(today);
    const date2 = dayjs(dob);
    return date1.diff(date2, "year");
  }
  get mrn() {
    if (!this.data || isEmptyArray(this.data.identifier)) return "";
    const envSystem = getEnv("REACT_APP_LAUNCH_FHIR_MRN_SYSTEM");
    const systems = envSystem? envSystem.split(",") : ["http://hospital.smarthealthit.org"];
    const match = this.data.identifier.find(
      (o) => o.system && systems.includes(o.system),
    );
    if (match) return match.value;
    return "";
  }
}

export default Patient;
