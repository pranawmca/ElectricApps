export interface Role {
    id: any;
    roleName: string;
    companyId?: string | null;
}

export interface RolePermission {
    id?: any;
    roleId: any;
    menuId: any;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    additionalActions?: string;
}

export interface RolePrintSetting {
    id?: any;
    roleId: any;
    pageName: string;
    printFormat: string; // 'A4' | 'THERMAL'
}
