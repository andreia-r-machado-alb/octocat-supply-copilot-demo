import { OrderDetail } from '../models/orderDetail';

export interface DeliveredSummaryLine {
  productId: number;
  deliveredQuantity: number;
}

export interface DeliveredSummary {
  lines: DeliveredSummaryLine[];
}

export interface RestorableStockLine {
  productId: number;
  orderedQuantity: number;
  deliveredQuantity: number;
  restorableQuantity: number;
}

export function buildDeliveredQuantityMap(
  deliveredSummary?: DeliveredSummary,
): Map<number, number> {
  const deliveredByProduct = new Map<number, number>();

  for (const line of deliveredSummary?.lines ?? []) {
    const deliveredQty = Number.isFinite(line.deliveredQuantity)
      ? Math.max(0, line.deliveredQuantity)
      : 0;
    const currentQty = deliveredByProduct.get(line.productId) ?? 0;
    deliveredByProduct.set(line.productId, currentQty + deliveredQty);
  }

  return deliveredByProduct;
}

export function calculateRestorableStock(
  orderDetails: OrderDetail[],
  deliveredSummary?: DeliveredSummary,
): RestorableStockLine[] {
  const orderedByProduct = new Map<number, number>();

  for (const detail of orderDetails) {
    const currentQty = orderedByProduct.get(detail.productId) ?? 0;
    orderedByProduct.set(detail.productId, currentQty + detail.quantity);
  }

  const deliveredByProduct = buildDeliveredQuantityMap(deliveredSummary);

  return [...orderedByProduct.entries()].map(([productId, orderedQuantity]) => {
    const deliveredQuantity = Math.min(
      orderedQuantity,
      deliveredByProduct.get(productId) ?? 0,
    );

    return {
      productId,
      orderedQuantity,
      deliveredQuantity,
      restorableQuantity: orderedQuantity - deliveredQuantity,
    };
  });
}