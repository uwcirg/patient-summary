import questionnaireConfig from "../config/questionnaire_config";
import { getDisplayQTitle, isEmptyArray } from "../util/util";
class Questionnaire {
  constructor(dataObj = null, key) {
    this.data = Object.assign({}, dataObj);
    this.key = key;
  }
  get id() {
    return this.data.id;
  }
  get name() {
    return this.data.name;
  }
  get shortName() {
    if (!this.key) return "";
    const key = getDisplayQTitle(this.key).toUpperCase();
    if (questionnaireConfig[key] && questionnaireConfig[key].shortTitle) {
      return questionnaireConfig[key].shortTitle;
    }
    return String(key).toUpperCase();
  }
  get displayName() {
    if (!this.data) return this.shortName();
    const { id, title, name } = this.data;
    if (title) return title;
    if (name) return name;
    return `Questionnaire ${getDisplayQTitle(id)}`;
  }
  get introText() {
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
      if (isEmptyArray(textElement.extension)) return "";
      return textElement.extension[0].valueString;
    }
    return "";
  }
  get interventionLibId() {
    const match = questionnaireConfig.find((o) => {
      return o.keys.find(
        (key) =>
          String(this.data?.id).toLowerCase() === key ||
          String(this.data?.name).toLowerCase().includes(key)
          //String(this.data?.name).toLowerCase().includes(key)
      );
    });
    return match ? match.interventionLibId : "";
  }
}
export default Questionnaire;
