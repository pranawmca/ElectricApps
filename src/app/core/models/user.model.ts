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
}

export interface RegisterUserDto {
    UserName: string;
    Email: string;
    Password: string;
    RoleIds: string[];
    CompanyId?: string;
}