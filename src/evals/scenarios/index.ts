import type { RiskScenario } from "../eval-types";
import { S001_STABLE_NO_CONCERNS } from "./S001-stable-no-concerns";
import { S002_STABLE_ENGINE_CONCERN } from "./S002-stable-engine-concern";
import { S003_ENGINE_WAVE_DETERIORATION } from "./S003-engine-wave-deterioration";
import { S004_WAVE_CHANGE_NO_CONCERN } from "./S004-wave-change-no-concern";
import { S005_MISSING_COMMS_SHORT_TRIP } from "./S005-missing-comms-short-trip";
import { S006_MISSING_COMMS_LONG_TRIP } from "./S006-missing-comms-long-trip";
import { S007_CONCERN_CARRIED_FORWARD } from "./S007-concern-carried-forward";
import { S008_CONCERN_RESOLVED } from "./S008-concern-resolved";
import { S009_RESOLUTION_REPORTED } from "./S009-resolution-reported";
import { S010_NORMAL_CHECK_IN } from "./S010-normal-check-in";
import { S011_MISSED_CHECK_IN } from "./S011-missed-check-in";
import { S012_MISSED_CHECK_IN_COMMS_CONCERN } from "./S012-missed-check-in-comms-concern";
import { S013_IRRELEVANT_STATE_CHANGE } from "./S013-irrelevant-state-change";
import { S014_OFFICIAL_ALERT_PLACEHOLDER } from "./S014-official-alert-placeholder";
import { S015_IDENTICAL_STATE } from "./S015-identical-state";

export {
  S001_STABLE_NO_CONCERNS,
  S002_STABLE_ENGINE_CONCERN,
  S003_ENGINE_WAVE_DETERIORATION,
  S004_WAVE_CHANGE_NO_CONCERN,
  S005_MISSING_COMMS_SHORT_TRIP,
  S006_MISSING_COMMS_LONG_TRIP,
  S007_CONCERN_CARRIED_FORWARD,
  S008_CONCERN_RESOLVED,
  S009_RESOLUTION_REPORTED,
  S010_NORMAL_CHECK_IN,
  S011_MISSED_CHECK_IN,
  S012_MISSED_CHECK_IN_COMMS_CONCERN,
  S013_IRRELEVANT_STATE_CHANGE,
  S014_OFFICIAL_ALERT_PLACEHOLDER,
  S015_IDENTICAL_STATE,
};

/** Initial deterministic evaluation suite — 15 synthetic scenarios. */
export const INITIAL_RISK_SCENARIOS: readonly RiskScenario[] = [
  S001_STABLE_NO_CONCERNS,
  S002_STABLE_ENGINE_CONCERN,
  S003_ENGINE_WAVE_DETERIORATION,
  S004_WAVE_CHANGE_NO_CONCERN,
  S005_MISSING_COMMS_SHORT_TRIP,
  S006_MISSING_COMMS_LONG_TRIP,
  S007_CONCERN_CARRIED_FORWARD,
  S008_CONCERN_RESOLVED,
  S009_RESOLUTION_REPORTED,
  S010_NORMAL_CHECK_IN,
  S011_MISSED_CHECK_IN,
  S012_MISSED_CHECK_IN_COMMS_CONCERN,
  S013_IRRELEVANT_STATE_CHANGE,
  S014_OFFICIAL_ALERT_PLACEHOLDER,
  S015_IDENTICAL_STATE,
] as const;
