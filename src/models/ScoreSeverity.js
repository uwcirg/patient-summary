class ScoreSeverity {
  constructor(severity) {
    this.severity = severity ? String(severity).toLowerCase() : "";
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
}
export default ScoreSeverity;
