export interface Category {
  id?: any;          // optional for create
  categoryName?: string;
  categoryCode?: string;
  defaultGst?: number;
  description?: string;
  isActive?: boolean;
  companyId?: string | null;
  branchId?: string | null;
  createdBy?: string | null;
  modifiedBy?: string | null;
}

export interface CategoryDropdown {
  id: any;
  name: any;
}
