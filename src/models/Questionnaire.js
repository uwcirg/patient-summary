import questionnaireConfig from "../config/questionnaire_config";
import { getDisplayQTitle } from "../util/util";
class Questionnaire {
  constructor(dataObj, key) {
    this.data = dataObj;
    this.key = key;
  }
  shortName() {
    if (!this.key) return "";
    const key = getDisplayQTitle(this.key).toUpperCase();
    if (questionnaireConfig[key] && questionnaireConfig[key].shortTitle) {
      return questionnaireConfig[key].shortTitle;
    }
    return String(key).toUpperCase();
  }
  displayName() {
    if (!this.data) return this.shortName();
    const { id, title, name } = this.data;
    if (title) return title;
    if (name) return name;
    return `Questionnaire ${getDisplayQTitle(id)}`;
  }
  introText() {
    if (!this.data) return "";
    const commonmark = require("commonmark");
    const reader = new commonmark.Parser({ smart: true });
    const writer = new commonmark.HtmlRenderer({
      linebreak: "<br />",
      softbreak: "<br />",
    });
    let description = "";
    if (this.data.description) {
      const parsedObj = reader.parse(this.data.description);
      description = this.data.description ? writer.render(parsedObj) : "";
    }
    if (description) return description;
    const introductionItem = this.data.item
      ? this.data.item.find(
          (item) => String(item.linkId).toLowerCase() === "introduction"
        )
      : null;
    if (introductionItem) {
      const textElement = introductionItem._text;
      if (!textElement || !textElement.extension || !textElement.extension[0])
        return "";
      return textElement.extension[0].valueString;
    }
    return "";
  }
}
export default Questionnaire;
