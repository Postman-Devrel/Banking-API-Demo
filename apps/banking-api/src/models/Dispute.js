/**
 * Dispute Model
 * Represents a review request against an immutable transaction.
 */

const VALID_REASONS = [
  'CUSTOMER_NOT_RECOGNIZED',
  'DUPLICATE',
  'INCORRECT_AMOUNT',
  'OTHER'
];

class Dispute {
  constructor(disputeId, transactionId, reason, notes, createdByPrincipalId, createdAt = new Date().toISOString()) {
    this.disputeId = disputeId;
    this.transactionId = transactionId;
    this.reason = reason;
    this.notes = notes || null;
    this.status = 'OPEN';
    this.createdByPrincipalId = createdByPrincipalId;
    this.createdAt = createdAt;
  }

  static validate(data) {
    if (!data.transactionId || typeof data.transactionId !== 'string') {
      return { isValid: false, error: 'transactionId is required' };
    }

    if (!VALID_REASONS.includes(data.reason)) {
      return { isValid: false, error: `Reason must be one of: ${VALID_REASONS.join(', ')}` };
    }

    if (data.notes !== undefined && typeof data.notes !== 'string') {
      return { isValid: false, error: 'notes must be a string' };
    }

    return { isValid: true };
  }

  toJSON() {
    return {
      disputeId: this.disputeId,
      transactionId: this.transactionId,
      reason: this.reason,
      notes: this.notes,
      status: this.status,
      createdAt: this.createdAt
    };
  }
}

Dispute.VALID_REASONS = VALID_REASONS;

module.exports = Dispute;
