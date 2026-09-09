const clone = value => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(clone);
  if (typeof value !== 'object') return value;
  const copy = Object.assign(Object.create(Object.getPrototypeOf(value)), value);
  for (const [key, nested] of Object.entries(copy)) {
    if (nested && typeof nested === 'object') copy[key] = clone(nested);
  }
  return copy;
};

class MapRepository {
  constructor(collection) { this.collection = collection; }
  list() { return Array.from(this.collection.values(), clone); }
  get(id) { return clone(this.collection.get(id)); }
  has(id) { return this.collection.has(id); }
  save(id, value) { this.collection.set(id, clone(value)); return this.get(id); }
}

class AccountRepository extends MapRepository {}
class CustomerRepository extends MapRepository {}
class BeneficiaryRepository extends MapRepository {}
class CardRepository extends MapRepository {}
class ScheduledPaymentRepository extends MapRepository {}
class StandingOrderRepository extends MapRepository {}
class DirectDebitRepository extends MapRepository {}
class TransactionRepository extends MapRepository {}
class DisputeRepository extends MapRepository {}
class NotificationRepository extends MapRepository {}

class AuditRepository {
  constructor(collection) { this.collection = collection; }
  list() { return this.collection.map(clone); }
  append(value) {
    const stored = Object.freeze(clone(value));
    this.collection.push(stored);
    return clone(stored);
  }
}

class DomainRepositories {
  constructor(state) {
    this.accounts = new AccountRepository(state.accounts);
    this.customers = new CustomerRepository(state.customers);
    this.beneficiaries = new BeneficiaryRepository(state.beneficiaries);
    this.cards = new CardRepository(state.cards);
    this.scheduledPayments = new ScheduledPaymentRepository(state.scheduledPayments);
    this.standingOrders = new StandingOrderRepository(state.standingOrders);
    this.directDebits = new DirectDebitRepository(state.directDebits);
    this.transactions = new TransactionRepository(state.transactions);
    this.disputes = new DisputeRepository(state.disputes);
    this.notificationPreferences = new NotificationRepository(state.notificationPreferences);
    this.auditEvents = new AuditRepository(state.auditEvents);
  }
}

module.exports = {
  clone, MapRepository, AccountRepository, CustomerRepository, BeneficiaryRepository,
  CardRepository, ScheduledPaymentRepository, StandingOrderRepository, DirectDebitRepository,
  TransactionRepository, DisputeRepository, NotificationRepository, AuditRepository,
  DomainRepositories
};
