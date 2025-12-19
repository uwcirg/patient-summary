import { isNumber, isPlainObject } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

class Response {
  constructor(dataObj, config = {}) {
    this.data = Object.assign({}, dataObj);
    this.config = config;
  }
  get id() {
    return this.data?.id || this.data?.linkId;
  }
  get questionText() {
    const data = this.data;
    let question = data.question || data.text;
    const configToUse = this.config;
    if (!question && configToUse?.itemTextByLinkId) {
      for (const key in configToUse?.itemTextByLinkId) {
        if (linkIdEquals(key, this.id, configToUse?.linkIdMatchMode)) {
          question = configToUse?.itemTextByLinkId[this.id];
          break;
        }
      }
    }
    return question;
  }
  get answerText() {
    if (!this.data) return "";
    return this.data.answer || isNumber(this.data.answer) || !isPlainObject(this.data.answer)
      ? String(this.data.answer)
      : "";
  }
}
export default Response;
