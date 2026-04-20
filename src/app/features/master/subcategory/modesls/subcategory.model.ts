export interface SubCategory {
  id?: string;
  categoryId?: string;
  categoryName?: string;
  subcategoryCode?: string;
  subcategoryName: string;
  name?: string;
  code?: string;
  defaultGst: number;
  description?: string;
  isActive: boolean;
  companyId?: string | null;
}
