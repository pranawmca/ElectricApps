export interface GatePass {
    id?: number;
    passNo?: string; // e.g., GP-2026-001
    passType: 'Inward' | 'Outward';
    referenceType: GatePassReferenceType; // 1=PO, 2=GRN, 3=Sale, 4=PurchaseReturn
    referenceId: string | number;
    referenceNo: string;
    invoiceNo?: string; // Challan/Bill No
    partyName: string;
    vehicleNo: string;
    vehicleType?: string; // Tempo, Truck, Bike, LCV
    driverName: string;
    driverPhone: string;
    transporterName?: string;
    totalQty: number; // decimal
    totalWeight?: number; // decimal
    gateEntryTime: Date; // Entry/Exit timestamp
    securityGuard: string;
    status: GatePassStatus; // 1=Entered, 2=Dispatched, 3=Cancelled
    remarks?: string;
    createdBy?: string;
    createdAt?: Date;
    companyId?: string;
}

export enum GatePassReferenceType {
    PurchaseOrder = 1,
    GRN = 2,
    SaleOrder = 3,
    PurchaseReturn = 4,
    SaleReturn = 5
}

export enum GatePassStatus {
    Entered = 1,
    Dispatched = 2,
    Cancelled = 3,
    Completed = 4
}
