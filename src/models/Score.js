import { severityFromScore } from "./resultBuilders/helpers";
class Score {
  constructor(score, scoreParams = {}) {
    this.score = score;
    this.severity =
      scoreParams && scoreParams.scoreSeverity
        ? String(scoreParams.scoreSeverity).toLowerCase()
        : severityFromScore(score, scoreParams);
    this.scoreParams = scoreParams;
  }
  static range = ["high", "moderate", "moderately high"];
  isHigh() {
    return this.severity === "high" || !!this.scoreParams?.alert;
  }
  isModerate() {
    return this.severity === "moderate" || this.severity === "moderately high" || !!this.scoreParams?.warning;
  }

  isInRange() {

    return this.isHigh() || this.isModerate() || Score.range.indexOf(this.severity) !== -1;
  }
  
  get currentScore() {
    return this.score;
  }

  get previousScore() {
    return this.scoreParams?.previousScore;
  }

  get displayValue() {
    return this.score;
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
export default Score;
