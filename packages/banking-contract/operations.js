const op = (method, path, operationId, tag, summary, options = {}) => ({
  method, path, operationId, tag, summary, description: options.description || `${summary} in the selected run.`,
  status: options.status || 200, response: options.response, request: options.request,
  public: Boolean(options.public), admin: Boolean(options.admin), mutation: Boolean(options.mutation),
  paginated: Boolean(options.paginated), queries: options.queries || []
});
const mutation = (method, path, operationId, tag, summary, request, response, status = 200, options = {}) =>
  op(method, path, operationId, tag, summary, Object.assign({}, options, { request, response, status, mutation: true }));
const list = (path, operationId, tag, summary, response, queries = []) =>
  op('get', path, operationId, tag, summary, { response, paginated: true, queries });

module.exports = [
  op('get', '/health', 'checkHealth', 'System', 'Check service health', { public: true, response: 'Health' }),
  op('get', '/openapi.yaml', 'getOpenApiDocument', 'System', 'Download the OpenAPI contract', { public: true, response: null }),
  op('get', '/api/v1/auth', 'generateLegacyApiKey', 'Admin', 'Create a deprecated development credential', { public: true, response: 'CredentialCreated' }),
  mutation('post', '/api/v1/admin/api-keys', 'createApiKey', 'Admin', 'Create an API credential', 'adminCreateCredential', 'CredentialCreated', 201, { admin: true }),

  list('/api/v1/accounts', 'listAccounts', 'Accounts', 'List owned accounts', 'AccountList', ['owner', 'createdAt']),
  mutation('post', '/api/v1/accounts', 'createAccount', 'Accounts', 'Create an account', 'createAccount', 'AccountResponse', 201),
  op('get', '/api/v1/accounts/{accountId}', 'getAccount', 'Accounts', 'Get an owned account', { response: 'AccountResponse' }),
  mutation('put', '/api/v1/accounts/{accountId}', 'updateAccount', 'Accounts', 'Replace mutable account fields', 'updateAccount', 'AccountResponse'),
  mutation('patch', '/api/v1/accounts/{accountId}', 'patchAccount', 'Accounts', 'Update mutable account fields', 'updateAccount', 'AccountResponse'),
  mutation('delete', '/api/v1/accounts/{accountId}', 'deleteAccount', 'Accounts', 'Deactivate an empty account', null, 'AccountResponse'),

  list('/api/v1/transactions', 'listTransactions', 'Transactions', 'List visible transactions', 'TransactionList', ['fromAccountId', 'toAccountId', 'createdAt']),
  mutation('post', '/api/v1/transactions', 'createTransaction', 'Transactions', 'Post an atomic transfer or deposit', 'createTransaction', 'TransactionResponse', 201),
  op('get', '/api/v1/transactions/{transactionId}', 'getTransaction', 'Transactions', 'Get a visible transaction', { response: 'TransactionResponse' }),

  list('/api/v1/disputes', 'listDisputes', 'Disputes', 'List visible disputes', 'DisputeList', ['transactionId']),
  mutation('post', '/api/v1/disputes', 'createDispute', 'Disputes', 'Open a transaction dispute', 'createDispute', 'DisputeResponse', 201),
  op('get', '/api/v1/disputes/{disputeId}', 'getDispute', 'Disputes', 'Get a visible dispute', { response: 'DisputeResponse' }),
  mutation('patch', '/api/v1/disputes/{disputeId}/status', 'updateDisputeStatus', 'Disputes', 'Transition a dispute as an administrator', 'disputeStatus', 'DisputeResponse', 200, { admin: true }),
  list('/api/v1/disputes/{disputeId}/evidence', 'listDisputeEvidence', 'Disputes', 'List dispute evidence', 'EvidenceList'),
  mutation('post', '/api/v1/disputes/{disputeId}/evidence', 'addDisputeEvidence', 'Disputes', 'Attach dispute evidence', 'disputeEvidence', 'EvidenceResponse', 201),
  mutation('post', '/api/v1/demo/runs/{runId}/reset', 'resetDemoRun', 'Demo', 'Reset a canonical demo run', null, 'DemoRunResponse', 200, { admin: true }),

  op('get', '/api/v1/customers/me', 'getCurrentCustomer', 'Customers', 'Get the current customer', { response: 'CustomerResponse' }),
  mutation('patch', '/api/v1/customers/me', 'updateCurrentCustomer', 'Customers', 'Update customer contact details', 'updateCustomer', 'CustomerResponse'),
  list('/api/v1/beneficiaries', 'listBeneficiaries', 'Beneficiaries', 'List beneficiaries', 'BeneficiaryList'),
  mutation('post', '/api/v1/beneficiaries', 'createBeneficiary', 'Beneficiaries', 'Create an unverified beneficiary', 'createBeneficiary', 'BeneficiaryResponse', 201),
  op('get', '/api/v1/beneficiaries/{id}', 'getBeneficiary', 'Beneficiaries', 'Get a beneficiary', { response: 'BeneficiaryResponse' }),
  mutation('patch', '/api/v1/beneficiaries/{id}', 'updateBeneficiary', 'Beneficiaries', 'Update a beneficiary', 'updateBeneficiary', 'BeneficiaryResponse'),
  mutation('delete', '/api/v1/beneficiaries/{id}', 'cancelBeneficiary', 'Beneficiaries', 'Deactivate a beneficiary', null, 'BeneficiaryResponse'),

  list('/api/v1/cards', 'listCards', 'Cards', 'List cards', 'CardList'),
  mutation('post', '/api/v1/cards', 'createCard', 'Cards', 'Create a card', 'createCard', 'CardResponse', 201),
  op('get', '/api/v1/cards/{id}', 'getCard', 'Cards', 'Get a card', { response: 'CardResponse' }),
  mutation('post', '/api/v1/cards/{id}/freeze', 'freezeCard', 'Cards', 'Freeze an active card', null, 'CardResponse'),
  mutation('post', '/api/v1/cards/{id}/unfreeze', 'unfreezeCard', 'Cards', 'Unfreeze a frozen card', null, 'CardResponse'),
  mutation('patch', '/api/v1/cards/{id}/limits', 'updateCardLimit', 'Cards', 'Update a card spending limit', 'cardLimit', 'CardResponse'),
  mutation('post', '/api/v1/cards/{id}/replace', 'replaceCard', 'Cards', 'Replace an active or frozen card', null, 'CardResponse', 201),

  list('/api/v1/scheduled-payments', 'listScheduledPayments', 'Payments', 'List scheduled payments', 'ScheduledPaymentList'),
  mutation('post', '/api/v1/scheduled-payments', 'createScheduledPayment', 'Payments', 'Create a scheduled payment', 'createScheduledPayment', 'PaymentResponse', 201),
  op('get', '/api/v1/scheduled-payments/{id}', 'getScheduledPayment', 'Payments', 'Get a scheduled payment', { response: 'PaymentResponse' }),
  mutation('patch', '/api/v1/scheduled-payments/{id}', 'updateScheduledPayment', 'Payments', 'Update a scheduled payment', 'updateScheduledPayment', 'PaymentResponse'),
  mutation('delete', '/api/v1/scheduled-payments/{id}', 'cancelScheduledPayment', 'Payments', 'Cancel a scheduled payment', null, 'PaymentResponse'),

  list('/api/v1/standing-orders', 'listStandingOrders', 'Payments', 'List standing orders', 'StandingOrderList'),
  mutation('post', '/api/v1/standing-orders', 'createStandingOrder', 'Payments', 'Create a standing order', 'createStandingOrder', 'PaymentResponse', 201),
  op('get', '/api/v1/standing-orders/{id}', 'getStandingOrder', 'Payments', 'Get a standing order', { response: 'PaymentResponse' }),
  mutation('patch', '/api/v1/standing-orders/{id}', 'updateStandingOrder', 'Payments', 'Update a standing order', 'updateStandingOrder', 'PaymentResponse'),
  mutation('delete', '/api/v1/standing-orders/{id}', 'cancelStandingOrder', 'Payments', 'Cancel a standing order', null, 'PaymentResponse'),

  list('/api/v1/direct-debits', 'listDirectDebits', 'Payments', 'List direct debits', 'DirectDebitList'),
  mutation('post', '/api/v1/direct-debits', 'createDirectDebit', 'Payments', 'Create a direct debit', 'createDirectDebit', 'PaymentResponse', 201),
  op('get', '/api/v1/direct-debits/{id}', 'getDirectDebit', 'Payments', 'Get a direct debit', { response: 'PaymentResponse' }),
  mutation('patch', '/api/v1/direct-debits/{id}', 'updateDirectDebit', 'Payments', 'Update a direct debit', 'updateDirectDebit', 'PaymentResponse'),
  mutation('delete', '/api/v1/direct-debits/{id}', 'cancelDirectDebit', 'Payments', 'Cancel a direct debit', null, 'PaymentResponse'),

  list('/api/v1/statements', 'listStatements', 'Statements', 'List statement transactions', 'TransactionList'),
  list('/api/v1/statements/{accountId}', 'getAccountStatement', 'Statements', 'Get an account statement', 'AccountStatement'),
  op('get', '/api/v1/fx/rates', 'getExchangeRates', 'Foreign Exchange', 'Get deterministic exchange rates', { response: 'FxRates', queries: ['base'] }),
  mutation('post', '/api/v1/fx/quote', 'createFxQuote', 'Foreign Exchange', 'Create a deterministic FX quote', 'fxQuote', 'QuoteResponse', 201),
  op('get', '/api/v1/notification-preferences', 'getNotificationPreferences', 'Notifications', 'Get notification preferences', { response: 'PreferencesResponse' }),
  mutation('patch', '/api/v1/notification-preferences', 'updateNotificationPreferences', 'Notifications', 'Update notification preferences', 'notificationPreferences', 'PreferencesResponse'),
  list('/api/v1/audit-events', 'listAuditEvents', 'Audit', 'List append-only audit events', 'AuditList')
];
