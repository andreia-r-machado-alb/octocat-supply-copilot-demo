import { Order } from '../models/order';
import { OrderDetail } from '../models/orderDetail';
import { Product } from '../models/product';
import { runInventoryTransaction } from './inventoryTransaction';
import {
  appendInventoryMovements,
  appendOrderAuditEvent,
  InventoryMovement,
} from './orderAuditService';
import { ServiceResult } from './types';

interface StockDeficit {
  productId: number;
  requestedQuantity: number;
  availableStock: number;
  shortage: number;
}

interface ConfirmInventoryTransactionOutcome {
  order: Order;
  movementDrafts: Array<Omit<InventoryMovement, 'movementId'>>;
}

export interface ConfirmOrderAndDeductStockResult {
  order: Order;
  movements: InventoryMovement[];
}

function calculateRequiredQuantityByProduct(
  orderDetails: OrderDetail[],
): Map<number, number> {
  const requiredByProduct = new Map<number, number>();

  for (const line of orderDetails) {
    const currentQty = requiredByProduct.get(line.productId) ?? 0;
    requiredByProduct.set(line.productId, currentQty + line.quantity);
  }

  return requiredByProduct;
}

function findDeficits(
  requiredByProduct: Map<number, number>,
  productsById: Map<number, Product>,
): StockDeficit[] {
  const deficits: StockDeficit[] = [];

  for (const [productId, requestedQuantity] of requiredByProduct.entries()) {
    const product = productsById.get(productId);
    if (!product) {
      continue;
    }

    if (product.stockLevel < requestedQuantity) {
      deficits.push({
        productId,
        requestedQuantity,
        availableStock: product.stockLevel,
        shortage: requestedQuantity - product.stockLevel,
      });
    }
  }

  return deficits;
}

export async function confirmOrderAndDeductStock(
  orderId: number,
): Promise<ServiceResult<ConfirmOrderAndDeductStockResult>> {
  const result = await runInventoryTransaction<
    ServiceResult<ConfirmInventoryTransactionOutcome>
  >((snapshot) => {
    const order = snapshot.orders.find((item) => item.orderId === orderId);

    if (!order) {
      return {
        ok: false,
        error: {
          status: 404,
          code: 'NOT_FOUND',
          message: 'Order not found.',
          details: { orderId },
        },
      };
    }

    if (order.status !== 'pending') {
      return {
        ok: false,
        error: {
          status: 409,
          code: 'STATE_CONFLICT',
          message: 'Only pending orders can be confirmed for processing.',
          details: {
            orderId,
            currentStatus: order.status,
          },
        },
      };
    }

    const orderDetails = snapshot.orderDetails.filter(
      (detail) => detail.orderId === orderId,
    );

    const requiredByProduct = calculateRequiredQuantityByProduct(orderDetails);
    const productsById = new Map(
      snapshot.products.map((product) => [product.productId, product] as const),
    );

    const missingProductIds = [...requiredByProduct.keys()].filter(
      (productId) => !productsById.has(productId),
    );

    if (missingProductIds.length > 0) {
      return {
        ok: false,
        error: {
          status: 409,
          code: 'STATE_CONFLICT',
          message: 'Order references products that are no longer available.',
          details: {
            orderId,
            missingProductIds,
          },
        },
      };
    }

    const deficits = findDeficits(requiredByProduct, productsById);
    if (deficits.length > 0) {
      return {
        ok: false,
        error: {
          status: 422,
          code: 'INSUFFICIENT_STOCK',
          message: 'Insufficient stock for one or more products.',
          details: {
            orderId,
            deficits,
          },
        },
      };
    }

    const occurredAt = new Date().toISOString();
    const movementDrafts: Array<Omit<InventoryMovement, 'movementId'>> = [];

    for (const [productId, quantity] of requiredByProduct.entries()) {
      const product = productsById.get(productId);
      if (!product) {
        continue;
      }

      product.stockLevel -= quantity;
      product.inventoryVersion = (product.inventoryVersion ?? 0) + 1;

      movementDrafts.push({
        orderId,
        productId,
        quantity,
        movementType: 'deduct_on_confirm',
        occurredAt,
      });
    }

    order.status = 'processing';
    order.orderVersion = (order.orderVersion ?? 0) + 1;

    return {
      ok: true,
      data: {
        order: { ...order },
        movementDrafts,
      },
    };
  });

  if (!result.ok) {
    return result;
  }

  const movements = appendInventoryMovements(result.data.movementDrafts);
  appendOrderAuditEvent({
    orderId,
    eventType: 'order_confirmed',
    occurredAt: new Date().toISOString(),
    metadata: {
      movementCount: movements.length,
    },
  });

  return {
    ok: true,
    data: {
      order: result.data.order,
      movements,
    },
  };
}