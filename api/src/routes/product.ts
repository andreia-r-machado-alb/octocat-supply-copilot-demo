/**
 * @swagger
 * tags:
 *   name: Products
 *   description: API endpoints for managing products
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Returns all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of all products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 * 
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       204:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */

import express from 'express';
import { EventEmitter } from 'events';
import { Product } from '../models/product';
import { products as seedProducts } from '../seedData';

const router = express.Router();

let products: Product[] = [...seedProducts];
export const productEvents = new EventEmitter();
export const LOW_STOCK_ALERT_EVENT = 'low-stock-alert';

export const resetProducts = () => {
  products = [...seedProducts];
};

const shouldEmitLowStockAlert = (previousProduct: Product, updatedProduct: Product) => {
  if (typeof updatedProduct.quantity !== 'number' || typeof updatedProduct.reorder_threshold !== 'number') {
    return false;
  }

  const isNowBelowThreshold = updatedProduct.quantity < updatedProduct.reorder_threshold;
  const wasPreviouslyBelowThreshold =
    typeof previousProduct.quantity === 'number' &&
    typeof previousProduct.reorder_threshold === 'number' &&
    previousProduct.quantity < previousProduct.reorder_threshold;

  return isNowBelowThreshold && !wasPreviouslyBelowThreshold;
};

// Create a new product
router.post('/', (req, res) => {
  const newProduct: Product = req.body;
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// Get all products
router.get('/', (req, res) => {
  res.json(products);
});

// Get a product by ID
router.get('/:id', (req, res) => {
  const product = products.find(p => p.productId === parseInt(req.params.id));
  if (product) {
    res.json(product);
  } else {
    res.status(404).send('Product not found');
  }
});

// Update a product by ID
router.put('/:id', (req, res) => {
  const index = products.findIndex(p => p.productId === parseInt(req.params.id));
  if (index !== -1) {
    const previousProduct = products[index];
    const updatedProduct: Product = {
      productId: previousProduct.productId,
      supplierId: req.body.supplierId ?? previousProduct.supplierId,
      name: req.body.name ?? previousProduct.name,
      description: req.body.description ?? previousProduct.description,
      price: req.body.price ?? previousProduct.price,
      sku: req.body.sku ?? previousProduct.sku,
      unit: req.body.unit ?? previousProduct.unit,
      imgName: req.body.imgName ?? previousProduct.imgName,
      discount: req.body.discount ?? previousProduct.discount,
      quantity: req.body.quantity ?? previousProduct.quantity,
      reorder_threshold: req.body.reorder_threshold ?? previousProduct.reorder_threshold
    };

    products[index] = updatedProduct;

    if (shouldEmitLowStockAlert(previousProduct, updatedProduct)) {
      productEvents.emit(LOW_STOCK_ALERT_EVENT, {
        productId: previousProduct.productId,
        quantity: updatedProduct.quantity,
        reorder_threshold: updatedProduct.reorder_threshold
      });
    }

    res.json(products[index]);
  } else {
    res.status(404).send('Product not found');
  }
});

// Delete a product by ID
router.delete('/:id', (req, res) => {
  const index = products.findIndex(p => p.productId === parseInt(req.params.id));
  if (index !== -1) {
    products.splice(index, 1);
    res.status(204).send();
  } else {
    res.status(404).send('Product not found');
  }
});

export default router;
