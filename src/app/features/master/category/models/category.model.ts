export interface Category {
  id?: any;          // optional for create
  categoryName?: string;
  categoryCode?: string;
  defaultGst?: number;
  description?: string;
  isActive?: boolean;
  companyId?: string | null;
}

export interface CategoryDropdown {
  id: any;
  name: any;
}
