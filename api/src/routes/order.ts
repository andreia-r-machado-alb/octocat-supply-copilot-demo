/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: API endpoints for managing orders
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Returns all orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of all orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 * 
 * /api/orders/{id}:
 *   get:
 *     summary: Get an order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *   put:
 *     summary: Update an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       200:
 *         description: Order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *   delete:
 *     summary: Delete an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       204:
 *         description: Order deleted successfully
 *       404:
 *         description: Order not found
 */

import express from 'express';
import { Order } from '../models/order';
import { getOrders } from '../state/dataStore';
import { cancelOrderTransactional } from '../services/orderCancellationService';
import { confirmOrderAndDeductStock } from '../services/orderInventoryService';
import { ServiceError } from '../services/types';

const router = express.Router();

function sendServiceError(res: express.Response, error: ServiceError): void {
  res.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  });
}

// Create a new order
router.post('/', (req, res) => {
  const orders = getOrders();
  const newOrder: Order = req.body;
  orders.push(newOrder);
  res.status(201).json(newOrder);
});

// Get all orders
router.get('/', (req, res) => {
  const orders = getOrders();
  res.json(orders);
});

// Get an order by ID
router.get('/:id', (req, res) => {
  const orders = getOrders();
  const order = orders.find(o => o.orderId === parseInt(req.params.id));
  if (order) {
    res.json(order);
  } else {
    res.status(404).send('Order not found');
  }
});

// Update an order by ID
router.put('/:id', async (req, res) => {
  const orders = getOrders();
  const id = parseInt(req.params.id);
  const index = orders.findIndex(o => o.orderId === id);

  if (index === -1) {
    res.status(404).send('Order not found');
    return;
  }

  const currentOrder = orders[index];
  const updatedOrder: Order = req.body;

  if (
    updatedOrder.status === 'processing' &&
    currentOrder.status !== 'processing'
  ) {
    const confirmationResult = await confirmOrderAndDeductStock(id);
    if (!confirmationResult.ok) {
      sendServiceError(res, confirmationResult.error);
      return;
    }

    res.json(confirmationResult.data.order);
    return;
  }

  if (
    updatedOrder.status === 'cancelled' &&
    currentOrder.status !== 'cancelled'
  ) {
    res.status(409).json({
      error: {
        code: 'STATE_CONFLICT',
        message: 'Use POST /api/orders/:id/cancel for cancellation operations.',
        details: {
          orderId: id,
          currentStatus: currentOrder.status,
        },
      },
    });
    return;
  }

  orders[index] = updatedOrder;
  res.json(orders[index]);
});

router.post('/:id/cancel', async (req, res) => {
  const id = parseInt(req.params.id);
  const cancellationResult = await cancelOrderTransactional({
    orderId: id,
    reason: req.body?.reason,
    cancelledBy: req.body?.cancelledBy,
    idempotencyKey: req.body?.idempotencyKey,
    correlationId: req.body?.correlationId,
    deliveredSummary: req.body?.deliveredSummary,
  });

  if (!cancellationResult.ok) {
    sendServiceError(res, cancellationResult.error);
    return;
  }

  res.json(cancellationResult.data);
});

// Delete an order by ID
router.delete('/:id', (req, res) => {
  const orders = getOrders();
  const index = orders.findIndex(o => o.orderId === parseInt(req.params.id));
  if (index !== -1) {
    orders.splice(index, 1);
    res.status(204).send();
  } else {
    res.status(404).send('Order not found');
  }
});

export default router;
