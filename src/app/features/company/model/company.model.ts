/**
 * Master Company Profile Response Model
 * Backend ke CompanyProfileDto se match karta hai
 */
export interface CompanyProfileDto {
    id: string;
    name: string;
    tagline: string;
    registrationNumber: string;
    gstin: string; //
    logoUrl: string | null;
    primaryEmail: string;
    email: string | null;
    primaryPhone: string;
    website: string;
    message: string | null; // WhatsApp/SMS reminder message
    driverWhatsAppMessage: string | null; // Custom message for driver tracking
    purchaseOrderCreationMessage: string | null;
    purchaseOrderStatusUpdateMessage: string | null;
    saleOrderCreationMessage: string | null;
    saleOrderConfirmationMessage: string | null;
    smtpEmail: string | null;
    smtpPassword: string | null;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUseSsl: boolean;
    isActive: boolean;
    saleReturnWindowValue: number;
    saleReturnWindowUnit: string;
    saleReturnPolicyDisclaimer?: string;
    purchaseReturnWindowValue: number;
    purchaseReturnWindowUnit: string;
    purchaseReturnPolicyDisclaimer?: string;
    invoiceFooterMessage: string | null;
    estimateFooterMessage: string | null;
    purchaseOrderFooterMessage: string | null;
    saleOrderFooterMessage: string | null;
    addresses: AddressDto[]; // Changed from address to addresses array
    bankInfo: BankDetailDto;
    authorizedSignatories: AuthorizedSignatoryDto[];
}

/**
 * Authorized Signatory Model
 */
export interface AuthorizedSignatoryDto {
    id: string;
    personName: string;
    designation: string;
    signatureImageUrl: string | null;
    email: string;
    isDefault: boolean;
}

/**
 * Address Details Model
 */
export interface AddressDto {
    id: string;
    branchName?: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    stateCode: string;
    pinCode: string;
    country: string;
    email?: string;
    phone?: string;
    contactPerson?: string;
    gstin?: string;
    isHeadOffice: boolean;
}

/**
 * Bank Account Details Model
 */
export interface BankDetailDto {
    id: string;
    bankName: string;
    branchName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: string; // e.g., "Current" or "Savings"
}

/**
 * Create/Update Request Model
 * Backend ke UpsertCompanyRequest se match karta hai
 */
export interface UpsertCompanyRequest {
    companyId?: string;
    name: string;
    tagline: string;
    registrationNumber: string;
    gstin: string;
    logoUrl: string | null;
    primaryEmail: string;
    email?: string;
    primaryPhone: string;
    website: string;
    message: string | null; // WhatsApp/SMS reminder message
    driverWhatsAppMessage: string | null; // Custom message for driver tracking
    purchaseOrderCreationMessage: string | null;
    purchaseOrderStatusUpdateMessage: string | null;
    saleOrderCreationMessage: string | null;
    saleOrderConfirmationMessage: string | null;
    smtpEmail: string | null;
    smtpPassword: string | null;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUseSsl: boolean;
    saleReturnWindowValue: number;
    saleReturnWindowUnit: string;
    saleReturnPolicyDisclaimer?: string;
    purchaseReturnWindowValue: number;
    purchaseReturnWindowUnit: string;
    purchaseReturnPolicyDisclaimer?: string;
    invoiceFooterMessage: string | null;
    estimateFooterMessage: string | null;
    purchaseOrderFooterMessage: string | null;
    saleOrderFooterMessage: string | null;
    addresses: AddressDto[]; // Changed to branches array
    bankInfo: BankDetailDto;
    authorizedSignatories: AuthorizedSignatoryDto[];
}
