export const EVENTS = {
  ORDER_CREATED:       'ORDER_CREATED',
  ORDER_COMPLETED:     'ORDER_COMPLETED',
  PAYMENT_COMPLETED:   'PAYMENT_COMPLETED',
  RAW_MATERIAL_LOW:    'RAW_MATERIAL_LOW',
} as const;

export interface OrderCreatedPayload {
  orderId:   string;
  tableId:   string;
  comboId:   string;
  comboName: string;
  quantity:  number;
  notes:     string;
  totalPrice: number;
}

export interface OrderCompletedPayload {
  orderId:  string;
  tableId:  string;
}

export interface PaymentCompletedPayload {
  billId:   string;
  tableId:  string;
  amount:   number;
  date:     string;
}

export interface RawMaterialLowPayload {
  ingredientName: string;
  currentQty:     number;
  threshold:      number;
}
