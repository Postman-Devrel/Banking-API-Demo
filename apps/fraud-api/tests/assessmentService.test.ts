import { describe, expect, it } from 'vitest';
import { assess } from '../src/assessmentService.js';
import { ApiError } from '../src/errors.js';
import { tx1042 } from './fixtures.js';

describe('deterministic fraud assessment', () => {
  it('returns the exact canonical TX-1042 decision', () => {
    expect(assess(tx1042)).toEqual({
      assessmentId: 'FRA-90142', transactionId: 'TX-1042', risk: { score: 82, level: 'high' },
      signals: [
        { code: 'NEW_DEVICE', severity: 'medium', description: expect.any(String) },
        { code: 'UNUSUAL_AMOUNT', severity: 'high', description: expect.any(String) },
        { code: 'LOCATION_MISMATCH', severity: 'high', description: expect.any(String) }
      ],
      recommendation: {
        action: 'REQUIRE_CUSTOMER_VERIFICATION',
        permittedActions: ['REQUEST_IDENTITY_VERIFICATION', 'ESCALATE_TO_FRAUD_TEAM'],
        prohibitedActions: ['ISSUE_IMMEDIATE_REFUND', 'CLOSE_DISPUTE_AS_RESOLVED'],
        reason: expect.any(String)
      },
      model: { name: 'demo-fraud-risk-model', version: '1.1.0' }, assessedAt: '2026-09-08T15:30:00.000Z'
    });
  });

  it('rejects contradictory TX-1042 data', () => {
    try {
      assess({ ...tx1042, amount: 10 });
      throw new Error('expected fixture mismatch');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 400, code: 'FIXTURE_MISMATCH' });
    }
  });

  it('scores generic low, medium, high, and critical inputs deterministically', () => {
    const base = { ...tx1042, transactionId: 'TX-GENERIC', customerId: 'CUS-X', amount: 10, occurredAt: '2026-01-01T00:00:00Z', beneficiary: { name: 'Test' } };
    const low = assess({ ...base, context: { ...base.context, customerDisputed: false, deviceTrusted: true, location: 'Earth Orbit' } });
    const medium = assess({ ...base, context: { ...base.context, customerDisputed: true, deviceTrusted: true, location: 'Earth Orbit' } });
    const high = assess({ ...base, amount: 4000, context: { ...base.context, customerDisputed: true, deviceTrusted: false, location: 'Earth Orbit' } });
    const critical = assess({ ...base, amount: 4000, context: { ...base.context, customerDisputed: true, deviceTrusted: false, location: 'Mars' } });
    expect(low.risk).toEqual({ score: 5, level: 'low' });
    expect(medium.risk).toEqual({ score: 30, level: 'medium' });
    expect(high.risk.level).toBe('high');
    expect(critical.risk.level).toBe('critical');
    expect(critical.recommendation.action).toBe('ESCALATE_TO_FRAUD_TEAM');
    expect(assess(base).assessmentId).toBe(assess(base).assessmentId);
  });
});
