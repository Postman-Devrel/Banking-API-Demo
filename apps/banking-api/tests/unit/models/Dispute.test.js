const Dispute = require('../../../src/models/Dispute');

describe('Dispute model', () => {
  test('creates an open dispute with supported fields', () => {
    const dispute = new Dispute('DSP-1', 'TX-1042', 'OTHER', 'Review', '1234');
    expect(dispute.toJSON()).toMatchObject({
      disputeId: 'DSP-1',
      transactionId: 'TX-1042',
      reason: 'OTHER',
      notes: 'Review',
      status: 'OPEN'
    });
  });

  test('validates the supported reasons', () => {
    expect(Dispute.validate({ transactionId: 'TX-1042', reason: 'DUPLICATE' }).isValid).toBe(true);
    expect(Dispute.validate({ transactionId: 'TX-1042', reason: 'INVALID' }).isValid).toBe(false);
    expect(Dispute.validate({ reason: 'OTHER' }).isValid).toBe(false);
  });
});
