// price-list-item.dto.ts
export interface PriceListItemDto {
  productId: string;    // Backend se GUID ya string format mein aayega [cite: 2026-01-22]
  productName: string;  // Popup mein dikhane ke liye
  rate: number;         // Decimal value jo calculation mein use hogi
  unit: string;         // Unit field update karne ke liye
  gstPercent?: number;  // Optional: Agar tax calculation bhi karni ho
}
