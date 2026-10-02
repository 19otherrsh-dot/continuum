import { describe, expect, it } from 'vitest';
import { classifyNoise, isExcluded } from '../src/ingestion/noise-filter.js';
import type { CapturedMessage } from '../src/providers/types.js';

function message(overrides: Partial<CapturedMessage> = {}): CapturedMessage {
  return {
    externalRef: 'test-1',
    threadRef: 'thread-1',
    kind: 'EMAIL',
    subject: 'Following up on the pilot',
    body: 'Just checking in on where we landed.',
    occurredAt: new Date(),
    from: 'Dana Whitfield <dana@northwind-logistics.com>',
    to: ['you@continuum.test'],
    cc: [],
    mailbox: 'you@continuum.test',
    headers: {},
    ...overrides,
  };
}

describe('noise filter', () => {
  it('keeps a genuine message from a person', () => {
    expect(classifyNoise(message()).isNoise).toBe(false);
  });

  /**
   * The case that matters most: a newsletter from a *customer's own domain*
   * looks identical to a real reply until you read the headers. Without this,
   * every marketing list the team is on would mint contact proposals.
   */
  it('drops bulk mail from a known company domain', () => {
    const verdict = classifyNoise(
      message({
        from: 'Northwind Insights <newsletter@northwind-logistics.com>',
        subject: 'Q3 Industry Roundup',
        headers: { 'list-unsubscribe': '<https://example.com/u>', precedence: 'bulk' },
      }),
    );
    expect(verdict.isNoise).toBe(true);
  });

  it('drops no-reply senders', () => {
    expect(classifyNoise(message({ from: 'no-reply@billing.test' })).isNoise).toBe(true);
    expect(classifyNoise(message({ from: 'notifications@app.test' })).isNoise).toBe(true);
  });

  it('drops auto-responders and bounces', () => {
    expect(classifyNoise(message({ subject: 'Automatic reply: Out of office' })).isNoise).toBe(true);
    expect(classifyNoise(message({ subject: 'Undeliverable: your message' })).isNoise).toBe(true);
    expect(classifyNoise(message({ headers: { 'auto-submitted': 'auto-replied' } })).isNoise).toBe(
      true,
    );
  });

  /**
   * The filter must stay conservative in the other direction too: losing a
   * real customer email is worse than an occasional newsletter slipping onto
   * the timeline.
   */
  it('does not drop a real message merely because it mentions marketing', () => {
    const verdict = classifyNoise(
      message({
        subject: 'Re: marketing budget for the pilot',
        body: 'Our marketing team wants to be involved in the rollout.',
      }),
    );
    expect(verdict.isNoise).toBe(false);
  });

  it('drops unparseable senders rather than guessing', () => {
    expect(classifyNoise(message({ from: 'not-an-address' })).isNoise).toBe(true);
  });
});

describe('capture exclusions', () => {
  it('excludes a specific sender', () => {
    expect(
      isExcluded(message(), [{ kind: 'SENDER', value: 'dana@northwind-logistics.com' }]),
    ).toBe(true);
  });

  it('excludes an entire domain, matching on any participant', () => {
    expect(
      isExcluded(message({ cc: ['legal@acme.test'] }), [{ kind: 'DOMAIN', value: 'acme.test' }]),
    ).toBe(true);
  });

  it('excludes a thread', () => {
    expect(isExcluded(message(), [{ kind: 'THREAD', value: 'thread-1' }])).toBe(true);
  });

  it('leaves unrelated messages alone', () => {
    expect(isExcluded(message(), [{ kind: 'SENDER', value: 'someone@else.test' }])).toBe(false);
    expect(isExcluded(message(), [])).toBe(false);
  });
});
