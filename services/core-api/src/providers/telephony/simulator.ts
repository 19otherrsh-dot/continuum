import { randomUUID } from 'node:crypto';
import type { ConsentRegime } from '@continuum/shared';
import type { PlacedCall, TelephonyProvider } from '../types.js';

/**
 * Two-party-consent jurisdictions, keyed by dialling prefix.
 *
 * This table is the enforcement point for FR-PIPE-04: a number resolving to a
 * two-party region gets a spoken announcement before recording starts, and if
 * that cannot be delivered the call proceeds unrecorded rather than recording
 * without consent. It is deliberately incomplete and conservative — anything
 * unrecognised is treated as UNKNOWN and handled like two-party.
 */
const TWO_PARTY_US_AREA_CODES = new Set([
  // California
  '209', '213', '279', '310', '323', '341', '350', '408', '415', '424', '442',
  '510', '530', '559', '562', '619', '626', '628', '650', '657', '661', '669',
  '707', '714', '747', '760', '805', '818', '820', '831', '840', '858', '909',
  '916', '925', '949', '951',
  // Florida
  '239', '305', '321', '352', '386', '407', '561', '727', '754', '772', '786',
  '813', '850', '863', '904', '941', '954',
  // Illinois
  '217', '224', '309', '312', '331', '447', '464', '618', '630', '708', '773',
  '779', '815', '847', '872',
  // Massachusetts
  '339', '351', '413', '508', '617', '774', '781', '857', '978',
  // Pennsylvania, Washington, Maryland, Michigan, Nevada, New Hampshire
  '215', '267', '445', '484', '610', '717', '724', '814', '835', '878',
  '206', '253', '360', '425', '509', '564',
  '227', '240', '301', '410', '443', '667',
  '231', '248', '269', '313', '517', '586', '616', '679', '734', '810', '906', '947', '989',
  '702', '725', '775',
  '603',
]);

/** Countries whose default is all-party consent. */
const TWO_PARTY_COUNTRY_PREFIXES: Record<string, string> = {
  '+49': 'DE',
  '+33': 'FR',
  '+34': 'ES',
  '+39': 'IT',
  '+31': 'NL',
  '+46': 'SE',
  '+47': 'NO',
  '+45': 'DK',
  '+358': 'FI',
  '+48': 'PL',
  '+351': 'PT',
  '+43': 'AT',
  '+41': 'CH',
  '+353': 'IE',
};

export function resolveConsentRegime(e164: string): {
  regime: ConsentRegime;
  region: string | null;
} {
  const digits = e164.replace(/[^\d+]/g, '');

  for (const [prefix, region] of Object.entries(TWO_PARTY_COUNTRY_PREFIXES)) {
    if (digits.startsWith(prefix)) return { regime: 'TWO_PARTY', region };
  }

  if (digits.startsWith('+1') || /^\d{10,11}$/.test(digits)) {
    const national = digits.replace(/^\+1/, '').replace(/^1(?=\d{10}$)/, '');
    const areaCode = national.slice(0, 3);
    if (TWO_PARTY_US_AREA_CODES.has(areaCode)) {
      return { regime: 'TWO_PARTY', region: `US-${areaCode}` };
    }
    return { regime: 'ONE_PARTY', region: 'US' };
  }

  if (digits.startsWith('+44')) return { regime: 'ONE_PARTY', region: 'GB' };

  // Unrecognised numbers are treated as requiring consent. Recording someone
  // who did not agree is the failure mode worth avoiding.
  return { regime: 'UNKNOWN', region: null };
}

/**
 * Deterministic dialler. Produces a realistic transcript so the same
 * summarization path used for email can be exercised for calls (FR-AC-10),
 * and reproduces the "rang out" case that must not be logged as a
 * conversation.
 */
export class SimulatorTelephonyProvider implements TelephonyProvider {
  readonly id = 'simulator';

  /** Forces the next call to a particular outcome, for tests and demos. */
  static nextOutcome: PlacedCall['outcome'] | null = null;

  consentRegimeFor(e164Number: string) {
    return resolveConsentRegime(e164Number);
  }

  async placeCall(options: {
    to: string;
    requireConsentPrompt: boolean;
    record: boolean;
  }): Promise<PlacedCall> {
    const outcome =
      SimulatorTelephonyProvider.nextOutcome ??
      // Deterministic from the number so repeated demos behave consistently.
      (hash(options.to) % 5 === 0 ? 'ATTEMPTED_NO_CONNECT' : 'CONNECTED');
    SimulatorTelephonyProvider.nextOutcome = null;

    const externalCallId = `sim-call-${randomUUID()}`;

    if (outcome !== 'CONNECTED') {
      return {
        externalCallId,
        connected: false,
        outcome,
        durationSeconds: 0,
        recordingUrl: null,
        transcript: null,
      };
    }

    return {
      externalCallId,
      connected: true,
      outcome: 'CONNECTED',
      durationSeconds: 420 + (hash(options.to) % 300),
      recordingUrl: options.record ? `sim://recordings/${externalCallId}` : null,
      transcript: options.record ? SAMPLE_TRANSCRIPT : null,
    };
  }

  async transcribe(recordingUrl: string): Promise<string | null> {
    return recordingUrl.startsWith('sim://') ? SAMPLE_TRANSCRIPT : null;
  }
}

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

const SAMPLE_TRANSCRIPT = `Rep: Thanks for making the time. I know you were waiting on the security review before we talked commercials.

Contact: That's right. Marcus came back yesterday — he's satisfied with the data-handling summary. No blockers from his side.

Rep: That's good to hear. So where does that leave us?

Contact: Budget's approved. Finance signed off this morning for the forty-seat pilot. What I need from you is the paperwork, and we'd like to be live by the start of next month.

Rep: I can have the agreement over to you today. On timing, forty seats provisioned inside a week is realistic once it's signed.

Contact: Good. Send it across and I'll get it turned around this week.

Rep: Will do. I'll also include the onboarding plan so your team knows what the first fortnight looks like.

Contact: Appreciated. Talk soon.`;
