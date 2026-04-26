export interface Role {
    id: any;
    roleName: string;
    companyId?: string | null;
    branchId?: string | null;
    companyName?: string;
    createdBy?: string;
    createdDate?: string;
    lastModifiedBy?: string;
    lastModifiedDate?: string;
}

export interface RolePermission {
    id?: any;
    roleId: any;
    menuId: any;
    companyId?: string | null;
    branchId?: string | null;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    additionalActions?: string;
    createdBy?: string;
    createdDate?: string;
    lastModifiedBy?: string;
    lastModifiedDate?: string;
}

export interface RolePrintSetting {
    id?: any;
    roleId: any;
    companyId?: string | null;
    branchId?: string | null;
    pageName: string;
    printFormat: string; // 'A4' | 'THERMAL'
    createdBy?: string;
    createdDate?: string;
    lastModifiedBy?: string;
    lastModifiedDate?: string;
}
