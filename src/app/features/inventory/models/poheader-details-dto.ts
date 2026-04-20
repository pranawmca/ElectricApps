export interface POHeaderDetailsDto {
    purchaseOrderId: number;
    supplierId: number;
    supplierName: string;
    priceListId?: string;
    poNumber: string;
    remarks: string;
    expectedDeliveryDate: Date;
}
