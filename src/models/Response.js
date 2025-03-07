class Response {
  /*
   * assume data in format returned by FormattedResponses in
   * cql/source/InterventionLogic_Common.cql
   */
  constructor(dataObj) {
    this.data = Object.assign({}, dataObj);
  }
  get questionText() {
    const data = this.data;
    return data.question || data.text || data.id;
  }
  get answerText() {
    if (!this.data) return "";
    return this.data.value &&
      (parseInt(this.data.value.value) === 0 || this.data.value.value)
      ? this.data.value.value
      : this.data.answer
      ? String(this.data.answer)
      : "";
  }
}
export default Response;
