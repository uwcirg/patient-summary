import { isNumber, isPlainObject } from "@util";
class Response {
  constructor(dataObj) {
    this.data = Object.assign({}, dataObj);
  }
  get questionText() {
    const data = this.data;
    return data.question || data.text || data.id;
  }
  get answerText() {
    if (!this.data) return "";
    return this.data.answer || isNumber(this.data.answer) || !isPlainObject(this.data.answer)
      ? String(this.data.answer)
      : "";
  }
}
export default Response;
