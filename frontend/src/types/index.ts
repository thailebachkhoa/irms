export type Role = 'admin' | 'manager' | 'server' | 'chef' | 'casher';

export type OrderStatus  = 'pending' | 'cooking' | 'done';
export type TicketStatus = 'pending' | 'cooking' | 'done';
export type TableStatus  = 'available' | 'occupied' | 'food_ready';
export type BillStatus   = 'pending' | 'paid';

export type MenuItem = {
  id: string; name: string; price: number; isAvailable: boolean;
};
export type Order = {
  id: string; tableId: string; comboId: string; comboName: string;
  quantity: number; notes: string; totalPrice: number;
  status: OrderStatus; createdAt: string;
};
export type CreateOrderDto = {
  tableId: string; comboId: string; quantity: number; notes: string;
};
export type KitchenTicket = {
  id: string; orderId: string; tableId: string;
  comboName: string; quantity: number; notes: string;
  status: TicketStatus; createdAt: string;
};
export type Table = {
  id: string; tableNumber: string; status: TableStatus;
};
export type Bill = {
  id: string; orderId: string; tableId: string;
  totalAmount: number; status: BillStatus; createdAt: string;
};
export type Ingredient = {
  id: string; name: string; quantity: number; unit: string; threshold: number;
};
export type Revenue = {
  id: string; billId: string; amount: number; date: string;
};
export type User = {
  id: string; username: string; role: Role; createdAt: string;
};
export type AuthPayload = { id: string; role: Role };
