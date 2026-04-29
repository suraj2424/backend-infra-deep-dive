# Status Codes:

| Code | Status | Category | Meaning | Typical Use Case |
| --- | --- | --- | --- | --- |
| 100 | Continue | Informational (1xx) | The server has received the request headers, and the client should proceed to send the body. | Used in requests with Expect: 100-continue header. |
| 101 | Switching Protocols | Informational (1xx) | The server is switching protocols (e.g., from HTTP/1.1 to WebSocket). | Used in WebSocket handshakes. |
| 200 | OK | Success (2xx) | The request was successful. | Standard response for successful GET/POST requests. |
| 201 | Created | Success (2xx) | The request was successful, and a new resource was created. | Returned after POST/PUT requests that create a resource (e.g., creating a user). |
| 202 | Accepted | Success (2xx) | The request has been accepted for processing, but the processing is not complete. | Used for asynchronous tasks (e.g., batch processing). |
| 204 | No Content | Success (2xx) | The request was successful, but there is no content to return. | Used for DELETE requests or updates where no response body is needed. |
| 301 | Moved Permanently | Redirection (3xx) | The requested resource has been permanently moved to a new URL. | Redirects to a new URL (e.g., http://example.com → https://example.com). |
| 302 | Found (Temporary Redirect) | Redirection (3xx) | The requested resource temporarily resides at a different URL. | Temporary redirects (e.g., for A/B testing or maintenance). |
| 304 | Not Modified | Redirection (3xx) | The resource has not been modified since the last request (used with caching). | Returned when If-Modified-Since or If-None-Match headers are used. |
| 307 | Temporary Redirect | Redirection (3xx) | The requested resource temporarily resides at a different URL (preserves HTTP method). | Similar to 302, but guarantees the HTTP method won’t change (e.g., POST → POST). |
| 308 | Permanent Redirect | Redirection (3xx) | The requested resource has been permanently moved to a new URL (preserves HTTP method). | Similar to 301, but guarantees the HTTP method won’t change. |
| 400 | Bad Request | Client Error (4xx) | The server cannot process the request due to a client error (e.g., malformed syntax). | Invalid input, missing parameters, or malformed JSON. |
| 401 | Unauthorized | Client Error (4xx) | The request lacks valid authentication credentials. | Returned when authentication is required but missing or invalid. |
| 403 | Forbidden | Client Error (4xx) | The server understood the request but refuses to authorize it. | User doesn’t have permission to access the resource (e.g., admin-only endpoints). |
| 404 | Not Found | Client Error (4xx) | The requested resource does not exist. | Returned when a route or resource is not found. |
| 405 | Method Not Allowed | Client Error (4xx) | The HTTP method is not supported for the requested resource. | Returned when a method (e.g., POST) is not allowed for a route. |
| 408 | Request Timeout | Client Error (4xx) | The server timed out waiting for the request. | Returned when the client takes too long to send the request. |
| 409 | Conflict | Client Error (4xx) | The request conflicts with the current state of the server. | Used for concurrent modifications (e.g., duplicate resource creation). |
| 410 | Gone | Client Error (4xx) | The requested resource is no longer available and has been permanently removed. | Returned when a resource was intentionally deleted. |
| 413 | Payload Too Large | Client Error (4xx) | The request payload is too large for the server to process. | Returned when file uploads exceed size limits. |
| 415 | Unsupported Media Type | Client Error (4xx) | The request payload is in an unsupported format. | Returned when the Content-Type is not accepted (e.g., sending XML to a JSON-only endpoint). |
| 422 | Unprocessable Entity | Client Error (4xx) | The request is well-formed but contains semantic errors. | Used for validation errors (e.g., invalid email format). |
| 429 | Too Many Requests | Client Error (4xx) | The client has sent too many requests in a given time. | Returned for rate-limiting. |
| 500 | Internal Server Error | Server Error (5xx) | A generic server error occurred. | Returned for unexpected backend errors (e.g., database crashes). |
| 501 | Not Implemented | Server Error (5xx) | The server does not support the functionality required to fulfill the request. | Returned when an endpoint is not yet implemented. |
| 502 | Bad Gateway | Server Error (5xx) | The server received an invalid response from an upstream server. | Returned when a proxy (e.g., Nginx) fails to communicate with the backend. |
| 503 | Service Unavailable | Server Error (5xx) | The server is temporarily unavailable (e.g., due to maintenance or overload). | Returned during downtime or high traffic. |
| 504 | Gateway Timeout | Server Error (5xx) | The server did not receive a timely response from an upstream server. | Returned when a proxy times out waiting for the backend. |

---
### Key Categories:
1. **1xx (Informational)**: Request received, processing continues.
2. **2xx (Success)**: Request successfully processed.
3. **3xx (Redirection)**: Further action is needed to complete the request.
4. **4xx (Client Error)**: Request contains bad syntax or cannot be fulfilled.
5. **5xx (Server Error)**: Server failed to fulfill a valid request.

---

# API DESIGN

Design an API:
```http
POST /payments
```

**Requirements:**
- Must be idempotent
- Must return proper error structure
- Include basic validation

## Iteration 1

**Directory:** [api-design](./api-design)

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run dev
```

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

- **Purpose**: Demonstrates a simple payments API with idempotency.
- **Server**: Runs on `http://localhost:3001/payments`.
- **Endpoint**: `POST /payments` accepts JSON `{ "amount": number }` and requires an `idempotency-key` header.
- **Behavior**: Returns a simulated transaction with a random `transactionId`. Amount > 400 returns an error status. Missing or invalid amount returns 400.
- **In‑memory cache**: Stores responses keyed by idempotency key to ensure idempotent requests.
- **Frontend**: `payment.html` provides a simple UI to submit payments via the API.

### Corrections

#### ❌ PRODUCTION GAPS (IMPORTANT)

**❌ 1. In-memory cache = WRONG for production**
```typescript
const cache = new Map<string, unknown>();
```

Problem:
- server restart → data lost ❌
- multiple instances → inconsistency ❌
- not distributed ❌

✅ Fix:

Use: 

- Redis (fast + distributed)

OR

- DB table (strong consistency)


**❌ 2. No request fingerprinting**

Right now:
```typescript
cache.set(key, result);
```

Problem:

- Same key + different body = ❌ inconsistent state

✅ Production pattern:

Store:

```json
{
  "key": "abc123",
  "request_hash": "hashed_body",
  "response": {...},
  "status": "completed"
}
```

**❌ 3. Error structure is weak**

I used:

```typescript
return { error: 'Amount must be greater than 0' };
```

❌ Problem:

- not structured
- frontend cannot reliably act

✅ Fix:
```typescript
return {
  success: false,
  error: {
    code: "INVALID_AMOUNT",
    message: "Amount must be greater than 0"
  }
};
```

**❌ 4. No status codes consistency**

You set:
```typescript
set.status = 400;
```

✔ good — but missing:

409 → idempotency conflict
201 → created
500 → internal

**❌ 5. No real DB model (CRITICAL)**

You didn’t answer this part:

`What DB structure?`

✅ Correct design:
```sql
payments
--------
id (pk)
amount
status
created_at

idempotency_keys
----------------
key (unique)
request_hash
response_json
status
created_at
```

**❌ 6. No concurrency protection**

Edge case:

- 2 requests hit at same time with same key

My code:
```typescript
if (stored) return stored;
```
⚠ Race condition possible

✅ Real fix:

- Redis SETNX (lock)

OR

- DB unique constraint on key


#### 🧠 WHAT I BUILT (LEVEL)

I'm currently at:

👉 “Correct concept, not production safe yet”

Which is EXACTLY where I should be before leveling up.

## Iteration 2

In this iteration I moved the idempotency handling from an in‑memory `Map` to a relational database, which gives me persistence across server restarts and works in a multi‑instance setup.

### Database schema

#### Payments table
```sql
payments
--------
id (pk)
amount
status
created_at
```

#### Idempotency keys table
```sql
idempotency_keys
----------------
key (unique)
request_hash   -- SHA‑256 hash of the request payload (e.g., `{ amount }`)
response_json  -- JSON payload that was returned the first time
status         -- HTTP status code that accompanied the response
created_at     -- Timestamp when the entry was created
```

### What changed in the code

* Replaced the simple `const cache = new Map<string, unknown>()` with a richer cache that stores `requestHash`, `responseJson`, `status`, and `createdAt` in memory.
* Added a deterministic request hash using **SHA‑256** to ensure the same idempotency‑key can only be reused with an identical request body.
* On a cache hit I now compare the stored hash with the incoming request hash. If they differ, I return **409 Conflict** with a clear error message.
* The cached entry also records the HTTP status and creation timestamp, which will later be persisted to the `idempotency_keys` table.
* Updated the error structure to be more explicit and consistent across the API.

These changes bring the API closer to production‑ready behavior while still keeping the implementation in memory for the learning exercise. The next step will be to replace the in‑memory store with actual DB calls (e.g., using an ORM or raw queries) and add proper concurrency protection.


# SOME QUESTION IN THIS TASK

## 🧠 Idempotency + DB Concepts (Consolidated)

## 1. Why do we store `request_hash`?

To ensure that the **same idempotency key is used with the same request payload**.

### Problem it solves:

If a client mistakenly (or maliciously) sends:

* same key
* different request body

Without hash → backend cannot detect mismatch ❌
With hash → backend compares and rejects ✅

---

## 2. What happens if I ONLY store the key?

I will get **data inconsistency bugs**.

### Example:

Request 1:

* key = abc123
* amount = 500

Request 2:

* key = abc123
* amount = 1000

Without hash:
→ backend returns old response (500) ❌
→ system state becomes incorrect

---

## 3. If same key + different request → what should backend do?

Return:

```
HTTP 409 Conflict
```

### Response:

```json
{
  "success": false,
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "Same key used with different request"
  }
}
```

---

## 4. Why NOT hash full request (headers + body)?

Because headers contain **non-business data**.

### Headers like:

* Authorization
* User-Agent
* Idempotency-Key

These:

* change frequently
* don’t define the operation

### Rule:

Hash only **business-relevant payload**

---

## 5. Where do we store `request_hash` in DB?

### Table: `idempotency_keys`

```sql
idempotency_keys
----------------
key (PRIMARY KEY)
request_hash TEXT
response_json JSONB
status VARCHAR
created_at TIMESTAMP
```

---

## 6. Why separate `payments` and `idempotency_keys` tables?

### Separation of concerns:

| Table            | Responsibility                   |
| ---------------- | -------------------------------- |
| payments         | actual business transaction      |
| idempotency_keys | request tracking + deduplication |

---

## 7. What happens if 2 requests hit at same time with same key?

### Problem:

Race condition ⚠️

Both requests:

* see no existing key
* both process payment → duplicate ❌

---

## 8. How to fix concurrency issue?

### Option 1: DB constraint (recommended)

```sql
key TEXT PRIMARY KEY
```

→ second insert fails automatically

---

### Option 2: Redis lock (distributed systems)

Use:

* SETNX (set if not exists)

---

## 9. What is a DB index?

An index is a **data structure that speeds up lookups**.

Think:

* like book index → jump directly to page
* instead of scanning entire book

---

## 10. Why queries are slow without index?

Without index:
→ DB scans **every row** (O(n))

With index:
→ DB uses **B-tree / hash lookup** (O(log n))

---

## 11. Difference:

### `WHERE id = ?`

* Fast ✅
* usually indexed (primary key)

---

### `WHERE name = ?`

* Slow ❌ (if no index)
* causes full table scan

---

## 12. What should be indexed?

Index:

* primary keys
* frequently searched fields
* foreign keys

Avoid:

* indexing everything (slows writes)

---

## 13. Production-level Idempotency Flow

1. Receive request with key
2. Generate request_hash
3. Check DB:

   * key exists?

     * hash match → return stored response
     * hash mismatch → 409 conflict
4. If not exists:

   * insert key (lock)
   * process payment
   * store response
5. return response

---

## 14. My current implementation status

✅ Correct:

* idempotency key usage
* request hashing
* conflict detection

⚠️ Missing for production:

* persistent DB (instead of Map)
* concurrency safety
* structured error format
* TTL (expiry for keys)

---

## 15. Final Mental Model

* Idempotency = **safe retries**
* request_hash = **intent validation**
* DB = **source of truth**
* index = **performance backbone**

---

# DATABASE INDEXING

## SCENARIO

If you have 1 million users:
```sql
SELECT * FROM users WHERE email = 'a@b.com';
```
### What happens without index?
- DB does full table scan
- checks every row
- complexity ≈ O(n)

### What happens with index?
- DB uses B-tree index (default in most DBs)
- complexity ≈ O(log n)

### Why can too many indexes be bad?** (This is IMPORTANT)

This is BAD ❌

**🔥 Problem 1: Slow Writes**

Every time I do:
```sql
INSERT INTO users ...
```

DB must:

- insert row
- update ALL indexes

👉 More indexes = more work

---

Example:

If you have indexes on:

- email
- username
- phone
- created_at

Then 1 insert = 4 extra updates

---

**🔥 Problem 2: More Memory Usage**

Indexes are stored separately.

👉 More indexes = more RAM + disk usage

**🔥 Problem 3: Slower Updates**
```sql
UPDATE users SET email = ...
```

DB must:

- update table
- update index

**🔥 Problem 4: Query Planner Confusion**

Too many indexes:

- DB may pick wrong index
- query becomes slower (yes, ironic)

### 🧠 RULE OF THUMB

**👉 Index only:**

- columns used in `WHERE`
- columns used in `JOIN`
- columns used in `ORDER BY`

❌ NOT: 

*everything blindly*

### REAL EXAMPLE

**Bad:**
```sql
CREATE INDEX idx_everything ON users(name, age, city, bio);
```
❌ useless, heavy

**Good:**
```sql
CREATE INDEX idx_users_email ON users(email);
```
✔ targeted, fast

## 🧠 MENTAL MODEL

Think:

- **Table** = raw data
- **Index** = shortcut map

But:
👉 too many shortcuts = maintenance hell

## Real backend question:
I have this query:
```sql
SELECT * FROM users 
WHERE email = 'a@b.com' AND status = 'active';
```

1. Should I create:
- index on `email`?
- index on `status`?
- or **composite index** (email, status)?
2. Why?

## 🧠 Answer (My Thinking)

### Query

```sql
SELECT * FROM users 
WHERE email = 'a@b.com' AND status = 'active';
```

---

### What I would do

I would create a **composite index on (email, status)**

```sql
CREATE INDEX idx_users_email_status ON users(email, status);
```

---

### Why I choose this

#### 1. I look at selectivity

* `email` → highly unique (almost 1 row)
* `status` → low selectivity (many users can be "active")

👉 So:

* `email` alone is already very powerful
* `status` alone is weak

---

#### 2. I think how DB executes query

DB will:

1. find rows by index
2. then filter remaining conditions

---

#### Case A: Index on `status`

* DB finds ALL active users ❌ (too many rows)
* then filters email → slow

---

#### Case B: Index on `email`

* DB finds 1 row quickly ✅
* then checks status → already fast

---

#### Case C: Composite index `(email, status)`

* DB directly finds exact row ✅ (best case)

---

### Important rule I will follow

👉 **Order matters in composite index**

I put:

```text
(email, status)
```

NOT:

```text
(status, email)
```

---

### Why order matters

Because DB uses index **left to right**

* `(email, status)` → can search by:

  * email ✅
  * email + status ✅

* `(status, email)` → can search by:

  * status ❌ (too many rows)
  * status + email (less efficient)

---

## My final decision logic

* If I query mostly by email → index(email) is enough
* If I frequently query by both → composite index

---

## My production mindset

I don’t blindly add indexes.

I ask:

* what queries are frequent?
* what columns are selective?
* what reduces scan size fastest?

---

## Final Answer (short)

I would create:

```sql
(email, status)
```

Because:

* email is highly selective
* combining both gives fastest lookup
* avoids unnecessary row scans

---

# REDIS + CACHING (backend becomes fast at scale)

What is caching (in your own words)?
Where have you used it (even basic level)?
What problem does caching solve?

**ANSWER 1**

**✔️ My idea:**

“store repeated answers”

**🔥 Real definition:**

- 👉 Caching = storing expensive-to-compute or frequently-used data in a faster layer to avoid recomputation or DB hits

**ANSWER 2**

**✔️ My idea:**

"In data structures and algorithms problems, where we use memoization"

**ANSWER 3**

**✔️ My idea:**
I said “time complexity” → correct but incomplete.

**🔥 In production:**

Caching reduces:
- DB load
- latency (response time)
- cost (fewer DB queries)
- system pressure under traffic

## DEFINITION (REDIS)

- in memory key-value store
- extremely fase
- used as:
  - cache
  - rate limiter
  - session store
  - pub/sub system


## CORE PATTERNS

### 1. Cache Aside

**Flow:**
1. check cache
2. if miss → query DB
3. store in cache
3. return

**Example:**
```typescript
async function getUser(id: string) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  const user = await db.getUser(id);

  await redis.set(`user:${id}`, JSON.stringify(user), "EX", 60);

  return user;
}
```

### 2. Write Through

- write → DB + cache together

✔ consistent
❌ slower writes

### 3. Write Back (advanced)

- write → cache first
- DB updated later

✔ very fast
❌ risk of data loss


## ⚠️ BIG PROBLEM: CACHE INVALIDATION
- Hardest problem in backend.

**EXAMPLE:**
```http
GET /user/1  → cached
UPDATE user → DB updated
```
❌ cache still old → stale data

**Solutions:**
- TTL (expiry)
- manual invalidation
- event-driven invalidation

### 🧠 WHERE YOU WILL USE CACHE

Real cases:
- user profile
- product listings
- dashboards
- expensive computations

## ⚠️ WHEN NOT TO CACHE
- highly dynamic data
- critical real-time data (payments status)
- small datasets

