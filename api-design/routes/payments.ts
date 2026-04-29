import { Elysia, t } from 'elysia';

// simple in‑memory cache for idempotency
const cache = new Map<string, unknown>();

export const definePaymentRoutes = (app: Elysia) => {
  return app.post(
    '/',
    ({ body, headers, set }) => {
      const amount = body.amount;

      if (!amount || amount <= 0) {
        set.status = 400;
        return { error: 'Amount must be greater than 0' };
      }

      const key = headers['idempotency-key'];

      if (!key) {
        set.status = 400;
        return { error: 'Missing idempotency-key header' };
      }

      const stored = cache.get(key);
      if (stored) return stored;

      const transactionId = 'txn_' + Math.random().toString(16).slice(2);

      const result = {
        status: amount > 400 ? 'error' : 'success',
        simulated: true,
        transactionId,
        amount,
        timestamp: new Date().toISOString(),
      };

      cache.set(key, result);
      return result;
    },
    {
      body: t.Object({
        amount: t.Number(),
      }),
    }
  );
};
