import { beforeEach, describe, expect, it } from 'vitest';
import { cancelOrderTransactional } from './orderCancellationService';
import { confirmOrderAndDeductStock } from './orderInventoryService';
import { getOrders, getProducts, resetDataStore } from '../state/dataStore';
import { resetOrderAuditStore } from './orderAuditService';

describe('orderCancellationService', () => {
  beforeEach(() => {
    resetDataStore();
    resetOrderAuditStore();
  });

  it('restores stock when cancelling a processing order', async () => {
    const originalProduct2Stock =
      getProducts().find((product) => product.productId === 2)?.stockLevel ?? 0;
    const originalProduct3Stock =
      getProducts().find((product) => product.productId === 3)?.stockLevel ?? 0;

    const confirmationResult = await confirmOrderAndDeductStock(1);
    expect(confirmationResult.ok).toBe(true);

    const cancellationResult = await cancelOrderTransactional({
      orderId: 1,
      reason: 'test-compensation',
      cancelledBy: 'vitest',
    });

    expect(cancellationResult.ok).toBe(true);
    if (cancellationResult.ok) {
      expect(cancellationResult.data.order.status).toBe('cancelled');
      expect(cancellationResult.data.idempotent).toBe(false);
      expect(cancellationResult.data.restockedItems.length).toBeGreaterThan(0);
    }

    const product2After =
      getProducts().find((product) => product.productId === 2)?.stockLevel ?? 0;
    const product3After =
      getProducts().find((product) => product.productId === 3)?.stockLevel ?? 0;

    expect(product2After).toBe(originalProduct2Stock);
    expect(product3After).toBe(originalProduct3Stock);
  });

  it('returns idempotent success for already cancelled orders', async () => {
    const order = getOrders().find((currentOrder) => currentOrder.orderId === 1);
    expect(order).toBeDefined();

    if (!order) {
      return;
    }

    order.status = 'cancelled';

    const cancellationResult = await cancelOrderTransactional({
      orderId: 1,
      reason: 'repeat-request',
    });

    expect(cancellationResult.ok).toBe(true);
    if (cancellationResult.ok) {
      expect(cancellationResult.data.idempotent).toBe(true);
      expect(cancellationResult.data.restockedItems).toHaveLength(0);
      expect(cancellationResult.data.movements).toHaveLength(0);
    }
  });

  it('returns a state conflict for delivered orders', async () => {
    const order = getOrders().find((currentOrder) => currentOrder.orderId === 1);
    expect(order).toBeDefined();

    if (!order) {
      return;
    }

    order.status = 'delivered';

    const cancellationResult = await cancelOrderTransactional({
      orderId: 1,
      reason: 'should-fail',
    });

    expect(cancellationResult.ok).toBe(false);
    if (!cancellationResult.ok) {
      expect(cancellationResult.error.status).toBe(409);
      expect(cancellationResult.error.code).toBe('STATE_CONFLICT');
    }
  });
});
