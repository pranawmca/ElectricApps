export type PriceListType = 'PURCHASE' | 'SALES';

export interface PriceListModel {
  id?: number;
  name: string; // Required for business
  pricetype: PriceListType;
  code: string;
  validfrom: Date;
  validto: Date;
  description?: string;
  isactive: boolean;
  
  // 🆕 Parent-Child Relationship (Enterprise Requirement)
  // Jab aap Save karenge, toh items isi ke andar array ban kar jayenge
  priceListItems: PriceListItemModel[]; 
}

export interface PriceListItemModel {
  id?: number;
  priceListId?: number;
  productId: number;
  productName?: string; // Only for UI Display
  sku?: string;         // 🆕 Identifying product easily
  price: number;        // Special Price for this list
  discountPercent: number; // 🆕 Business ke liye zaroori field
  minQty: number;       // Bulk pricing logic ke liye
  maxQty: number;
  isActive: boolean;
}
