import { orders as seedOrders, orderDetails as seedOrderDetails, products as seedProducts } from '../seedData';
import { Order } from '../models/order';
import { OrderDetail } from '../models/orderDetail';
import { Product } from '../models/product';

export let orders: Order[] = [...seedOrders];
export let orderDetails: OrderDetail[] = [...seedOrderDetails];
export let products: Product[] = [...seedProducts];

export const resetDataStore = () => {
  orders = [...seedOrders];
  orderDetails = [...seedOrderDetails];
  products = [...seedProducts];
};
