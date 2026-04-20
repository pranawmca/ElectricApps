// models/purchase-order.model.ts
export interface PurchaseOrder {
  supplierId: number;
  poNumber: string;
  date: Date;
  items: POItem[];
  grandTotal: number;
}

export interface POItem {
  productId: number;
  qty: number;
  unit: string;
  price: number;
  discountPercent: number;
  gstPercent: number;
  total: number;
}
