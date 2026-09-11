// IndexedDB-backed TanStack Query persister, scoped to FHIR Questionnaire
// definitions ONLY. Questionnaire resources are patient-independent and
// rarely change, so they're safe to persist across sessions.
//
// DO NOT reuse this store for QuestionnaireResponse, Observation, or any
// other patient-scoped resource — those are PHI and must stay in memory.

import { createStore, get, set, del, entries} from "idb-keyval";
import { experimental_createQueryPersister } from "@tanstack/query-persist-client-core";

// Bump this whenever questionnaire_config, QuestionnaireScoringBuilder, or
// anything else that interprets Questionnaire content changes shape. Every
// user's cache is discarded on the next load.
export const QUESTIONNAIRE_CACHE_VERSION = "v1";

const SEVEN_DAY_MS = 7 * 24 * 60 * 60 * 1000;
export const QUESTIONNAIRE_CACHE_MAX_AGE = SEVEN_DAY_MS;

export const QUESTIONNAIRE_QUERY_KEY = "questionnaire";

const idbStore = createStore("fhir-questionnaire-cache", "questionnaires");

const safe =
  (fn) =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch {
      return undefined;
    }
  };

// AsyncStorage adapter over idb-keyval. `entries` is optional but lets
// persister.persisterGc() sweep expired rows.
const storage = {
  getItem: safe((key) => get(key, idbStore)),
  setItem: safe((key, value) => set(key, value, idbStore)),
  removeItem: safe((key) => del(key, idbStore)),
  entries: safe(() => entries(idbStore)),
};

export const questionnairePersister = experimental_createQueryPersister({
  storage,
  buster: QUESTIONNAIRE_CACHE_VERSION,
  maxAge: QUESTIONNAIRE_CACHE_MAX_AGE,
  prefix: "fhir-questionnaire-cache",
  // IndexedDB uses structured clone, so skip JSON round-trips entirely.
  serialize: (v) => v,
  deserialize: (v) => v,
});

// Builds a stable query key. serverUrl scopes the cache per FHIR server so a
// Questionnaire cached from one environment never satisfies another.
export function questionnaireQueryKey({ serverUrl, qid, exactMatchById }) {
  return [QUESTIONNAIRE_QUERY_KEY, serverUrl ?? "unknown", String(qid), !!exactMatchById];
}

// Hard reset — wire into refresh() and/or a "clear cache" control.
export async function clearQuestionnaireCache(queryClient) {
  queryClient?.removeQueries({ queryKey: [QUESTIONNAIRE_QUERY_KEY] });
  await questionnairePersister.removeQueries({ queryKey: [QUESTIONNAIRE_QUERY_KEY] });
}

