import { Order } from '../models/order';
import { OrderDetail } from '../models/orderDetail';
import { Product } from '../models/product';
import {
  orders as seedOrders,
  orderDetails as seedOrderDetails,
  products as seedProducts,
} from '../seedData';

export interface DataStoreSnapshot {
  orders: Order[];
  orderDetails: OrderDetail[];
  products: Product[];
}

let orders: Order[] = [];
let orderDetails: OrderDetail[] = [];
let products: Product[] = [];

function cloneOrders(source: Order[]): Order[] {
  return source.map((order) => ({ ...order }));
}

function cloneOrderDetails(source: OrderDetail[]): OrderDetail[] {
  return source.map((detail) => ({ ...detail }));
}

function cloneProducts(source: Product[]): Product[] {
  return source.map((product) => ({ ...product }));
}

export function createDataStoreSnapshot(): DataStoreSnapshot {
  return {
    orders: cloneOrders(orders),
    orderDetails: cloneOrderDetails(orderDetails),
    products: cloneProducts(products),
  };
}

export function applyDataStoreSnapshot(snapshot: DataStoreSnapshot): void {
  orders = cloneOrders(snapshot.orders);
  orderDetails = cloneOrderDetails(snapshot.orderDetails);
  products = cloneProducts(snapshot.products);
}

export function resetDataStore(): void {
  applyDataStoreSnapshot({
    orders: seedOrders,
    orderDetails: seedOrderDetails,
    products: seedProducts,
  });
}

export function getOrders(): Order[] {
  return orders;
}

export function getOrderDetails(): OrderDetail[] {
  return orderDetails;
}

export function getProducts(): Product[] {
  return products;
}

resetDataStore();
