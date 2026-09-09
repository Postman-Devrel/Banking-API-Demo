export interface FraudSeedInput {
  transactionId: string; customerId: string; amount: number;
  currency: 'COSMIC_COINS' | 'GALAXY_GOLD' | 'MOON_BUCKS'; occurredAt: string;
  beneficiary: { name: string; accountId?: string };
  payment: { method: 'bank_transfer' | 'card' | 'wallet'; cardPresent?: boolean };
  context: {
    customerDisputed: boolean; reviewChannel: 'support_case' | 'automated_review' | 'manual_review';
    transactionChannel: 'MOBILE_APP' | 'WEB' | 'API' | 'BRANCH'; deviceTrusted: boolean; location: string;
  };
}

export interface FixtureRecord { [key: string]: unknown }
export interface SupportSeed {
  cases: FixtureRecord[]; notes: FixtureRecord[]; evidence: FixtureRecord[]; verifications: FixtureRecord[];
  escalations: FixtureRecord[]; tasks: FixtureRecord[]; relatedCases: FixtureRecord[];
  interactions: FixtureRecord[]; knowledgeLinks: FixtureRecord[]; events: FixtureRecord[];
}
export interface BankingSeed {
  principals: FixtureRecord[]; customers: FixtureRecord[]; accounts: FixtureRecord[]; transactions: FixtureRecord[];
  beneficiaries: FixtureRecord[]; cards: FixtureRecord[]; scheduledPayments: FixtureRecord[];
  standingOrders: FixtureRecord[]; directDebits: FixtureRecord[]; notificationPreferences: FixtureRecord[];
  disputes: FixtureRecord[]; auditEvents: FixtureRecord[];
}

declare const fixtures: {
  seedVersions: Readonly<{ banking: 'fabric-banking-v2'; fraud: 'fabric-fraud-v2'; support: 'fabric-support-v2' }>;
  createBankingSeed(): BankingSeed;
  createFraudSeedInputs(): FraudSeedInput[];
  createSupportSeed(): SupportSeed;
};
export = fixtures;
