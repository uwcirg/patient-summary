class ScoreSeverity {
  constructor(scoreParams = {}) {
    this.severity = scoreParams && scoreParams.scoreSeverity ? String(scoreParams.scoreSeverity).toLowerCase() : null;
    this.scoreParams = scoreParams;
  }
  static range = ["high", "moderate", "moderately high"];
  isHigh() {
    return this.severity === "high";
  }
  isModerate() {
    return this.severity === "moderate" || this.severity === "moderately high";
  }

  isInRange() {
    return ScoreSeverity.range.indexOf(this.severity) !== -1;
  }

  get textColorClass() {
    return this.isHigh() ? "text-error" : this.isModerate() ? "text-warning" : "inherit";
  }

  get iconColorClass() {
    return this.isHigh() ? "error" : this.isModerate() ? "warning" : "inherit";
  }

  get iconClass() {
    return this.isHigh() ? "alert-icon" : "";
  }

  get alertNote() {
    return this.scoreParams && this.scoreParams.alertNote ? this.scoreParams.alertNote : null;
  }
}
export default ScoreSeverity;
