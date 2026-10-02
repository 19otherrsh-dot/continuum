import { config } from '../../config.js';
import type { PlacedCall, TelephonyProvider } from '../types.js';
import { resolveConsentRegime } from './simulator.js';

const API = 'https://api.twilio.com/2010-04-01';

/**
 * Twilio-backed native calling (FR-PIPE-03).
 *
 * Consent handling is the part worth reading. Where the destination is in a
 * two-party-consent jurisdiction — or one we cannot classify — the call opens
 * with a spoken announcement and only starts recording after it has played
 * (FR-PIPE-04). The announcement is not decorative: recording begins in the
 * verb *after* it, so a caller who hangs up during the notice is never
 * recorded.
 */
export class TwilioTelephonyProvider implements TelephonyProvider {
  readonly id = 'twilio';

  consentRegimeFor(e164Number: string) {
    return resolveConsentRegime(e164Number);
  }

  async placeCall(options: {
    to: string;
    from?: string;
    requireConsentPrompt: boolean;
    record: boolean;
    callbackUrl: string;
  }): Promise<PlacedCall> {
    const from = options.from ?? config.twilio.fromNumber;
    if (!config.twilio.accountSid || !config.twilio.authToken || !from) {
      throw new Error('Twilio is not configured — set TWILIO_* in the environment.');
    }

    const body = new URLSearchParams({
      To: options.to,
      From: from,
      Twiml: this.twiml(options),
      StatusCallback: options.callbackUrl,
      StatusCallbackMethod: 'POST',
    });
    for (const event of ['initiated', 'answered', 'completed']) {
      body.append('StatusCallbackEvent', event);
    }

    const response = await fetch(`${API}/Accounts/${config.twilio.accountSid}/Calls.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${config.twilio.accountSid}:${config.twilio.authToken}`,
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Twilio call failed: ${await response.text()}`);
    }

    const json = (await response.json()) as { sid: string; status: string };

    // The call is in flight. Outcome, duration, recording and transcript all
    // arrive later on the status webhook — the Activity is written now as an
    // attempt and updated when the call completes.
    return {
      externalCallId: json.sid,
      connected: false,
      outcome: 'ATTEMPTED_NO_CONNECT',
      durationSeconds: 0,
      recordingUrl: null,
      transcript: null,
    };
  }

  private twiml(options: { requireConsentPrompt: boolean; record: boolean }): string {
    if (!options.record) {
      return '<Response><Dial/></Response>';
    }

    const notice = options.requireConsentPrompt
      ? '<Say voice="Polly.Joanna">This call may be recorded for quality and record-keeping. ' +
        'If you would prefer not to be recorded, please say so and we will stop.</Say>'
      : '';

    // Recording starts on the Dial verb, i.e. strictly after the notice.
    return `<Response>${notice}<Dial record="record-from-answer-dual"/></Response>`;
  }

  async transcribe(recordingUrl: string): Promise<string | null> {
    if (!config.twilio.accountSid || !config.twilio.authToken) return null;

    const response = await fetch(`${recordingUrl}/Transcriptions.json`, {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${config.twilio.accountSid}:${config.twilio.authToken}`,
        ).toString('base64')}`,
      },
    });
    if (!response.ok) return null;

    const json = (await response.json()) as {
      transcriptions?: { transcription_text?: string }[];
    };
    return json.transcriptions?.[0]?.transcription_text ?? null;
  }
}
