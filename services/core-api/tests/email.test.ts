import { describe, expect, it } from 'vitest';
import {
  companyNameFromDomain,
  isBusinessDomain,
  parseAddress,
  parseAddressList,
  splitName,
} from '../src/lib/email.js';
import { resolveConsentRegime } from '../src/providers/telephony/simulator.js';
import { localSummarize } from '../src/ai/local-fallback.js';

describe('address parsing', () => {
  it('handles display names and bare addresses', () => {
    expect(parseAddress('Dana Whitfield <Dana@Northwind.com>')).toMatchObject({
      email: 'dana@northwind.com',
      name: 'Dana Whitfield',
      domain: 'northwind.com',
    });
    expect(parseAddress('tomas@harbor.test')?.name).toBeNull();
  });

  it('rejects values that are not addresses', () => {
    expect(parseAddress('not-an-address')).toBeNull();
    expect(parseAddress('missing@domain')).toBeNull();
    expect(parseAddress(null)).toBeNull();
  });

  it('de-duplicates address lists', () => {
    const list = parseAddressList('a@x.test, A@X.test, b@y.test');
    expect(list).toHaveLength(2);
  });

  /** A personal mailbox is a person, not an account — otherwise every Gmail
   *  address would mint a "gmail.com" company. */
  it('does not treat consumer mailboxes as companies', () => {
    expect(isBusinessDomain('gmail.com')).toBe(false);
    expect(isBusinessDomain('icloud.com')).toBe(false);
    expect(isBusinessDomain('northwind-logistics.com')).toBe(true);
  });

  it('derives a readable company name from a domain', () => {
    expect(companyNameFromDomain('northwind-logistics.com')).toBe('Northwind Logistics');
    expect(companyNameFromDomain('www.harbor.co.uk')).toBe('Harbor');
  });

  it('splits names without inventing structure', () => {
    expect(splitName('Dana Whitfield')).toEqual({ firstName: 'Dana', lastName: 'Whitfield' });
    expect(splitName('Whitfield, Dana')).toEqual({ firstName: 'Dana', lastName: 'Whitfield' });
    expect(splitName('Cher')).toEqual({ firstName: 'Cher', lastName: null });
    expect(splitName(null)).toEqual({ firstName: null, lastName: null });
  });
});

describe('call recording consent', () => {
  it('recognises all-party consent US area codes', () => {
    expect(resolveConsentRegime('+14155550142').regime).toBe('TWO_PARTY');
    expect(resolveConsentRegime('+16175551234').regime).toBe('TWO_PARTY');
  });

  it('recognises one-party US area codes', () => {
    expect(resolveConsentRegime('+12125550000').regime).toBe('ONE_PARTY');
  });

  it('treats EU numbers as all-party', () => {
    expect(resolveConsentRegime('+493012345678').regime).toBe('TWO_PARTY');
  });

  /**
   * Recording someone who did not consent is the failure worth designing
   * against, so anything unrecognised is handled like two-party.
   */
  it('fails safe on numbers it cannot classify', () => {
    expect(resolveConsentRegime('+9999123456').regime).toBe('UNKNOWN');
  });
});

describe('local summarizer fallback', () => {
  it('produces an extractive summary rather than an invented one', () => {
    const body = 'Budget is approved for the pilot. Finance signed off this morning.';
    const result = localSummarize({ subject: 'Re: pilot', body, type: 'EMAIL' });
    // Every word of the summary came from the message itself.
    expect(body).toContain(result.summary.split('.')[0]!.trim());
    expect(result.sentiment).toBe('POSITIVE');
  });

  it('returns a null next step rather than fabricating one', () => {
    const result = localSummarize({
      subject: 'FYI',
      body: 'Sharing the deck from yesterday for your records.',
      type: 'EMAIL',
    });
    expect(result.nextStep).toBeNull();
  });

  it('extracts a next step when one was actually proposed', () => {
    const result = localSummarize({
      subject: 'Re: pilot',
      body: 'Thanks for the scope. Can we get 30 minutes on Thursday?',
      type: 'EMAIL',
    });
    expect(result.nextStep).toContain('30 minutes');
  });

  it('ignores quoted replies and signatures', () => {
    const result = localSummarize({
      subject: 'Re: pilot',
      body: 'Confirmed for Thursday.\n\nBest,\nDana\n\n> On Monday you wrote:\n> Are you free?',
      type: 'EMAIL',
    });
    expect(result.summary).not.toContain('Are you free');
    expect(result.summary).not.toContain('Best,');
  });
});
