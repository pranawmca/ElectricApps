export interface PurchaseOrderPayload {
  supplierId: number;
  supplierName: string;
  priceListId?: string;
  poDate: string;
  expectedDeliveryDate?: string;
  remarks: string;
  poNumber: string;
  createdBy: string; 
  totalTax: number;
  grandTotal: number;
  items: PurchaseOrderItemPayload[];
  isDispatched?: boolean;
}

export interface PurchaseOrderItemPayload {
  productId: string;
  qty: number;
  unit: string;
  rate: number;
  discountPercent: number;
  gstPercent: number;
  taxAmount: number;
  total: number;
}