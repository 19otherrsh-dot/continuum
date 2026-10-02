/**
 * Fixture inbox for the simulator provider.
 *
 * This is not decoration — it is the acceptance fixture for Epic A. It
 * deliberately contains the cases the pipeline has to get right:
 *
 *   - a normal thread with a known contact
 *   - a reply from an *unrecognised* sender at a known company domain, which
 *     must produce a new-contact proposal rather than a silent write (FR-AC-04)
 *   - a marketing newsletter from a known company domain, which must be
 *     filtered as noise *before* the matching engine so it never proposes a
 *     contact (Epic A edge case)
 *   - a no-reply automated notification
 *   - a message CC'ing someone at a different company, to exercise
 *     multi-company attribution
 *   - a calendar event that is later rescheduled under the same externalRef,
 *     which must update in place rather than duplicate
 *   - an explicit buying signal, which should clear the confidence bar for a
 *     stage-change proposal
 */
const DAY = 24 * 60 * 60 * 1000;
const ago = (days, hour = 10) => {
    const d = new Date(Date.now() - days * DAY);
    d.setHours(hour, 0, 0, 0);
    return d;
};
export const SIMULATOR_MAILBOX = 'you@continuum.test';
export function simulatorInbox() {
    return [
        {
            externalRef: 'sim-msg-001',
            threadRef: 'sim-thread-northwind',
            kind: 'EMAIL',
            subject: 'Re: Northwind — pilot scope',
            body: `Hi,

Thanks for sending the scope over. I walked the team through it this morning and the reaction was positive. The 40-seat pilot looks right for us.

Two things before we go further: we need SSO on day one, and our security team will want to see your data-handling summary.

Can we get 30 minutes on Thursday?

Best,
Dana`,
            occurredAt: ago(6, 9),
            from: 'Dana Whitfield <dana.whitfield@northwind-logistics.com>',
            to: [SIMULATOR_MAILBOX],
            cc: [],
            mailbox: SIMULATOR_MAILBOX,
            headers: {},
        },
        {
            externalRef: 'sim-msg-002',
            threadRef: 'sim-thread-northwind',
            kind: 'EMAIL',
            subject: 'Re: Northwind — pilot scope',
            body: `Dana,

Thursday at 2pm works. I'll send an invite.

SSO is included in the plan you're looking at, and I'll attach the data-handling summary ahead of the call so your security team has time with it.

Speak Thursday,`,
            occurredAt: ago(6, 14),
            from: SIMULATOR_MAILBOX,
            to: ['dana.whitfield@northwind-logistics.com'],
            cc: [],
            mailbox: SIMULATOR_MAILBOX,
            headers: {},
        },
        {
            // Unrecognised sender at a *known* company domain. Must queue a
            // new-contact proposal for confirmation, not write a contact directly.
            externalRef: 'sim-msg-003',
            threadRef: 'sim-thread-northwind',
            kind: 'EMAIL',
            subject: 'Re: Northwind — pilot scope (looping in security)',
            body: `Adding Marcus from our security side.

Marcus, this is the vendor I mentioned. They've got the data-handling summary coming ahead of Thursday.

Dana`,
            occurredAt: ago(5, 11),
            from: 'Marcus Bell <marcus.bell@northwind-logistics.com>',
            to: [SIMULATOR_MAILBOX],
            cc: ['dana.whitfield@northwind-logistics.com'],
            mailbox: SIMULATOR_MAILBOX,
            headers: {},
        },
        {
            // Explicit buying signal — budget approved. Should clear the high
            // confidence bar and propose a stage change (Journey 2).
            externalRef: 'sim-msg-004',
            threadRef: 'sim-thread-northwind',
            kind: 'EMAIL',
            subject: 'Re: Northwind — pilot scope',
            body: `Good news — budget is approved for the 40-seat pilot.

Finance signed off this morning. Send the paperwork over and we'll get it turned around this week. We're aiming to be live by the start of next month.

Dana`,
            occurredAt: ago(2, 9),
            from: 'Dana Whitfield <dana.whitfield@northwind-logistics.com>',
            to: [SIMULATOR_MAILBOX],
            cc: [],
            mailbox: SIMULATOR_MAILBOX,
            headers: {},
        },
        {
            // Marketing mail from a known company domain. Must be dropped by the
            // noise filter before the matching engine sees it.
            externalRef: 'sim-msg-005',
            threadRef: 'sim-thread-newsletter',
            kind: 'EMAIL',
            subject: 'Northwind Logistics — Q3 Industry Roundup',
            body: 'Our quarterly look at freight capacity, fuel costs, and what shippers should expect next quarter. Read the full report on our blog.',
            occurredAt: ago(4, 7),
            from: 'Northwind Insights <newsletter@northwind-logistics.com>',
            to: [SIMULATOR_MAILBOX],
            cc: [],
            mailbox: SIMULATOR_MAILBOX,
            headers: {
                'list-unsubscribe': '<https://northwind-logistics.com/unsubscribe>',
                precedence: 'bulk',
            },
        },
        {
            // Automated notification — no-reply local part.
            externalRef: 'sim-msg-006',
            threadRef: null,
            kind: 'EMAIL',
            subject: 'Your invoice is ready',
            body: 'Invoice #4417 is available in your account.',
            occurredAt: ago(3, 6),
            from: 'no-reply@billing-provider.test',
            to: [SIMULATOR_MAILBOX],
            cc: [],
            mailbox: SIMULATOR_MAILBOX,
            headers: {},
        },
        {
            externalRef: 'sim-msg-007',
            threadRef: 'sim-thread-harbor',
            kind: 'EMAIL',
            subject: 'Harbor Creative — website rebuild',
            body: `Hello,

We're a 30-person design studio and we're looking at rebuilding our marketing site before the new year. Rough budget is somewhere around 60k.

I've copied Priya from our agency partner, who'll be helping us scope it.

Would you have capacity to talk next week?

Regards,
Tomas Lind
Harbor Creative`,
            occurredAt: ago(8, 15),
            from: 'Tomas Lind <tomas@harborcreative.test>',
            to: [SIMULATOR_MAILBOX],
            // CC at a *different* company — exercises multi-company attribution.
            cc: ['Priya Raman <priya@lumenpartners.test>'],
            mailbox: SIMULATOR_MAILBOX,
            headers: {},
        },
        {
            externalRef: 'sim-msg-008',
            threadRef: 'sim-thread-harbor',
            kind: 'EMAIL',
            subject: 'Re: Harbor Creative — website rebuild',
            body: `Tomas,

We'd be glad to. I've put a hold on Tuesday at 11.

Ahead of that, it would help to know roughly how many templates you're expecting and whether the CMS is staying put.`,
            occurredAt: ago(7, 9),
            from: SIMULATOR_MAILBOX,
            to: ['tomas@harborcreative.test'],
            cc: ['priya@lumenpartners.test'],
            mailbox: SIMULATOR_MAILBOX,
            headers: {},
        },
        {
            externalRef: 'sim-evt-101',
            threadRef: null,
            kind: 'MEETING',
            subject: 'Northwind — security review',
            body: 'Walk through the data-handling summary with Northwind security.',
            occurredAt: ago(1, 14),
            from: SIMULATOR_MAILBOX,
            to: ['dana.whitfield@northwind-logistics.com', 'marcus.bell@northwind-logistics.com'],
            cc: [],
            mailbox: SIMULATOR_MAILBOX,
            headers: {},
            meetingStart: ago(1, 14),
            meetingEnd: ago(1, 15),
            attendees: [
                SIMULATOR_MAILBOX,
                'dana.whitfield@northwind-logistics.com',
                'marcus.bell@northwind-logistics.com',
            ],
        },
    ];
}
/**
 * The same calendar event moved to a new time. Returned on a later poll to
 * prove a reschedule updates the existing Activity in place rather than
 * creating a second one.
 */
export function rescheduledMeeting() {
    const start = new Date(Date.now() + 2 * DAY);
    start.setHours(16, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
        externalRef: 'sim-evt-101',
        threadRef: null,
        kind: 'MEETING',
        subject: 'Northwind — security review (moved)',
        body: 'Rescheduled at Northwind\'s request.',
        occurredAt: start,
        from: SIMULATOR_MAILBOX,
        to: ['dana.whitfield@northwind-logistics.com', 'marcus.bell@northwind-logistics.com'],
        cc: [],
        mailbox: SIMULATOR_MAILBOX,
        headers: {},
        meetingStart: start,
        meetingEnd: end,
        attendees: [
            SIMULATOR_MAILBOX,
            'dana.whitfield@northwind-logistics.com',
            'marcus.bell@northwind-logistics.com',
        ],
    };
}
