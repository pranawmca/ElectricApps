-- Use the database
-- USE [InventoryDB] -- Update with actual DB name if needed
-- GO

-- Insert Employee Payroll parent menu
DECLARE @ParentId INT;
DECLARE @PayrollTitle NVARCHAR(100) = 'Employee Payroll';

IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE Title = @PayrollTitle)
BEGIN
    INSERT INTO [dbo].[Menus] ([Title], [Url], [Icon], [ParentId], [Order])
    VALUES (@PayrollTitle, '/app/employee-payroll', 'badge', NULL, 100);
    SET @ParentId = SCOPE_IDENTITY();
    PRINT 'Employee Payroll parent menu item added';
END
ELSE
BEGIN
    SET @ParentId = (SELECT Id FROM [dbo].[Menus] WHERE Title = @PayrollTitle);
END

-- Insert Submenus
-- 1. Dashboard
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE Title = 'Payroll Dashboard' AND ParentId = @ParentId)
BEGIN
    INSERT INTO [dbo].[Menus] ([Title], [Url], [Icon], [ParentId], [Order])
    VALUES ('Payroll Dashboard', '/app/employee-payroll', 'dashboard', @ParentId, 1);
END

-- 2. Employees
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE Title = 'Employees' AND ParentId = @ParentId)
BEGIN
    INSERT INTO [dbo].[Menus] ([Title], [Url], [Icon], [ParentId], [Order])
    VALUES ('Employees', '/app/employee-payroll/employees', 'people', @ParentId, 2);
END

-- 3. Attendance
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE Title = 'Attendance' AND ParentId = @ParentId)
BEGIN
    INSERT INTO [dbo].[Menus] ([Title], [Url], [Icon], [ParentId], [Order])
    VALUES ('Attendance', '/app/employee-payroll/attendance', 'fingerprint', @ParentId, 3);
END

-- 4. Leaves
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE Title = 'Leaves' AND ParentId = @ParentId)
BEGIN
    INSERT INTO [dbo].[Menus] ([Title], [Url], [Icon], [ParentId], [Order])
    VALUES ('Leaves', '/app/employee-payroll/leaves', 'event_busy', @ParentId, 4);
END

-- 5. Salary Slips
IF NOT EXISTS (SELECT 1 FROM [dbo].[Menus] WHERE Title = 'Salary Slips' AND ParentId = @ParentId)
BEGIN
    INSERT INTO [dbo].[Menus] ([Title], [Url], [Icon], [ParentId], [Order])
    VALUES ('Salary Slips', '/app/employee-payroll/salary-slips', 'receipt_long', @ParentId, 5);
END

-- Permissions for Admin Role
DECLARE @AdminRoleId INT = (SELECT Id FROM [dbo].[Roles] WHERE RoleName = 'Admin');

IF @AdminRoleId IS NULL
BEGIN
    SET @AdminRoleId = (SELECT Id FROM [dbo].[Roles] WHERE Name = 'Admin');
END

IF @AdminRoleId IS NOT NULL
BEGIN
    -- Permission for parent and submenus
    INSERT INTO [dbo].[RolePermissions] (RoleId, MenuId, CanView, CanAdd, CanEdit, CanDelete)
    SELECT @AdminRoleId, Id, 1, 1, 1, 1 
    FROM [dbo].[Menus] 
    WHERE (Title = @PayrollTitle OR ParentId = @ParentId)
    AND Id NOT IN (SELECT MenuId FROM [dbo].[RolePermissions] WHERE RoleId = @AdminRoleId);
    
    PRINT 'Permissions granted to Admin for Employee Payroll';
END
ELSE
BEGIN
    PRINT 'Admin role not found. Please verify RoleName/Name for admin role in Roles table.';
END
GO
