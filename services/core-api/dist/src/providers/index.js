import { config } from '../config.js';
import { GoogleEmailProvider } from './email/google.js';
import { MicrosoftEmailProvider } from './email/microsoft.js';
import { SimulatorEmailProvider } from './email/simulator.js';
import { DropboxSignProvider, SlackLiveProvider } from './misc/live.js';
import { SimulatorESignProvider, SimulatorSlackProvider } from './misc/simulator.js';
import { SimulatorTelephonyProvider } from './telephony/simulator.js';
import { TwilioTelephonyProvider } from './telephony/twilio.js';
/**
 * Provider registry.
 *
 * `PROVIDER_MODE` decides whether the product talks to real services or to the
 * deterministic simulators. Everything above this module is written against
 * the interfaces in `types.ts`, so switching modes is a config change and
 * nothing else — no branches in the ingestion pipeline, no test-only code
 * paths in business logic.
 */
const simulatorEmail = new SimulatorEmailProvider();
const googleEmail = new GoogleEmailProvider();
const microsoftEmail = new MicrosoftEmailProvider();
export function getEmailProvider(provider) {
    if (config.providerMode === 'simulator')
        return simulatorEmail;
    return provider === 'MICROSOFT' ? microsoftEmail : googleEmail;
}
let telephony = null;
export function getTelephonyProvider() {
    if (!telephony) {
        telephony =
            config.providerMode === 'live' && config.twilio.accountSid
                ? new TwilioTelephonyProvider()
                : new SimulatorTelephonyProvider();
    }
    return telephony;
}
let slack = null;
export function getSlackProvider() {
    if (!slack) {
        slack =
            config.providerMode === 'live' && config.slack.botToken
                ? new SlackLiveProvider()
                : new SimulatorSlackProvider();
    }
    return slack;
}
let esign = null;
export function getESignProvider() {
    if (!esign) {
        esign =
            config.providerMode === 'live' && config.esign.apiKey
                ? new DropboxSignProvider()
                : new SimulatorESignProvider();
    }
    return esign;
}
/** Which providers a workspace can connect, for the integrations settings page. */
export function availableProviders() {
    const simulated = config.providerMode === 'simulator';
    return [
        {
            provider: 'GOOGLE',
            displayName: simulated ? 'Simulated Workspace (Gmail + Calendar)' : 'Google Workspace',
            simulated,
        },
        {
            provider: 'MICROSOFT',
            displayName: simulated
                ? 'Simulated Microsoft 365 (Outlook + Calendar)'
                : 'Microsoft 365',
            simulated,
        },
        { provider: 'SLACK', displayName: 'Slack', simulated: simulated || !config.slack.botToken },
        {
            provider: 'TELEPHONY',
            displayName: simulated || !config.twilio.accountSid ? 'Calling (simulated)' : 'Twilio',
            simulated: simulated || !config.twilio.accountSid,
        },
        {
            provider: 'ESIGN',
            displayName: simulated || !config.esign.apiKey ? 'E-signature (simulated)' : 'Dropbox Sign',
            simulated: simulated || !config.esign.apiKey,
        },
    ];
}
export { SimulatorEmailProvider, SimulatorESignProvider, SimulatorSlackProvider, SimulatorTelephonyProvider };
