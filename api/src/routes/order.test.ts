import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import orderRouter from './order';
import { orderDetails, orders, products, resetDataStore } from '../state/dataStore';

let app: express.Express;

describe('Order inventory transitions', () => {
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/orders', orderRouter);
    resetDataStore();
  });

  it('decrements stock when order moves from pending to processing', async () => {
    const orderToUpdate = orders.find(order => order.orderId === 1);
    expect(orderToUpdate).toBeDefined();

    const orderOneDetails = orderDetails.filter(detail => detail.orderId === 1);
    const productTwo = products.find(product => product.productId === 2);
    const productThree = products.find(product => product.productId === 3);

    expect(orderOneDetails.length).toBeGreaterThan(0);
    expect(productTwo).toBeDefined();
    expect(productThree).toBeDefined();

    const originalProductTwoStock = productTwo!.stockLevel;
    const originalProductThreeStock = productThree!.stockLevel;

    const response = await request(app)
      .put('/orders/1')
      .send({ ...orderToUpdate, status: 'processing' });

    expect(response.status).toBe(200);

    expect(productTwo!.stockLevel).toBe(originalProductTwoStock - 5);
    expect(productThree!.stockLevel).toBe(originalProductThreeStock - 5);
  });

  it('rejects confirmation with 422 when stock is insufficient and keeps stock unchanged', async () => {
    const orderToUpdate = orders.find(order => order.orderId === 1);
    const productTwo = products.find(product => product.productId === 2);
    const productThree = products.find(product => product.productId === 3);

    expect(orderToUpdate).toBeDefined();
    expect(productTwo).toBeDefined();
    expect(productThree).toBeDefined();

    productTwo!.stockLevel = 3;
    productThree!.stockLevel = 100;

    const response = await request(app)
      .put('/orders/1')
      .send({ ...orderToUpdate, status: 'processing' });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe('Insufficient stock to confirm order');
    expect(productTwo!.stockLevel).toBe(3);
    expect(productThree!.stockLevel).toBe(100);

    const storedOrder = orders.find(order => order.orderId === 1);
    expect(storedOrder?.status).toBe('pending');
  });

  it('restores stock when order moves from processing to cancelled', async () => {
    const orderToUpdate = orders.find(order => order.orderId === 2);
    const productFour = products.find(product => product.productId === 4);

    expect(orderToUpdate).toBeDefined();
    expect(productFour).toBeDefined();

    productFour!.stockLevel = 40;

    const response = await request(app)
      .put('/orders/2')
      .send({ ...orderToUpdate, status: 'cancelled' });

    expect(response.status).toBe(200);
    expect(productFour!.stockLevel).toBe(60);
  });
});
