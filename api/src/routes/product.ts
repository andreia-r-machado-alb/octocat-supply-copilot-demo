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
import { Product } from '../models/product';
import { products as seedProducts } from '../seedData';

const router = express.Router();

let products: Product[] = [...seedProducts];

// Add reset function for testing
export const resetProducts = () => {
  products = [...seedProducts];
};

const isLowStock = (p: Product): boolean =>
  p.stockLevel !== undefined &&
  p.reorderThreshold !== undefined &&
  p.stockLevel < p.reorderThreshold;

/**
 * Validates the stock-related fields of a product body.
 * Returns an error message string if invalid, or null if valid.
 */
function validateStockFields(body: Partial<Product>): string | null {
  const { stockLevel, reorderThreshold } = body;
  if (stockLevel !== undefined) {
    if (typeof stockLevel !== 'number' || !Number.isInteger(stockLevel)) {
      return 'stockLevel must be an integer';
    }
    if (stockLevel < 0) {
      return 'stockLevel must be a non-negative integer';
    }
  }
  if (reorderThreshold !== undefined) {
    if (typeof reorderThreshold !== 'number' || !Number.isInteger(reorderThreshold)) {
      return 'reorderThreshold must be an integer';
    }
    if (reorderThreshold < 1) {
      return 'reorderThreshold must be a positive integer (>= 1)';
    }
  }
  return null;
}

// Create a new product
router.post('/', (req, res) => {
  const validationError = validateStockFields(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  const newProduct: Product = req.body;
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// Get all products
router.get('/', (req, res) => {
  res.json(products.map(p => ({ ...p, lowStockAlert: isLowStock(p) })));
});

// Get products with stock below their reorder threshold
router.get('/low-stock', (req, res) => {
  const lowStock = products.filter(isLowStock);
  res.json(lowStock);
});

// Get a product by ID
router.get('/:id', (req, res) => {
  const product = products.find(p => p.productId === parseInt(req.params.id));
  if (!product) {
    res.status(404).send('Product not found');
    return;
  }
  res.json({ ...product, lowStockAlert: isLowStock(product) });
});

// Update a product by ID
router.put('/:id', (req, res) => {
  const index = products.findIndex(p => p.productId === parseInt(req.params.id));
  if (index === -1) {
    res.status(404).send('Product not found');
    return;
  }
  const validationError = validateStockFields(req.body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }
  products[index] = req.body;
  const updated = products[index];
  const lowStockAlert = isLowStock(updated);
  res.json({ ...updated, lowStockAlert });
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
