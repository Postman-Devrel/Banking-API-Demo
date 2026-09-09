const seedVersions = Object.freeze({
  banking: 'fabric-banking-v2',
  fraud: 'fabric-fraud-v2',
  support: 'fabric-support-v2'
});

const banking = {
  principals: [
    { principalId: 'PRN-CUSTOMER-1', role: 'CUSTOMER', customerId: 'CUS-1001' },
    { principalId: 'PRN-CUSTOMER-2', role: 'CUSTOMER', customerId: 'CUS-1002' },
    { principalId: 'PRN-ADMIN-1', role: 'ADMIN' }
  ],
  customers: [
    { customerId: 'CUS-1001', ownerPrincipalId: 'PRN-CUSTOMER-1', name: 'Nova Newman', email: 'nova@intergalactic.example', phone: '+44-7700-900101', address: '42 Aurora Way, London Orbital', kycStatus: 'VERIFIED' },
    { customerId: 'CUS-1002', ownerPrincipalId: 'PRN-CUSTOMER-2', name: 'Gary Galaxy', email: 'gary@intergalactic.example', phone: '+44-7700-900102', address: '8 Comet Close, Europa Station', kycStatus: 'VERIFIED' }
  ],
  accounts: [
    { accountId: '1', owner: 'Nova Newman', balance: 6150, currency: 'COSMIC_COINS', createdAt: '2023-04-10', accountType: 'STANDARD', ownerPrincipalId: 'PRN-CUSTOMER-1' },
    { accountId: '2', owner: 'Gary Galaxy', balance: 4087, currency: 'COSMIC_COINS', createdAt: '2023-04-10', accountType: 'PREMIUM', ownerPrincipalId: 'PRN-CUSTOMER-2' },
    { accountId: '3', owner: 'Nova Newman', balance: 2500, currency: 'GALAXY_GOLD', createdAt: '2024-01-10', accountType: 'BUSINESS', ownerPrincipalId: 'PRN-CUSTOMER-1' },
    { accountId: '4', owner: 'Red Dust Commerce', balance: 125000, currency: 'COSMIC_COINS', createdAt: '2022-06-01', accountType: 'BUSINESS', ownerPrincipalId: 'PRN-EXTERNAL-RED-DUST' },
    { accountId: '5', owner: 'Titan Payroll Services', balance: 500000, currency: 'COSMIC_COINS', createdAt: '2021-02-15', accountType: 'BUSINESS', ownerPrincipalId: 'PRN-EXTERNAL-TITAN' },
    { accountId: '6', owner: 'Nova Newman', balance: 1800, currency: 'MOON_BUCKS', createdAt: '2025-05-21', accountType: 'PREMIUM', ownerPrincipalId: 'PRN-CUSTOMER-1' }
  ],
  transactions: [
    { transactionId: '1', fromAccountId: '1', toAccountId: '2', amount: 100, currency: 'COSMIC_COINS', createdAt: '2024-01-10T10:00:00.000Z', status: 'POSTED', description: 'Docking bay reservation', beneficiaryName: 'Gary Galaxy', channel: 'MOBILE_APP', deviceTrusted: true, location: 'Earth Orbit' },
    { transactionId: 'TX-1001', fromAccountId: '5', toAccountId: '1', amount: 4200, currency: 'COSMIC_COINS', createdAt: '2026-08-01T08:30:00.000Z', status: 'POSTED', description: 'August salary', beneficiaryName: 'Nova Newman', channel: 'API', deviceTrusted: true, location: 'Earth Orbit' },
    { transactionId: 'TX-1008', fromAccountId: '1', toAccountId: '4', amount: 24, currency: 'COSMIC_COINS', createdAt: '2026-08-02T12:10:00.000Z', status: 'POSTED', description: 'Orbital market supplies', beneficiaryName: 'Red Dust Commerce', channel: 'MOBILE_APP', deviceTrusted: true, location: 'Earth Orbit' },
    { transactionId: 'TX-1015', fromAccountId: '1', toAccountId: '2', amount: 85, currency: 'COSMIC_COINS', createdAt: '2026-08-10T18:45:00.000Z', status: 'POSTED', description: 'Shared shuttle fare', beneficiaryName: 'Gary Galaxy', channel: 'MOBILE_APP', deviceTrusted: true, location: 'Earth Orbit' },
    { transactionId: 'TX-1027', fromAccountId: '4', toAccountId: '1', amount: 24, currency: 'COSMIC_COINS', createdAt: '2026-08-12T09:20:00.000Z', status: 'POSTED', description: 'Orbital market refund', beneficiaryName: 'Nova Newman', channel: 'API', deviceTrusted: true, location: 'Earth Orbit' },
    { transactionId: 'TX-1038', fromAccountId: '1', toAccountId: '4', amount: 890, currency: 'COSMIC_COINS', createdAt: '2026-08-25T23:48:00.000Z', status: 'POSTED', description: 'Red Dust electronics order', beneficiaryName: 'Red Dust Commerce', channel: 'WEB', deviceTrusted: false, location: 'Mars Station' },
    { transactionId: 'TX-1042', fromAccountId: '1', toAccountId: '2', amount: 3750, currency: 'COSMIC_COINS', createdAt: '2026-08-29T21:14:00.000Z', status: 'POSTED', description: 'Interstellar freight deposit', beneficiaryName: 'Gary Galaxy', channel: 'WEB', deviceTrusted: false, location: 'Europa Station' },
    { transactionId: 'TX-1055', fromAccountId: '5', toAccountId: '1', amount: 4200, currency: 'COSMIC_COINS', createdAt: '2026-09-01T08:30:00.000Z', status: 'POSTED', description: 'September salary', beneficiaryName: 'Nova Newman', channel: 'API', deviceTrusted: true, location: 'Earth Orbit' },
    { transactionId: 'TX-1060', fromAccountId: '1', toAccountId: '2', amount: 60, currency: 'COSMIC_COINS', createdAt: '2026-09-03T17:15:00.000Z', status: 'POSTED', description: 'Europa shuttle tickets', beneficiaryName: 'Gary Galaxy', channel: 'MOBILE_APP', deviceTrusted: true, location: 'Earth Orbit' }
  ],
  beneficiaries: [
    { beneficiaryId: 'BEN-2001', ownerPrincipalId: 'PRN-CUSTOMER-1', name: 'Gary Galaxy', accountId: '2', status: 'TRUSTED', createdAt: '2026-01-10T09:00:00.000Z' },
    { beneficiaryId: 'BEN-2002', ownerPrincipalId: 'PRN-CUSTOMER-1', name: 'Europa Freight Ltd', externalAccount: 'EUROPA-8842', status: 'PENDING_VERIFICATION', createdAt: '2026-08-28T19:30:00.000Z' },
    { beneficiaryId: 'BEN-2003', ownerPrincipalId: 'PRN-CUSTOMER-1', name: 'Lunar Utilities', externalAccount: 'LUNAR-UTIL-77', status: 'TRUSTED', createdAt: '2025-11-02T11:00:00.000Z' },
    { beneficiaryId: 'BEN-2004', ownerPrincipalId: 'PRN-CUSTOMER-1', name: 'Old Mars Rentals', externalAccount: 'MARS-OLD-19', status: 'INACTIVE', createdAt: '2025-03-12T14:30:00.000Z' }
  ],
  cards: [
    { cardId: 'CARD-3001', ownerPrincipalId: 'PRN-CUSTOMER-1', accountId: '1', type: 'PHYSICAL', last4: '4242', status: 'ACTIVE', spendingLimit: 5000, currency: 'COSMIC_COINS' },
    { cardId: 'CARD-3002', ownerPrincipalId: 'PRN-CUSTOMER-1', accountId: '1', type: 'VIRTUAL', last4: '1042', status: 'ACTIVE', spendingLimit: 4000, currency: 'COSMIC_COINS' },
    { cardId: 'CARD-3003', ownerPrincipalId: 'PRN-CUSTOMER-1', accountId: '3', type: 'VIRTUAL', last4: '7731', status: 'FROZEN', spendingLimit: 1500, currency: 'GALAXY_GOLD' }
  ],
  scheduledPayments: [
    { paymentId: 'PAY-4001', ownerPrincipalId: 'PRN-CUSTOMER-1', fromAccountId: '1', beneficiaryId: 'BEN-2001', amount: 125, currency: 'COSMIC_COINS', executeAt: '2026-09-15T09:00:00.000Z', status: 'SCHEDULED' },
    { paymentId: 'PAY-4002', ownerPrincipalId: 'PRN-CUSTOMER-1', fromAccountId: '1', beneficiaryId: 'BEN-2003', amount: 80, currency: 'COSMIC_COINS', executeAt: '2026-09-18T07:00:00.000Z', status: 'SCHEDULED' },
    { paymentId: 'PAY-4003', ownerPrincipalId: 'PRN-CUSTOMER-1', fromAccountId: '1', beneficiaryId: 'BEN-2001', amount: 45, currency: 'COSMIC_COINS', executeAt: '2026-09-10T09:00:00.000Z', status: 'CANCELLED' }
  ],
  standingOrders: [
    { standingOrderId: 'SO-5001', ownerPrincipalId: 'PRN-CUSTOMER-1', fromAccountId: '1', beneficiaryId: 'BEN-2001', amount: 50, currency: 'COSMIC_COINS', frequency: 'MONTHLY', nextExecutionAt: '2026-09-20T09:00:00.000Z', status: 'ACTIVE' },
    { standingOrderId: 'SO-5002', ownerPrincipalId: 'PRN-CUSTOMER-1', fromAccountId: '1', beneficiaryId: 'BEN-2003', amount: 80, currency: 'COSMIC_COINS', frequency: 'MONTHLY', nextExecutionAt: '2026-10-01T07:00:00.000Z', status: 'PAUSED' }
  ],
  directDebits: [
    { directDebitId: 'DD-6001', ownerPrincipalId: 'PRN-CUSTOMER-1', accountId: '1', merchant: 'Lunar Utilities', mandateReference: 'MANDATE-LUNAR-1', amount: 80, currency: 'COSMIC_COINS', status: 'ACTIVE' },
    { directDebitId: 'DD-6002', ownerPrincipalId: 'PRN-CUSTOMER-1', accountId: '1', merchant: 'Orbital Broadband', mandateReference: 'MANDATE-ORBITAL-9', amount: 55, currency: 'COSMIC_COINS', status: 'ACTIVE' },
    { directDebitId: 'DD-6003', ownerPrincipalId: 'PRN-CUSTOMER-1', accountId: '3', merchant: 'Mars Trade Registry', mandateReference: 'MANDATE-MARS-3', amount: 120, currency: 'GALAXY_GOLD', status: 'CANCELLED' }
  ],
  notificationPreferences: [
    { ownerPrincipalId: 'PRN-CUSTOMER-1', transactionAlerts: true, fraudAlerts: true, marketing: false, channels: ['EMAIL', 'PUSH'] },
    { ownerPrincipalId: 'PRN-CUSTOMER-2', transactionAlerts: true, fraudAlerts: true, marketing: false, channels: ['EMAIL'] }
  ],
  disputes: [
    { disputeId: 'DSP-7001', transactionId: 'TX-1008', reason: 'CUSTOMER_NOT_RECOGNIZED', notes: 'Customer later recognized the merchant descriptor and confirmed the purchase.', status: 'RESOLVED', createdByPrincipalId: 'PRN-CUSTOMER-1', createdAt: '2026-08-02T12:20:00.000Z', updatedAt: '2026-08-03T10:30:00.000Z', evidence: [{ evidenceId: 'EVD-7001', type: 'CUSTOMER_CONFIRMATION', description: 'Customer passed verification and confirmed the Red Dust Commerce purchase.', createdAt: '2026-08-03T10:20:00.000Z' }] }
  ],
  auditEvents: [
    { eventId: 'AUD-000001', actorPrincipalId: 'PRN-CUSTOMER-1', action: 'TRANSACTION_POSTED', resourceType: 'transaction', resourceId: 'TX-1008', createdAt: '2026-08-02T12:10:00.000Z' },
    { eventId: 'AUD-000002', actorPrincipalId: 'PRN-CUSTOMER-1', action: 'TRANSACTION_POSTED', resourceType: 'transaction', resourceId: 'TX-1038', createdAt: '2026-08-25T23:48:00.000Z' },
    { eventId: 'AUD-000003', actorPrincipalId: 'PRN-CUSTOMER-1', action: 'DISPUTE_CREATED', resourceType: 'dispute', resourceId: 'DSP-7001', createdAt: '2026-08-02T12:20:00.000Z' },
    { eventId: 'AUD-000004', actorPrincipalId: 'PRN-ADMIN-1', action: 'DISPUTE_STATUS_UPDATED', resourceType: 'dispute', resourceId: 'DSP-7001', createdAt: '2026-08-03T10:30:00.000Z' },
    { eventId: 'AUD-000005', actorPrincipalId: 'PRN-CUSTOMER-1', action: 'TRANSACTION_POSTED', resourceType: 'transaction', resourceId: 'TX-1042', createdAt: '2026-08-29T21:14:00.000Z' },
    { eventId: 'AUD-000006', actorPrincipalId: 'PRN-CUSTOMER-1', action: 'BENEFICIARY_CREATED', resourceType: 'beneficiary', resourceId: 'BEN-2002', createdAt: '2026-08-28T19:30:00.000Z' }
  ]
};

const fraudInputs = [
  { transactionId: 'TX-1008', customerId: 'CUS-1001', amount: 24, currency: 'COSMIC_COINS', occurredAt: '2026-08-02T12:10:00.000Z', beneficiary: { name: 'Red Dust Commerce', accountId: '4' }, payment: { method: 'card', cardPresent: false }, context: { customerDisputed: false, reviewChannel: 'automated_review', transactionChannel: 'MOBILE_APP', deviceTrusted: true, location: 'Earth Orbit' } },
  { transactionId: 'TX-1038', customerId: 'CUS-1001', amount: 890, currency: 'COSMIC_COINS', occurredAt: '2026-08-25T23:48:00.000Z', beneficiary: { name: 'Red Dust Commerce', accountId: '4' }, payment: { method: 'card', cardPresent: false }, context: { customerDisputed: true, reviewChannel: 'support_case', transactionChannel: 'WEB', deviceTrusted: false, location: 'Mars Station' } },
  { transactionId: 'TX-1055', customerId: 'CUS-1001', amount: 4200, currency: 'COSMIC_COINS', occurredAt: '2026-09-01T08:30:00.000Z', beneficiary: { name: 'Nova Newman', accountId: '1' }, payment: { method: 'bank_transfer' }, context: { customerDisputed: false, reviewChannel: 'automated_review', transactionChannel: 'API', deviceTrusted: true, location: 'Earth Orbit' } }
];

const support = {
  cases: [
    { caseId: 'CASE-2012', customerId: 'CUS-1001', transactionId: 'TX-1008', subject: 'Card purchase confirmation', description: 'Nova asked whether the orbital market purchase was legitimate.', category: 'CARD_ISSUE', channel: 'CHAT', status: 'CLOSED', priority: 'LOW', tags: ['customer-contacted'], assignedQueueId: 'QUEUE-PAYMENTS', assignedPrincipalId: null, verificationStatus: 'PASSED', resolution: { code: 'CUSTOMER_VERIFIED_TRANSACTION', summary: 'Customer confirmed the purchase after reviewing the merchant details.', resolvedAt: '2026-08-03T10:30:00.000Z' }, createdAt: '2026-08-02T12:20:00.000Z', updatedAt: '2026-08-03T10:35:00.000Z' },
    { caseId: 'CASE-2038', customerId: 'CUS-1001', transactionId: 'TX-1038', subject: 'Unrecognized Red Dust electronics order', description: 'A high-value purchase from a new device at Mars Station requires specialist review.', category: 'UNRECOGNIZED_TRANSACTION', channel: 'IN_APP', status: 'ESCALATED', priority: 'CRITICAL', tags: ['disputed-transfer', 'fraud-review', 'high-value', 'identity-verification'], assignedQueueId: 'QUEUE-FRAUD', assignedPrincipalId: null, verificationStatus: 'PASSED', resolution: null, createdAt: '2026-08-26T08:00:00.000Z', updatedAt: '2026-08-27T16:25:00.000Z' },
    { caseId: 'CASE-2042', customerId: 'CUS-1001', transactionId: 'TX-1042', subject: 'Unrecognized transfer to Gary Galaxy', description: 'The customer reports that they do not recognize the transfer to Gary Galaxy.', category: 'UNRECOGNIZED_TRANSACTION', channel: 'PHONE', status: 'OPEN', priority: 'HIGH', tags: ['disputed-transfer'], assignedQueueId: 'QUEUE-PAYMENTS', assignedPrincipalId: null, verificationStatus: 'NOT_REQUESTED', resolution: null, createdAt: '2026-09-08T13:42:17.000Z', updatedAt: '2026-09-08T13:42:17.000Z' },
    { caseId: 'CASE-2055', customerId: 'CUS-1001', transactionId: 'TX-1055', subject: 'September salary appeared late', description: 'The incoming payroll transfer was located and reconciled.', category: 'PAYMENT_DELAY', channel: 'EMAIL', status: 'RESOLVED', priority: 'MEDIUM', tags: ['customer-contacted'], assignedQueueId: 'QUEUE-PAYMENTS', assignedPrincipalId: 'PRN-SUPPORT-AGENT', verificationStatus: 'NOT_REQUESTED', resolution: { code: 'OTHER', summary: 'Payroll transfer was posted successfully and the customer was notified.', resolvedAt: '2026-09-02T11:10:00.000Z' }, createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-02T11:10:00.000Z' },
    { caseId: 'CASE-2060', customerId: 'CUS-1001', transactionId: 'TX-1060', subject: 'Account access review after shuttle purchase', description: 'Customer requested an account-security review after seeing a new session notification.', category: 'ACCOUNT_ACCESS', channel: 'IN_APP', status: 'AWAITING_CUSTOMER', priority: 'HIGH', tags: ['identity-verification'], assignedQueueId: 'QUEUE-FRAUD', assignedPrincipalId: 'PRN-SUPPORT-AGENT', verificationStatus: 'PENDING', resolution: null, createdAt: '2026-09-08T14:20:00.000Z', updatedAt: '2026-09-08T14:45:00.000Z' }
  ],
  notes: [
    { noteId: 'NOTE-2001', caseId: 'CASE-2042', type: 'CUSTOMER_STATEMENT', content: 'I do not recognize this transfer to Gary Galaxy.', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-09-08T13:42:17.000Z' },
    { noteId: 'NOTE-2002', caseId: 'CASE-2012', type: 'CUSTOMER_STATEMENT', content: 'I remember buying supplies after seeing the Red Dust Commerce receipt.', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-02T12:24:00.000Z' },
    { noteId: 'NOTE-2003', caseId: 'CASE-2038', type: 'CUSTOMER_STATEMENT', content: 'I did not place this electronics order and was not at Mars Station.', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-26T08:08:00.000Z' },
    { noteId: 'NOTE-2004', caseId: 'CASE-2038', type: 'INVESTIGATION_SUMMARY', content: 'Banking and fraud evidence show a new device, location mismatch, and customer denial.', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-26T09:15:00.000Z' },
    { noteId: 'NOTE-2005', caseId: 'CASE-2055', type: 'CUSTOMER_STATEMENT', content: 'My salary normally arrives before 09:00 on the first day of the month.', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-09-01T10:05:00.000Z' },
    { noteId: 'NOTE-2006', caseId: 'CASE-2060', type: 'INTERNAL_NOTE', content: 'Identity verification requested before discussing session history.', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-09-08T14:45:00.000Z' }
  ],
  evidence: [
    { evidenceId: 'EVD-3001', caseId: 'CASE-2012', type: 'BANKING_TRANSACTION', referenceId: 'TX-1008', source: 'banking-api', summary: 'Trusted-device market purchase.', facts: { transactionId: 'TX-1008', amount: 24, currency: 'COSMIC_COINS', beneficiaryName: 'Red Dust Commerce', status: 'POSTED' }, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-02T12:25:00.000Z' },
    { evidenceId: 'EVD-3002', caseId: 'CASE-2012', type: 'FRAUD_ASSESSMENT', referenceId: 'FRA-55692', source: 'fraud-api', summary: 'Low-risk automated assessment.', facts: { assessmentId: 'FRA-55692', riskScore: 5, riskLevel: 'low', recommendation: 'ALLOW' }, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-02T12:26:00.000Z' },
    { evidenceId: 'EVD-3003', caseId: 'CASE-2038', type: 'BANKING_TRANSACTION', referenceId: 'TX-1038', source: 'banking-api', summary: 'High-value purchase from an untrusted device.', facts: { transactionId: 'TX-1038', amount: 890, currency: 'COSMIC_COINS', beneficiaryName: 'Red Dust Commerce', status: 'POSTED' }, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-26T08:20:00.000Z' },
    { evidenceId: 'EVD-3004', caseId: 'CASE-2038', type: 'FRAUD_ASSESSMENT', referenceId: 'FRA-76469', source: 'fraud-api', summary: 'High-risk assessment requiring verification.', facts: { assessmentId: 'FRA-76469', riskScore: 72, riskLevel: 'high', recommendation: 'REQUIRE_CUSTOMER_VERIFICATION' }, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-26T08:22:00.000Z' },
    { evidenceId: 'EVD-3005', caseId: 'CASE-2055', type: 'BANKING_TRANSACTION', referenceId: 'TX-1055', source: 'banking-api', summary: 'Posted payroll transfer.', facts: { transactionId: 'TX-1055', amount: 4200, currency: 'COSMIC_COINS', beneficiaryName: 'Nova Newman', status: 'POSTED' }, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-09-01T10:15:00.000Z' },
    { evidenceId: 'EVD-3006', caseId: 'CASE-2055', type: 'FRAUD_ASSESSMENT', referenceId: 'FRA-81139', source: 'fraud-api', summary: 'Medium-risk amount signal with allow recommendation.', facts: { assessmentId: 'FRA-81139', riskScore: 30, riskLevel: 'medium', recommendation: 'ALLOW' }, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-09-01T10:17:00.000Z' }
  ],
  verifications: [
    { verificationId: 'VER-4001', caseId: 'CASE-2012', method: 'SECURITY_QUESTIONS', reason: 'Confirm the customer recognizes the purchase.', status: 'PASSED', requestedByPrincipalId: 'PRN-SUPPORT-AGENT', requestedAt: '2026-08-02T12:28:00.000Z', completedAt: '2026-08-03T10:20:00.000Z', completionNotes: 'Customer passed verification and confirmed the merchant.' },
    { verificationId: 'VER-4002', caseId: 'CASE-2038', method: 'CALLBACK', reason: 'High-risk assessment requires independent verification.', status: 'PASSED', requestedByPrincipalId: 'PRN-SUPPORT-AGENT', requestedAt: '2026-08-26T08:30:00.000Z', completedAt: '2026-08-27T16:10:00.000Z', completionNotes: 'Identity confirmed; customer continued to deny the purchase.' },
    { verificationId: 'VER-4003', caseId: 'CASE-2060', method: 'IDENTITY_CHECK', reason: 'Verify identity before reviewing account session activity.', status: 'PENDING', requestedByPrincipalId: 'PRN-SUPPORT-AGENT', requestedAt: '2026-09-08T14:45:00.000Z', completedAt: null, completionNotes: null }
  ],
  escalations: [
    { escalationId: 'ESC-5001', caseId: 'CASE-2038', target: 'FRAUD_TEAM', reason: 'Customer denial and high-risk signals require specialist investigation.', evidenceIds: ['EVD-3003', 'EVD-3004'], status: 'OPEN', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-27T16:25:00.000Z' }
  ],
  tasks: [
    { taskId: 'TASK-6001', caseId: 'CASE-2038', title: 'Review transaction and fraud evidence', description: 'Compare TX-1038 with FRA-76469.', type: 'REVIEW_EVIDENCE', priority: 'CRITICAL', status: 'COMPLETED', dueAt: '2026-08-26T12:00:00.000Z', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-26T08:25:00.000Z', updatedAt: '2026-08-26T09:15:00.000Z' },
    { taskId: 'TASK-6002', caseId: 'CASE-2038', title: 'Fraud specialist decision', description: 'Determine whether further containment is required.', type: 'REVIEW_EVIDENCE', priority: 'CRITICAL', status: 'OPEN', dueAt: '2026-09-09T10:00:00.000Z', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-27T16:25:00.000Z', updatedAt: '2026-08-27T16:25:00.000Z' },
    { taskId: 'TASK-6003', caseId: 'CASE-2060', title: 'Complete identity verification', description: 'Await the customer identity-check result.', type: 'VERIFY_IDENTITY', priority: 'HIGH', status: 'OPEN', dueAt: '2026-09-09T14:45:00.000Z', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-09-08T14:45:00.000Z', updatedAt: '2026-09-08T14:45:00.000Z' },
    { taskId: 'TASK-6004', caseId: 'CASE-2055', title: 'Locate payroll transfer', description: 'Trace TX-1055 and confirm posting.', type: 'REVIEW_TRANSACTION', priority: 'MEDIUM', status: 'COMPLETED', dueAt: '2026-09-02T10:00:00.000Z', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-09-01T10:10:00.000Z', updatedAt: '2026-09-02T11:00:00.000Z' }
  ],
  relatedCases: [
    { caseId: 'CASE-2012', relatedCaseId: 'CASE-2038', relationship: 'RELATED_INCIDENT', reason: 'Both transactions involve Red Dust Commerce.', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-26T09:20:00.000Z' }
  ],
  interactions: [
    { interactionId: 'INT-2001', caseId: 'CASE-2042', customerId: 'CUS-1001', type: 'CALL', direction: 'INBOUND', summary: 'Customer reported an unrecognized transfer.', customerReached: true, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-09-08T13:42:17.000Z' },
    { interactionId: 'INT-2002', caseId: 'CASE-2012', customerId: 'CUS-1001', type: 'CHAT', direction: 'INBOUND', summary: 'Customer asked about the merchant descriptor.', customerReached: true, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-02T12:20:00.000Z' },
    { interactionId: 'INT-2003', caseId: 'CASE-2012', customerId: 'CUS-1001', type: 'EMAIL', direction: 'OUTBOUND', summary: 'Sent the transaction receipt and closure summary.', customerReached: true, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-03T10:35:00.000Z' },
    { interactionId: 'INT-2004', caseId: 'CASE-2038', customerId: 'CUS-1001', type: 'CALL', direction: 'INBOUND', summary: 'Customer denied making the Red Dust electronics purchase.', customerReached: true, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-26T08:08:00.000Z' },
    { interactionId: 'INT-2005', caseId: 'CASE-2038', customerId: 'CUS-1001', type: 'CALL', direction: 'OUTBOUND', summary: 'Completed identity callback and explained the fraud escalation.', customerReached: true, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-27T16:10:00.000Z' },
    { interactionId: 'INT-2006', caseId: 'CASE-2055', customerId: 'CUS-1001', type: 'EMAIL', direction: 'OUTBOUND', summary: 'Confirmed that the payroll transfer posted successfully.', customerReached: true, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-09-02T11:10:00.000Z' },
    { interactionId: 'INT-2007', caseId: 'CASE-2060', customerId: 'CUS-1001', type: 'CHAT', direction: 'INBOUND', summary: 'Customer requested help reviewing a new session alert.', customerReached: true, actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-09-08T14:20:00.000Z' }
  ],
  knowledgeLinks: [
    { caseId: 'CASE-2012', articleId: 'KB-1004', reason: 'Refund restrictions were explained before closure.', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-02T12:30:00.000Z' },
    { caseId: 'CASE-2038', articleId: 'KB-1001', reason: 'Unrecognized-transfer checklist applies.', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-26T08:18:00.000Z' },
    { caseId: 'CASE-2038', articleId: 'KB-1003', reason: 'High-risk escalation procedure applies.', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-08-27T16:24:00.000Z' },
    { caseId: 'CASE-2060', articleId: 'KB-1005', reason: 'Account compromise handling guides the verification.', actorPrincipalId: 'PRN-SUPPORT-AGENT', createdAt: '2026-09-08T14:40:00.000Z' }
  ],
  events: [
    { eventId: 'EVT-2001', caseId: 'CASE-2042', action: 'CASE_CREATED', actorPrincipalId: 'PRN-SUPPORT-SYSTEM', requestId: 'REQ-SEED', createdAt: '2026-09-08T13:42:17.000Z', metadata: { channel: 'PHONE' } },
    { eventId: 'EVT-2002', caseId: 'CASE-2012', action: 'CASE_CREATED', actorPrincipalId: 'PRN-SUPPORT-SYSTEM', requestId: 'REQ-SEED', createdAt: '2026-08-02T12:20:00.000Z', metadata: { channel: 'CHAT' } },
    { eventId: 'EVT-2003', caseId: 'CASE-2012', action: 'EVIDENCE_ATTACHED', actorPrincipalId: 'PRN-SUPPORT-AGENT', requestId: 'REQ-SEED', createdAt: '2026-08-02T12:25:00.000Z', metadata: { evidenceId: 'EVD-3001' } },
    { eventId: 'EVT-2004', caseId: 'CASE-2012', action: 'VERIFICATION_COMPLETED', actorPrincipalId: 'PRN-SUPPORT-ADMIN', requestId: 'REQ-SEED', createdAt: '2026-08-03T10:20:00.000Z', metadata: { outcome: 'PASSED' } },
    { eventId: 'EVT-2005', caseId: 'CASE-2012', action: 'CASE_CLOSED', actorPrincipalId: 'PRN-SUPPORT-ADMIN', requestId: 'REQ-SEED', createdAt: '2026-08-03T10:35:00.000Z', metadata: { resolutionCode: 'CUSTOMER_VERIFIED_TRANSACTION' } },
    { eventId: 'EVT-2006', caseId: 'CASE-2038', action: 'CASE_CREATED', actorPrincipalId: 'PRN-SUPPORT-SYSTEM', requestId: 'REQ-SEED', createdAt: '2026-08-26T08:00:00.000Z', metadata: { channel: 'IN_APP' } },
    { eventId: 'EVT-2007', caseId: 'CASE-2038', action: 'INVESTIGATION_STARTED', actorPrincipalId: 'PRN-SUPPORT-AGENT', requestId: 'REQ-SEED', createdAt: '2026-08-26T08:10:00.000Z', metadata: { reason: 'Customer denied purchase' } },
    { eventId: 'EVT-2008', caseId: 'CASE-2038', action: 'EVIDENCE_ATTACHED', actorPrincipalId: 'PRN-SUPPORT-AGENT', requestId: 'REQ-SEED', createdAt: '2026-08-26T08:22:00.000Z', metadata: { evidenceId: 'EVD-3004' } },
    { eventId: 'EVT-2009', caseId: 'CASE-2038', action: 'CASE_ESCALATED', actorPrincipalId: 'PRN-SUPPORT-AGENT', requestId: 'REQ-SEED', createdAt: '2026-08-27T16:25:00.000Z', metadata: { target: 'FRAUD_TEAM' } },
    { eventId: 'EVT-2010', caseId: 'CASE-2055', action: 'CASE_CREATED', actorPrincipalId: 'PRN-SUPPORT-SYSTEM', requestId: 'REQ-SEED', createdAt: '2026-09-01T10:00:00.000Z', metadata: { channel: 'EMAIL' } },
    { eventId: 'EVT-2011', caseId: 'CASE-2055', action: 'CASE_RESOLVED', actorPrincipalId: 'PRN-SUPPORT-ADMIN', requestId: 'REQ-SEED', createdAt: '2026-09-02T11:10:00.000Z', metadata: { resolutionCode: 'OTHER' } },
    { eventId: 'EVT-2012', caseId: 'CASE-2060', action: 'CASE_CREATED', actorPrincipalId: 'PRN-SUPPORT-SYSTEM', requestId: 'REQ-SEED', createdAt: '2026-09-08T14:20:00.000Z', metadata: { channel: 'IN_APP' } },
    { eventId: 'EVT-2013', caseId: 'CASE-2060', action: 'VERIFICATION_REQUESTED', actorPrincipalId: 'PRN-SUPPORT-AGENT', requestId: 'REQ-SEED', createdAt: '2026-09-08T14:45:00.000Z', metadata: { verificationId: 'VER-4003' } }
  ]
};

function clone(value) { return structuredClone(value); }
function createBankingSeed() { return clone(banking); }
function createFraudSeedInputs() { return clone(fraudInputs); }
function createSupportSeed() { return clone(support); }

module.exports = { seedVersions, createBankingSeed, createFraudSeedInputs, createSupportSeed };
