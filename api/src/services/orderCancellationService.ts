import { Order } from '../models/order';
import { runInventoryTransaction } from './inventoryTransaction';
import {
  appendInventoryMovements,
  appendOrderAuditEvent,
  InventoryMovement,
  OrderAuditEvent,
} from './orderAuditService';
import { canCancel } from './orderStatePolicy';
import {
  calculateRestorableStock,
  DeliveredSummary,
  RestorableStockLine,
} from './stockCompensationService';
import { ServiceResult } from './types';

export interface CancelOrderCommand {
  orderId: number;
  reason?: string;
  cancelledBy?: string;
  idempotencyKey?: string;
  correlationId?: string;
  deliveredSummary?: DeliveredSummary;
}

interface CancellationTransactionOutcome {
  order: Order;
  restockedItems: RestorableStockLine[];
  movementDrafts: Array<Omit<InventoryMovement, 'movementId'>>;
  auditDraft?: Omit<OrderAuditEvent, 'eventId'>;
  idempotent: boolean;
}

export interface CancelOrderResult {
  order: Order;
  restockedItems: RestorableStockLine[];
  movements: InventoryMovement[];
  idempotent: boolean;
}

export async function cancelOrderTransactional(
  command: CancelOrderCommand,
): Promise<ServiceResult<CancelOrderResult>> {
  const result = await runInventoryTransaction<
    ServiceResult<CancellationTransactionOutcome>
  >((snapshot) => {
    const order = snapshot.orders.find((item) => item.orderId === command.orderId);

    if (!order) {
      return {
        ok: false,
        error: {
          status: 404,
          code: 'NOT_FOUND',
          message: 'Order not found.',
          details: {
            orderId: command.orderId,
          },
        },
      };
    }

    const decision = canCancel(order, command.deliveredSummary);
    if (!decision.canCancel) {
      return {
        ok: false,
        error: {
          status: 409,
          code: 'STATE_CONFLICT',
          message: decision.reason ?? 'Order cannot be cancelled in its current state.',
          details: {
            orderId: command.orderId,
            currentStatus: order.status,
          },
        },
      };
    }

    if (decision.isIdempotent) {
      return {
        ok: true,
        data: {
          order: { ...order },
          restockedItems: [],
          movementDrafts: [],
          idempotent: true,
        },
      };
    }

    const orderDetails = snapshot.orderDetails.filter(
      (detail) => detail.orderId === command.orderId,
    );
    const restockLines = calculateRestorableStock(
      orderDetails,
      command.deliveredSummary,
    ).filter((line) => line.restorableQuantity > 0);

    const productsById = new Map(
      snapshot.products.map((product) => [product.productId, product] as const),
    );

    const missingProductIds = restockLines
      .map((line) => line.productId)
      .filter((productId) => !productsById.has(productId));

    if (missingProductIds.length > 0) {
      return {
        ok: false,
        error: {
          status: 409,
          code: 'STATE_CONFLICT',
          message: 'Order cancellation cannot compensate stock for missing products.',
          details: {
            orderId: command.orderId,
            missingProductIds,
          },
        },
      };
    }

    const occurredAt = new Date().toISOString();
    const movementDrafts: Array<Omit<InventoryMovement, 'movementId'>> = [];

    for (const line of restockLines) {
      const product = productsById.get(line.productId);
      if (!product) {
        continue;
      }

      product.stockLevel += line.restorableQuantity;
      product.inventoryVersion = (product.inventoryVersion ?? 0) + 1;

      movementDrafts.push({
        orderId: command.orderId,
        productId: line.productId,
        quantity: line.restorableQuantity,
        movementType: 'restock_on_cancel',
        occurredAt,
        correlationId: command.correlationId,
      });
    }

    order.status = 'cancelled';
    order.orderVersion = (order.orderVersion ?? 0) + 1;

    const auditDraft: Omit<OrderAuditEvent, 'eventId'> = {
      orderId: command.orderId,
      eventType: 'order_cancelled',
      occurredAt,
      correlationId: command.correlationId,
      metadata: {
        reason: command.reason,
        cancelledBy: command.cancelledBy,
        idempotencyKey: command.idempotencyKey,
        restockedItemCount: restockLines.length,
      },
    };

    return {
      ok: true,
      data: {
        order: { ...order },
        restockedItems: restockLines,
        movementDrafts,
        auditDraft,
        idempotent: false,
      },
    };
  });

  if (!result.ok) {
    return result;
  }

  if (result.data.idempotent) {
    return {
      ok: true,
      data: {
        order: result.data.order,
        restockedItems: [],
        movements: [],
        idempotent: true,
      },
    };
  }

  const movements = appendInventoryMovements(result.data.movementDrafts);
  if (result.data.auditDraft) {
    appendOrderAuditEvent(result.data.auditDraft);
  }

  return {
    ok: true,
    data: {
      order: result.data.order,
      restockedItems: result.data.restockedItems,
      movements,
      idempotent: false,
    },
  };
}