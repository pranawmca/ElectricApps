export interface BulkGrnRequest {
    purchaseOrderIds: number[];
    createdBy: string;
    receivedDate: Date;
    gatePassNo: string | null;
    remarks: string | null;
    items: BulkGrnItem[];
}

export interface BulkGrnItem {
    poId: number;
    productId: string;
    orderedQty: number;
    receivedQty: number;
    pendingQty: number;
    rejectedQty: number;
    acceptedQty: number;
    unitRate: number;
    discountPercent: number;
    gstPercent: number;
    taxAmount: number;
    totalAmount: number;
    warehouseId?: string | null;
    rackId?: string | null;
}
