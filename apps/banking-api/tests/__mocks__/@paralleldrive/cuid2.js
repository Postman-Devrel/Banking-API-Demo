// Mock implementation of @paralleldrive/cuid2
let counter = 0;

const createId = () => {
  counter++;
  return `mock-cuid-${counter}-${Date.now()}`;
};

const init = () => createId;

const isCuid = (id) => {
  return typeof id === 'string' && id.length > 0;
};

const getConstants = () => ({
  defaultLength: 24,
  bigLength: 32
});

module.exports = {
  createId,
  init,
  isCuid,
  getConstants
};

