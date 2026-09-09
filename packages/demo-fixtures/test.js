const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fixtures = require('./index');

const banking = fixtures.createBankingSeed();
const fraud = fixtures.createFraudSeedInputs();
const support = fixtures.createSupportSeed();
const transactions = new Map(banking.transactions.map(value => [value.transactionId, value]));
const accounts = new Map(banking.accounts.map(value => [value.accountId, value]));
const cases = new Set(support.cases.map(value => value.caseId));
const assessmentId = transactionId => `FRA-${String(parseInt(crypto.createHash('sha256').update(transactionId).digest('hex').slice(0, 8), 16) % 100000).padStart(5, '0')}`;

assert.deepEqual(fixtures.seedVersions, { banking: 'fabric-banking-v2', fraud: 'fabric-fraud-v2', support: 'fabric-support-v2' });
assert.equal(banking.accounts.length, 6);
assert.equal(banking.transactions.length, 9);
assert.equal(support.cases.length, 5);
assert.equal(fraud.length, 3);

for (const [collection, key] of [
  [banking.accounts, 'accountId'], [banking.transactions, 'transactionId'], [banking.beneficiaries, 'beneficiaryId'],
  [banking.cards, 'cardId'], [support.cases, 'caseId'], [support.evidence, 'evidenceId'], [support.tasks, 'taskId']
]) assert.equal(new Set(collection.map(value => value[key])).size, collection.length, `${key} values must be unique`);

for (const transaction of banking.transactions) {
  const source = transaction.fromAccountId === '0' ? undefined : accounts.get(transaction.fromAccountId);
  const destination = accounts.get(transaction.toAccountId);
  assert.ok(destination, `Transaction ${transaction.transactionId} must have a destination account`);
  assert.ok(!source || source.currency === transaction.currency, `Transaction ${transaction.transactionId} source currency must match`);
  assert.equal(destination.currency, transaction.currency, `Transaction ${transaction.transactionId} destination currency must match`);
}

for (const input of fraud) {
  const transaction = transactions.get(input.transactionId);
  assert.ok(transaction, `Fraud transaction ${input.transactionId} must exist in Banking`);
  assert.equal(input.amount, transaction.amount);
  assert.equal(input.currency, transaction.currency);
  assert.equal(input.occurredAt, transaction.createdAt);
}

for (const supportCase of support.cases) assert.ok(transactions.has(supportCase.transactionId), `Support transaction ${supportCase.transactionId} must exist in Banking`);
for (const collection of [support.notes, support.evidence, support.verifications, support.escalations, support.tasks, support.relatedCases, support.interactions, support.knowledgeLinks, support.events]) {
  for (const record of collection) assert.ok(cases.has(record.caseId), `Support resource must reference an existing case: ${record.caseId}`);
}
for (const evidence of support.evidence.filter(value => value.type === 'BANKING_TRANSACTION')) assert.ok(transactions.has(evidence.referenceId), `Banking evidence ${evidence.referenceId} must exist`);
const seededAssessmentIds = new Set(fraud.map(input => assessmentId(input.transactionId)));
for (const evidence of support.evidence.filter(value => value.type === 'FRAUD_ASSESSMENT')) assert.ok(seededAssessmentIds.has(evidence.referenceId), `Fraud evidence ${evidence.referenceId} must exist`);

assert.equal(fraud.some(value => value.transactionId === 'TX-1042'), false, 'TX-1042 must remain unassessed for the showcase workflow');
assert.equal(support.evidence.some(value => value.caseId === 'CASE-2042'), false, 'CASE-2042 must begin without attached evidence');
assert.equal(banking.disputes.some(value => value.transactionId === 'TX-1042'), false, 'TX-1042 must begin without a Banking dispute');
assert.deepEqual(new Set(support.cases.map(value => value.status)), new Set(['OPEN', 'ESCALATED', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED']));

const another = fixtures.createSupportSeed();
another.cases[0].status = 'OPEN';
assert.equal(fixtures.createSupportSeed().cases[0].status, 'CLOSED', 'Fixture factories must return independent copies');

console.log('Cross-service demo fixtures are coherent.');
