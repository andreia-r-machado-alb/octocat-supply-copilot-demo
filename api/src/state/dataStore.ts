import { orders as seedOrders, orderDetails as seedOrderDetails, products as seedProducts } from '../seedData';
import { Order } from '../models/order';
import { OrderDetail } from '../models/orderDetail';
import { Product } from '../models/product';

const cloneOrders = (): Order[] => seedOrders.map(order => ({ ...order }));
const cloneOrderDetails = (): OrderDetail[] => seedOrderDetails.map(orderDetail => ({ ...orderDetail }));
const cloneProducts = (): Product[] => seedProducts.map(product => ({ ...product }));

export let orders: Order[] = cloneOrders();
export let orderDetails: OrderDetail[] = cloneOrderDetails();
export let products: Product[] = cloneProducts();

export const resetDataStore = () => {
  orders = cloneOrders();
  orderDetails = cloneOrderDetails();
  products = cloneProducts();
};
