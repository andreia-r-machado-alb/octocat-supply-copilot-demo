import { Order } from '../models/order';
import { DeliveredSummary } from './stockCompensationService';

export interface CancellationDecision {
  canCancel: boolean;
  isIdempotent: boolean;
  reason?: string;
}

export function canCancel(
  order: Order,
  _deliveredSummary?: DeliveredSummary,
): CancellationDecision {
  if (order.status === 'cancelled') {
    return {
      canCancel: true,
      isIdempotent: true,
      reason: 'Order is already cancelled.',
    };
  }

  if (order.status === 'delivered') {
    return {
      canCancel: false,
      isIdempotent: false,
      reason: 'Delivered orders cannot be cancelled.',
    };
  }

  if (
    order.status === 'pending' ||
    order.status === 'processing' ||
    order.status === 'shipped'
  ) {
    return {
      canCancel: true,
      isIdempotent: false,
    };
  }

  return {
    canCancel: false,
    isIdempotent: false,
    reason: `Orders in status '${order.status}' cannot be cancelled.`,
  };
}