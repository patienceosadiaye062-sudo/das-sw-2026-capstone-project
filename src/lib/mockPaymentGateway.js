export function createMockPaymentGateway() {
  return {
    async charge({ decline = false } = {}) {
      if (typeof decline !== 'boolean') {
        throw new TypeError('decline must be a boolean.');
      }
      return { status: decline ? 'declined' : 'succeeded' };
    },
  };
}
