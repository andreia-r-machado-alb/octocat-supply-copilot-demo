export type OrderAuditEventType = 'order_confirmed' | 'order_cancelled';

export type InventoryMovementType = 'deduct_on_confirm' | 'restock_on_cancel';

export interface OrderAuditEvent {
  eventId: number;
  orderId: number;
  eventType: OrderAuditEventType;
  occurredAt: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface InventoryMovement {
  movementId: number;
  orderId: number;
  productId: number;
  quantity: number;
  movementType: InventoryMovementType;
  occurredAt: string;
  correlationId?: string;
}

let orderAuditEvents: OrderAuditEvent[] = [];
let inventoryMovements: InventoryMovement[] = [];
let nextOrderAuditEventId = 1;
let nextInventoryMovementId = 1;

export function appendOrderAuditEvent(
  event: Omit<OrderAuditEvent, 'eventId'>,
): OrderAuditEvent {
  const entry: OrderAuditEvent = {
    eventId: nextOrderAuditEventId,
    ...event,
  };

  nextOrderAuditEventId += 1;
  orderAuditEvents.push(entry);
  return entry;
}

export function appendInventoryMovements(
  movements: Array<Omit<InventoryMovement, 'movementId'>>,
): InventoryMovement[] {
  const entries = movements.map((movement) => {
    const entry: InventoryMovement = {
      movementId: nextInventoryMovementId,
      ...movement,
    };

    nextInventoryMovementId += 1;
    return entry;
  });

  inventoryMovements.push(...entries);
  return entries;
}

export function getOrderAuditEvents(): OrderAuditEvent[] {
  return orderAuditEvents;
}

export function getInventoryMovements(): InventoryMovement[] {
  return inventoryMovements;
}

export function resetOrderAuditStore(): void {
  orderAuditEvents = [];
  inventoryMovements = [];
  nextOrderAuditEventId = 1;
  nextInventoryMovementId = 1;
}