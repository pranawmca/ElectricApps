export interface LoginDto {
    Email: string;
    Password: string;
    CompanyCode?: string;
}

export interface User {
    id: string;
    userName: string;
    email: string;
    isActive: boolean;
    roles: string[];
    createdAt: string;
    companyName?: string;
    branchId?: string;
  createdBy?: string;
  createdDate?: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
}

export interface RegisterUserDto {
    UserName: string;
    Email: string;
    Password: string;
    RoleIds: string[];
    CompanyId?: string;
    BranchId?: string;
}