import type { AssessmentInput } from '../src/types.js';

export const tx1042: AssessmentInput = {
  transactionId: 'TX-1042', customerId: 'CUS-1001', amount: 3750, currency: 'COSMIC_COINS',
  occurredAt: '2026-08-29T21:14:00.000Z',
  beneficiary: { name: 'Gary Galaxy', accountId: '2' },
  payment: { method: 'bank_transfer' },
  context: {
    customerDisputed: true, reviewChannel: 'support_case', transactionChannel: 'WEB',
    deviceTrusted: false, location: 'Europa Station'
  }
};
