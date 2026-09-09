export type Role = 'CUSTOMER' | 'ADMIN';

export interface Principal { principalId: string; role: Role }

export interface AssessmentInput {
  transactionId: string;
  customerId: string;
  amount: number;
  currency: 'COSMIC_COINS' | 'GALAXY_GOLD' | 'MOON_BUCKS';
  occurredAt: string;
  beneficiary: { name: string; accountId?: string };
  payment: { method: 'bank_transfer' | 'card' | 'wallet'; cardPresent?: boolean };
  context: {
    customerDisputed: boolean;
    reviewChannel: 'support_case' | 'automated_review' | 'manual_review';
    transactionChannel: 'MOBILE_APP' | 'WEB' | 'API' | 'BRANCH';
    deviceTrusted: boolean;
    location: string;
  };
}

export interface Signal { code: 'NEW_DEVICE' | 'UNUSUAL_AMOUNT' | 'LOCATION_MISMATCH' | 'CUSTOMER_DISPUTED'; severity: 'low' | 'medium' | 'high'; description: string }

export interface FraudAssessment {
  assessmentId: string;
  transactionId: string;
  risk: { score: number; level: 'low' | 'medium' | 'high' | 'critical' };
  signals: Signal[];
  recommendation: {
    action: 'ALLOW' | 'REQUIRE_CUSTOMER_VERIFICATION' | 'ESCALATE_TO_FRAUD_TEAM' | 'BLOCK_TRANSACTION';
    permittedActions: Array<'REQUEST_IDENTITY_VERIFICATION' | 'ESCALATE_TO_FRAUD_TEAM'>;
    prohibitedActions: Array<'ISSUE_IMMEDIATE_REFUND' | 'CLOSE_DISPUTE_AS_RESOLVED'>;
    reason: string;
  };
  model: { name: 'demo-fraud-risk-model'; version: '1.1.0' };
  assessedAt: string;
}

export interface FraudConfig {
  nodeEnv: string; host: string; port: number; customerApiKey: string; adminApiKey: string;
  maxRuns: number; runTtlMs: number; idempotencyTtlMs: number; maxIdempotencyPerRun: number;
}

export interface InProgressIdempotencyRecord { state: 'IN_PROGRESS'; fingerprint: string; createdAt: number }
export interface StoredResponse { state: 'COMPLETED'; fingerprint: string; status: number; body: Record<string, unknown>; headers: Record<string, string>; createdAt: number }
export type IdempotencyRecord = InProgressIdempotencyRecord | StoredResponse;

export interface RunState {
  assessments: Map<string, FraudAssessment>;
  attempts: Map<string, number>;
  idempotency: Map<string, IdempotencyRecord>;
  faults: { failFirstAssessment: boolean };
  lastAccessedAt: number;
}
