class Response {
  constructor(dataObj) {
    this.data = Object.assign({}, dataObj);
  }
  get questionText() {
    const data = this.data;
    console.log("data ", data)
    return data.text || data.question || data.id;
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
