import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors'

import { definePaymentRoutes } from './routes/payments';

const app = new Elysia()
  .use(cors())
  .use(
    new Elysia({ prefix: '/payments' })
      .use(definePaymentRoutes)
  )
  .listen(3001);

console.log(
  `Server is running at ${app.server?.hostname}:${app.server?.port}`
);