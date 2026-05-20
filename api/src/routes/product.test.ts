import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createProductRouter } from './product';
import { products as seedProducts } from '../seedData';
import type { Product } from '../models/product';

let app: express.Express;

describe('Product API', () => {
    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/products', createProductRouter([...seedProducts]));
    });

    it('should create a new product', async () => {
        const newProduct = {
            productId: 99,
            supplierId: 1,
            name: "Test Product",
            description: "A test product",
            price: 9.99,
            sku: "TEST-001",
            unit: "piece",
            imgName: "test.png",
            stockLevel: 100,
            reorderThreshold: 20
        };
        const response = await request(app).post('/products').send(newProduct);
        expect(response.status).toBe(201);
        expect(response.body).toMatchObject(newProduct);
        expect(response.body.lowStockAlert).toBe(false);
    });

    it('should return 400 when creating a product with negative stockLevel', async () => {
        const newProduct = {
            productId: 99, supplierId: 1, name: "Bad Product", description: "",
            price: 9.99, sku: "BAD-001", unit: "piece", imgName: "bad.png",
            stockLevel: -1, reorderThreshold: 10
        };
        const response = await request(app).post('/products').send(newProduct);
        expect(response.status).toBe(400);
    });

    it('should return 400 when creating a product with a non-numeric stockLevel', async () => {
        const newProduct = {
            productId: 99, supplierId: 1, name: "Bad Product", description: "",
            price: 9.99, sku: "BAD-001", unit: "piece", imgName: "bad.png",
            stockLevel: 'lots', reorderThreshold: 10
        };
        const response = await request(app).post('/products').send(newProduct);
        expect(response.status).toBe(400);
    });

    it('should return 400 when creating a product with reorderThreshold of zero', async () => {
        const newProduct = {
            productId: 99, supplierId: 1, name: "Bad Product", description: "",
            price: 9.99, sku: "BAD-001", unit: "piece", imgName: "bad.png",
            stockLevel: 10, reorderThreshold: 0
        };
        const response = await request(app).post('/products').send(newProduct);
        expect(response.status).toBe(400);
    });

    it('should get all products', async () => {
        const response = await request(app).get('/products');
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(seedProducts.length);
        expect(response.body[0]).toHaveProperty('lowStockAlert');
    });

    it('should get a product by ID', async () => {
        const response = await request(app).get('/products/1');
        expect(response.status).toBe(200);
        expect(response.body.productId).toBe(1);
        expect(response.body).toHaveProperty('lowStockAlert');
    });

    it('should return 404 for non-existing product', async () => {
        const response = await request(app).get('/products/999');
        expect(response.status).toBe(404);
    });

    it('should delete a product by ID', async () => {
        const response = await request(app).delete('/products/1');
        expect(response.status).toBe(204);
    });

    describe('Low-stock alert on update', () => {
        it('should not emit a low-stock alert when stock is above the threshold', async () => {
            const updated = { ...seedProducts[0], stockLevel: 20, reorderThreshold: 10 };
            const response = await request(app).put('/products/1').send(updated);
            expect(response.status).toBe(200);
            expect(response.body.lowStockAlert).toBe(false);
        });

        it('should not emit a low-stock alert when stock equals the threshold', async () => {
            const updated = { ...seedProducts[0], stockLevel: 10, reorderThreshold: 10 };
            const response = await request(app).put('/products/1').send(updated);
            expect(response.status).toBe(200);
            expect(response.body.lowStockAlert).toBe(false);
        });

        it('should emit a low-stock alert when stock falls below the threshold', async () => {
            const updated = { ...seedProducts[0], stockLevel: 9, reorderThreshold: 10 };
            const response = await request(app).put('/products/1').send(updated);
            expect(response.status).toBe(200);
            expect(response.body.lowStockAlert).toBe(true);
        });

        it('should emit a low-stock alert when stock is zero', async () => {
            const updated = { ...seedProducts[0], stockLevel: 0, reorderThreshold: 10 };
            const response = await request(app).put('/products/1').send(updated);
            expect(response.status).toBe(200);
            expect(response.body.lowStockAlert).toBe(true);
        });

        it('should not emit a low-stock alert when reorderThreshold is not defined', async () => {
            const updated = { ...seedProducts[0], stockLevel: 2, reorderThreshold: undefined };
            const response = await request(app).put('/products/1').send(updated);
            expect(response.status).toBe(200);
            expect(response.body.lowStockAlert).toBe(false);
        });

        it('should return 400 when stockLevel is negative', async () => {
            const updated = { ...seedProducts[0], stockLevel: -1, reorderThreshold: 10 };
            const response = await request(app).put('/products/1').send(updated);
            expect(response.status).toBe(400);
        });

        it('should return 400 when stockLevel is a non-numeric string', async () => {
            const updated = { ...seedProducts[0], stockLevel: 'lots', reorderThreshold: 10 };
            const response = await request(app).put('/products/1').send(updated);
            expect(response.status).toBe(400);
        });

        it('should return 400 when reorderThreshold is zero', async () => {
            const updated = { ...seedProducts[0], stockLevel: 5, reorderThreshold: 0 };
            const response = await request(app).put('/products/1').send(updated);
            expect(response.status).toBe(400);
        });

        it('should return 400 when reorderThreshold is negative', async () => {
            const updated = { ...seedProducts[0], stockLevel: 5, reorderThreshold: -5 };
            const response = await request(app).put('/products/1').send(updated);
            expect(response.status).toBe(400);
        });

        it('should return 400 when reorderThreshold is a non-numeric string', async () => {
            const updated = { ...seedProducts[0], stockLevel: 5, reorderThreshold: 'many' };
            const response = await request(app).put('/products/1').send(updated);
            expect(response.status).toBe(400);
        });
    });

    describe('GET /low-stock', () => {
        it('should return products whose stock is below their reorder threshold', async () => {
            // Drive product 1 below its threshold
            await request(app)
                .put('/products/1')
                .send({ ...seedProducts[0], stockLevel: 2, reorderThreshold: 10 });

            const response = await request(app).get('/products/low-stock');
            expect(response.status).toBe(200);
            const ids = (response.body as Product[]).map(p => p.productId);
            expect(ids).toContain(1);
        });

        it('should return an empty array when no products are below their threshold', async () => {
            // Set all seed products to stock well above threshold
            for (const product of seedProducts) {
                await request(app)
                    .put(`/products/${product.productId}`)
                    .send({ ...product, stockLevel: 9999, reorderThreshold: 10 });
            }

            const response = await request(app).get('/products/low-stock');
            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });
});
