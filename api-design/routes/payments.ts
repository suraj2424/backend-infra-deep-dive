import { Elysia, t } from "elysia";
import { createHash } from 'crypto'

/* Iteration 2
// simple in‑memory cache for idempotency
const cache = new Map<string, unknown>();
*/

/* Attempt 1
interface CachedEntry {
  amount: number;
  result: unknown;
}
*/

/* Attempt 2 */
interface IdempotencyRecord {
  requestHash: string;
  responseJson: unknown;
  status: number;
  createdAt: string;
  amount: number;
}


const cache = new Map<string, IdempotencyRecord>();

function hashRequest(payload : unknown) : string {
  
  const canonical = JSON.stringify(
    payload,
    (typeof payload === 'object' && payload !== null) 
    ? Object.keys(payload as any).sort()
    : undefined,
  );

  return createHash('sha256').update(canonical).digest('hex');
}


export const definePaymentRoutes = (app: Elysia) => {
  return app.post(
    "/",
    ({ body, headers, set }) => {
      const amount = body.amount;

      if (!amount || amount <= 0) {
        set.status = 400;
        return { error: "Amount must be greater than 0" };
      }

      const key = headers["idempotency-key"];

      if (!key) {
        set.status = 400;
        return { error: "Missing idempotency-key header" };
      }
      /* Iteration 2
      const stored = cache.get(key);
      if (stored) {
        set.status = 200;
        return stored;
      }
      */

      const requestHash = hashRequest({ amount });

      const existing = cache.get(key);

      if (existing) {
        if (existing.amount !== amount) {
          set.status = 409;
          return {
            error: "Idempotency-key already used with different amount",
            previousAmount: existing.amount,
            previousCreatedAt: existing.createdAt
          };
        }
      }

      const transactionId = "txn_" + Math.random().toString(16).slice(2);

      const isSuccess = amount > 400 ? false : true;

      const response = {
        status: isSuccess,
        transactionId,
        amount,
        timestamp: new Date().toISOString(),
      };

      set.status = isSuccess ? 201 : 422;

      const record : IdempotencyRecord = {
        requestHash,
        responseJson: response,
        status: set.status,
        createdAt: new Date().toISOString(),
        amount,
      }


      /* Iteration 2
      cache.set(key, result);
      */
      
      cache.set(key, record);

      return response;
    },
    {
      body: t.Object({
        amount: t.Number(),
      }),
    },
  );
};
