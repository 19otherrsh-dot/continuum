import { config } from '../../config.js';
/** Slack notifications for stalling deals and new leads (FR-INT-03). */
export class SlackLiveProvider {
    id = 'slack';
    async notify(options) {
        if (!config.slack.botToken) {
            throw new Error('Slack is not configured — set SLACK_BOT_TOKEN.');
        }
        const blocks = [
            { type: 'section', text: { type: 'mrkdwn', text: `*${options.title}*` } },
        ];
        if (options.body) {
            blocks.push({ type: 'section', text: { type: 'mrkdwn', text: options.body } });
        }
        if (options.url) {
            blocks.push({
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: { type: 'plain_text', text: 'Open in Continuum' },
                        url: options.url,
                    },
                ],
            });
        }
        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.slack.botToken}`,
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify({ channel: options.channel, text: options.title, blocks }),
        });
        const json = (await response.json());
        if (!json.ok)
            throw new Error(`Slack rejected the message: ${json.error}`);
    }
}
/**
 * Dropbox Sign (formerly HelloSign) e-signature.
 *
 * V1 ships sending; reflecting signature status back onto the deal without a
 * manual update is FR-INT-04 and remains P1, so `status()` is polled by the
 * caller rather than driving deal state automatically.
 */
export class DropboxSignProvider {
    id = 'dropbox-sign';
    get auth() {
        return `Basic ${Buffer.from(`${config.esign.apiKey}:`).toString('base64')}`;
    }
    async send(options) {
        if (!config.esign.apiKey) {
            throw new Error('E-signature is not configured — set DROPBOX_SIGN_API_KEY.');
        }
        const response = await fetch('https://api.hellosign.com/v3/signature_request/send', {
            method: 'POST',
            headers: { Authorization: this.auth, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: options.title,
                subject: options.title,
                message: options.body,
                signers: [{ email_address: options.signerEmail, name: options.signerName }],
                test_mode: config.isProduction ? 0 : 1,
            }),
        });
        if (!response.ok) {
            throw new Error(`Dropbox Sign send failed: ${await response.text()}`);
        }
        const json = (await response.json());
        return {
            externalRef: json.signature_request.signature_request_id,
            status: json.signature_request.is_complete ? 'SIGNED' : 'SENT',
        };
    }
    async status(externalRef) {
        const response = await fetch(`https://api.hellosign.com/v3/signature_request/${externalRef}`, { headers: { Authorization: this.auth } });
        if (!response.ok)
            return { status: 'UNKNOWN', signedAt: null };
        const json = (await response.json());
        const signedAtEpoch = json.signature_request.signatures?.[0]?.signed_at;
        return {
            status: json.signature_request.is_complete ? 'SIGNED' : 'SENT',
            signedAt: signedAtEpoch ? new Date(signedAtEpoch * 1000) : null,
        };
    }
}
