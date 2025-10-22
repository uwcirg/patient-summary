import QuestionnaireScoringBuilder from "./resultBuilders/QuestionnaireScoringBuilder";
import { getDisplayQTitle, isEmptyArray } from "@/util";
import { getConfigForQuestionnaire } from "@/config/questionnaire_config";

class Questionnaire {
  constructor(dataObj = null, key, patientBundle = []) {
    this.data = Object.assign({}, dataObj);
    this.key = key;
    this.summaryConfig = getConfigForQuestionnaire(this.data?.id) ?? {
      questionnaireId: this.id,
      questionnaireName: this.displayName,
      scoringQuestionId: this.scoreQuestionnId,
    };
    this.patientBundle = patientBundle;
  }
  get id() {
    return this.data.id;
  }
  get name() {
    return this.data.name;
  }
  get shortName() {
    if (!this.key) return getDisplayQTitle(this.data.id);
    const key = getDisplayQTitle(this.key).toUpperCase();
    if (key) return String(key).toUpperCase();
    return this.key;
  }
  get displayName() {
    if (!this.data) return this.shortName();
    const { id, title, name } = this.data;
    if (title) return title;
    if (name) return name;
    return `Questionnaire ${id ? getDisplayQTitle(id) : String(this.key).toUpperCase()}`;
  }
  get introText() {
    if (!this.data) return "";
    // eslint-disable-next-line no-undef
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
      ? this.data.item.find((item) => String(item.linkId).toLowerCase() === "introduction")
      : null;
    if (introductionItem) {
      const textElement = introductionItem._text;
      if (isEmptyArray(textElement.extension)) return "";
      return textElement.extension[0].valueString;
    }
    return "";
  }
  get interventionLibId() {
    return this.id;
  }
  get scoreQuestionnId() {
    return this.summaryConfig?.scoringQuestionId;
  }
  get summaryBuilder() {
    return new QuestionnaireScoringBuilder(this.summaryConfig, this.patientBundle);
  }

  summary(bundle) {
    return this.summaryBuilder.summariesFromBundle(this.data, {}, this.patientBundle ?? bundle);
  }
}
export default Questionnaire;
