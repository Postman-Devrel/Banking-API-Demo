import { createHash } from 'node:crypto';
import { ApiError, type ErrorDetail } from './errors.js';
import type { AssessmentInput, FraudAssessment, Signal } from './types.js';

const FIXTURE = {
  transactionId: 'TX-1042', customerId: 'CUS-1001', amount: 3750, currency: 'COSMIC_COINS',
  occurredAt: '2026-08-29T21:14:00.000Z', beneficiaryName: 'Gary Galaxy', beneficiaryAccountId: '2',
  method: 'bank_transfer', customerDisputed: true, reviewChannel: 'support_case', transactionChannel: 'WEB',
  deviceTrusted: false, location: 'Europa Station'
} as const;

function fixtureMismatches(input: AssessmentInput): ErrorDetail[] {
  if (input.transactionId !== FIXTURE.transactionId) return [];
  const checks: Array<[string, unknown, unknown]> = [
    ['customerId', input.customerId, FIXTURE.customerId], ['amount', input.amount, FIXTURE.amount],
    ['currency', input.currency, FIXTURE.currency], ['occurredAt', new Date(input.occurredAt).toISOString(), FIXTURE.occurredAt],
    ['beneficiary.name', input.beneficiary.name, FIXTURE.beneficiaryName], ['beneficiary.accountId', input.beneficiary.accountId, FIXTURE.beneficiaryAccountId],
    ['payment.method', input.payment.method, FIXTURE.method], ['context.customerDisputed', input.context.customerDisputed, FIXTURE.customerDisputed],
    ['context.reviewChannel', input.context.reviewChannel, FIXTURE.reviewChannel], ['context.transactionChannel', input.context.transactionChannel, FIXTURE.transactionChannel],
    ['context.deviceTrusted', input.context.deviceTrusted, FIXTURE.deviceTrusted], ['context.location', input.context.location, FIXTURE.location]
  ];
  return checks.filter(([, actual, expected]) => actual !== expected).map(([field]) => ({ field, issue: 'does not match the canonical TX-1042 fixture' }));
}

function riskLevel(score: number): FraudAssessment['risk']['level'] {
  if (score >= 85) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function genericAssessmentId(transactionId: string): string {
  const numeric = parseInt(createHash('sha256').update(transactionId).digest('hex').slice(0, 8), 16) % 100000;
  return `FRA-${String(numeric).padStart(5, '0')}`;
}

export function assess(input: AssessmentInput): FraudAssessment {
  const mismatches = fixtureMismatches(input);
  if (mismatches.length > 0) throw new ApiError(400, 'FIXTURE_MISMATCH', 'TX-1042 input does not match the Banking fixture', false, mismatches);

  if (input.transactionId === FIXTURE.transactionId) {
    return {
      assessmentId: 'FRA-90142', transactionId: input.transactionId, risk: { score: 82, level: 'high' },
      signals: [
        { code: 'NEW_DEVICE', severity: 'medium', description: 'Transaction originated from a device not previously trusted by the customer.' },
        { code: 'UNUSUAL_AMOUNT', severity: 'high', description: 'Amount is significantly higher than the customer’s normal transaction range.' },
        { code: 'LOCATION_MISMATCH', severity: 'high', description: 'Transaction location differs from the customer’s recent activity.' }
      ],
      recommendation: {
        action: 'REQUIRE_CUSTOMER_VERIFICATION',
        permittedActions: ['REQUEST_IDENTITY_VERIFICATION', 'ESCALATE_TO_FRAUD_TEAM'],
        prohibitedActions: ['ISSUE_IMMEDIATE_REFUND', 'CLOSE_DISPUTE_AS_RESOLVED'],
        reason: 'Multiple high-severity indicators require verification before the dispute can be resolved.'
      },
      model: { name: 'demo-fraud-risk-model', version: '1.1.0' }, assessedAt: '2026-09-08T15:30:00.000Z'
    };
  }

  const signals: Signal[] = [];
  let score = 5;
  if (input.context.customerDisputed) { score += 25; signals.push({ code: 'CUSTOMER_DISPUTED', severity: 'medium', description: 'The customer reported that they do not recognize the transaction.' }); }
  if (!input.context.deviceTrusted) { score += 22; signals.push({ code: 'NEW_DEVICE', severity: 'medium', description: 'The device is not trusted by the customer.' }); }
  if (input.amount >= 3000) { score += 25; signals.push({ code: 'UNUSUAL_AMOUNT', severity: 'high', description: 'The amount exceeds the elevated demo threshold.' }); }
  if (input.context.location !== 'Earth Orbit') { score += 20; signals.push({ code: 'LOCATION_MISMATCH', severity: 'high', description: 'The location differs from the normal demo location.' }); }
  score = Math.min(100, score);
  const level = riskLevel(score);
  const highRisk = score >= 60;
  return {
    assessmentId: genericAssessmentId(input.transactionId), transactionId: input.transactionId,
    risk: { score, level }, signals,
    recommendation: highRisk ? {
      action: score >= 85 ? 'ESCALATE_TO_FRAUD_TEAM' : 'REQUIRE_CUSTOMER_VERIFICATION',
      permittedActions: ['REQUEST_IDENTITY_VERIFICATION', 'ESCALATE_TO_FRAUD_TEAM'],
      prohibitedActions: ['ISSUE_IMMEDIATE_REFUND', 'CLOSE_DISPUTE_AS_RESOLVED'],
      reason: 'The deterministic risk indicators require additional review.'
    } : {
      action: 'ALLOW', permittedActions: [], prohibitedActions: [],
      reason: 'No significant deterministic fraud indicators were detected.'
    },
    model: { name: 'demo-fraud-risk-model', version: '1.1.0' }, assessedAt: '2026-09-08T15:30:00.000Z'
  };
}
