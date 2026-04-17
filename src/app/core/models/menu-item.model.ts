export interface MenuItem {
  id: any;
  title: string;
  url: string;
  icon?: string;
  parentId?: any | null;
  order: number;
  children?: MenuItem[];
  permissions?: MenuPermissions;
}

export interface MenuPermissions {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  additionalActions?: string;
}
