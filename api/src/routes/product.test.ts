import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import productRouter, { LOW_STOCK_ALERT_EVENT, productEvents, resetProducts } from './product';
import { products as seedProducts } from '../seedData';

let app: express.Express;

describe('Product API low-stock alerts', () => {
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/products', productRouter);
    resetProducts();
    productEvents.removeAllListeners();
  });

  it('should emit low-stock alert only when quantity drops below reorder threshold', async () => {
    const alertListener = vi.fn();
    productEvents.on(LOW_STOCK_ALERT_EVENT, alertListener);

    const baseProduct = seedProducts[0];
    const atThresholdProduct = {
      ...baseProduct,
      quantity: 10,
      reorder_threshold: 10
    };

    const atThresholdResponse = await request(app)
      .put(`/products/${baseProduct.productId}`)
      .send(atThresholdProduct);

    expect(atThresholdResponse.status).toBe(200);
    expect(alertListener).not.toHaveBeenCalled();

    const belowThresholdProduct = {
      ...atThresholdProduct,
      quantity: 9
    };

    const belowThresholdResponse = await request(app)
      .put(`/products/${baseProduct.productId}`)
      .send(belowThresholdProduct);

    expect(belowThresholdResponse.status).toBe(200);
    expect(alertListener).toHaveBeenCalledTimes(1);
    expect(alertListener).toHaveBeenCalledWith({
      productId: baseProduct.productId,
      quantity: 9,
      reorder_threshold: 10
    });
  });
});
