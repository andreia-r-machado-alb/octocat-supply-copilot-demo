import { beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import orderRouter from './order';
import { getOrders, getProducts, resetDataStore } from '../state/dataStore';
import { resetOrderAuditStore } from '../services/orderAuditService';

describe('Order API stock workflows', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/orders', orderRouter);
    resetDataStore();
    resetOrderAuditStore();
  });

  it('confirms a pending order and deducts stock', async () => {
    const orders = getOrders();
    const targetOrder = orders.find((order) => order.orderId === 1);
    expect(targetOrder).toBeDefined();

    const products = getProducts();
    const product2Before = products.find((product) => product.productId === 2);
    const product3Before = products.find((product) => product.productId === 3);
    expect(product2Before).toBeDefined();
    expect(product3Before).toBeDefined();

    const response = await request(app)
      .put('/orders/1')
      .send({ ...targetOrder, status: 'processing' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('processing');

    const product2After = getProducts().find((product) => product.productId === 2);
    const product3After = getProducts().find((product) => product.productId === 3);

    expect(product2After?.stockLevel).toBe((product2Before?.stockLevel ?? 0) - 5);
    expect(product3After?.stockLevel).toBe((product3Before?.stockLevel ?? 0) - 5);
  });

  it('returns 422 when stock is insufficient during confirmation', async () => {
    const products = getProducts();
    const product2 = products.find((product) => product.productId === 2);
    expect(product2).toBeDefined();

    if (!product2) {
      return;
    }

    product2.stockLevel = 1;

    const targetOrder = getOrders().find((order) => order.orderId === 1);
    const response = await request(app)
      .put('/orders/1')
      .send({ ...targetOrder, status: 'processing' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(response.body.error.details.orderId).toBe(1);
    expect(response.body.error.details.deficits[0].productId).toBe(2);

    const orderAfter = getOrders().find((order) => order.orderId === 1);
    expect(orderAfter?.status).toBe('pending');
  });

  it('cancels an order and restores stock via dedicated endpoint', async () => {
    const originalProduct2Stock =
      getProducts().find((product) => product.productId === 2)?.stockLevel ?? 0;
    const originalProduct3Stock =
      getProducts().find((product) => product.productId === 3)?.stockLevel ?? 0;

    const targetOrder = getOrders().find((order) => order.orderId === 1);
    await request(app)
      .put('/orders/1')
      .send({ ...targetOrder, status: 'processing' })
      .expect(200);

    const response = await request(app)
      .post('/orders/1/cancel')
      .send({ reason: 'customer_request', cancelledBy: 'qa-test' });

    expect(response.status).toBe(200);
    expect(response.body.order.status).toBe('cancelled');
    expect(response.body.idempotent).toBe(false);
    expect(response.body.restockedItems.length).toBeGreaterThan(0);

    const product2After = getProducts().find((product) => product.productId === 2);
    const product3After = getProducts().find((product) => product.productId === 3);

    expect(product2After?.stockLevel).toBe(originalProduct2Stock);
    expect(product3After?.stockLevel).toBe(originalProduct3Stock);
  });

  it('returns 409 with stable code when cancellation transition is invalid', async () => {
    const targetOrder = getOrders().find((order) => order.orderId === 1);
    expect(targetOrder).toBeDefined();

    if (!targetOrder) {
      return;
    }

    targetOrder.status = 'delivered';

    const response = await request(app)
      .post('/orders/1/cancel')
      .send({ reason: 'invalid-state-check' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('STATE_CONFLICT');
    expect(response.body.error.details.orderId).toBe(1);
  });
});
