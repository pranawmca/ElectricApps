export interface MenuItem {
  id: any;
  title: string;
  url: string;
  icon?: string;
  parentId?: any | null;
  order: number;
  companyId?: string | null;
  branchId?: string | null;
  createdBy?: string;
  createdDate?: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
  children?: MenuItem[];
  level?: number;
  permissions?: MenuPermissions;
}

export interface MenuPermissions {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  additionalActions?: string;
}
