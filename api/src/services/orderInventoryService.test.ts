import { beforeEach, describe, expect, it } from 'vitest';
import { confirmOrderAndDeductStock } from './orderInventoryService';
import { getOrders, getProducts, resetDataStore } from '../state/dataStore';
import { resetOrderAuditStore } from './orderAuditService';

describe('orderInventoryService', () => {
  beforeEach(() => {
    resetDataStore();
    resetOrderAuditStore();
  });

  it('deducts stock atomically when confirmation succeeds', async () => {
    const product2Before =
      getProducts().find((product) => product.productId === 2)?.stockLevel ?? 0;
    const product3Before =
      getProducts().find((product) => product.productId === 3)?.stockLevel ?? 0;

    const result = await confirmOrderAndDeductStock(1);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.order.status).toBe('processing');
      expect(result.data.movements.length).toBe(2);
    }

    const product2After =
      getProducts().find((product) => product.productId === 2)?.stockLevel ?? 0;
    const product3After =
      getProducts().find((product) => product.productId === 3)?.stockLevel ?? 0;

    expect(product2After).toBe(product2Before - 5);
    expect(product3After).toBe(product3Before - 5);
  });

  it('returns insufficient stock error without mutating order state', async () => {
    const product2 = getProducts().find((product) => product.productId === 2);
    expect(product2).toBeDefined();

    if (!product2) {
      return;
    }

    product2.stockLevel = 1;
    const product3Before =
      getProducts().find((product) => product.productId === 3)?.stockLevel ?? 0;

    const result = await confirmOrderAndDeductStock(1);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(422);
      expect(result.error.code).toBe('INSUFFICIENT_STOCK');
    }

    const orderAfter = getOrders().find((order) => order.orderId === 1);
    expect(orderAfter?.status).toBe('pending');
    expect(product2.stockLevel).toBe(1);
    expect(
      getProducts().find((product) => product.productId === 3)?.stockLevel,
    ).toBe(product3Before);
  });

  it('allows only one successful concurrent confirmation for the same order', async () => {
    const [first, second] = await Promise.all([
      confirmOrderAndDeductStock(1),
      confirmOrderAndDeductStock(1),
    ]);

    const outcomes = [first, second];
    const successCount = outcomes.filter((result) => result.ok).length;
    const conflictCount = outcomes.filter(
      (result) => !result.ok && result.error.status === 409,
    ).length;

    expect(successCount).toBe(1);
    expect(conflictCount).toBe(1);

    const product2After =
      getProducts().find((product) => product.productId === 2)?.stockLevel ?? 0;
    expect(product2After).toBe(25);
  });
});
