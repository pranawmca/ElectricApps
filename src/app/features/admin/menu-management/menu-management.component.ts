import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { DragDropModule, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import { MaterialModule } from '../../../shared/material/material/material-module';
import { MenuService } from '../../../core/services/menu.service';
import { MenuItem } from '../../../core/models/menu-item.model';

import { StatusDialogComponent } from '../../../shared/components/status-dialog-component/status-dialog-component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog-component/confirm-dialog-component';
import { MenuFormDialogComponent } from './menu-form-dialog/menu-form-dialog.component';

import { SummaryStat, SummaryStatsComponent } from '../../../shared/components/summary-stats-component/summary-stats-component';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
    selector: 'app-menu-management',
    standalone: true,
    imports: [CommonModule, MaterialModule, MatTableModule, MatPaginatorModule, MatSortModule, MatDialogModule, ScrollingModule, DragDropModule, SummaryStatsComponent],
    templateUrl: './menu-management.component.html',
    styleUrl: './menu-management.component.scss'
})
export class MenuManagementComponent implements OnInit, AfterViewInit, OnDestroy {
    private destroy$ = new Subject<void>();
    selection = new SelectionModel<MenuItem>(true, []);
    displayedColumns: string[] = ['select', 'id', 'title', 'url', 'parentId', 'order', 'actions'];
    isMobile = false;
    summaryStats: SummaryStat[] = [];
    loading = false;

    columnWidths: { [key: string]: number } = {
        'select': 50,
        'id': 100,
        'title': 250,
        'url': 250,
        'parentId': 120,
        'order': 80,
        'actions': 100
    };

    getGridTemplate(): string {
        return this.displayedColumns.map(col => {
            const width = this.columnWidths[col] || 100;
            return `${width}px`;
        }).join(' ');
    }

    onResizeColumn(event: MouseEvent, col: string) {
        event.preventDefault();
        event.stopPropagation();

        const startX = event.pageX;
        const startWidth = this.columnWidths[col];

        const onMouseMove = (moveEvent: MouseEvent) => {
            const currentX = moveEvent.pageX;
            const diff = currentX - startX;
            const newWidth = Math.max(50, startWidth + diff);
            this.columnWidths[col] = newWidth;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    dataSource = new MatTableDataSource<MenuItem>([]);
    allMenus: MenuItem[] = [];
    treeData: MenuItem[] = [];
    expandedNodes = new Set<string>(); // Store IDs of expanded parent nodes

    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private menuService: MenuService,
        private dialog: MatDialog,
        private loadingService: LoadingService,
        private breakpointObserver: BreakpointObserver,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.observeBreakpoints();
        this.loadMenus();

        this.loadingService.loading$.pipe(takeUntil(this.destroy$)).subscribe(isLoading => {
            if (isLoading) {
                document.documentElement.classList.add('on-menu-management-loading');
            } else {
                document.documentElement.classList.remove('on-menu-management-loading');
            }
        });
    }

    ngOnDestroy(): void {
        document.documentElement.classList.remove('on-menu-management-loading');
        this.destroy$.next();
        this.destroy$.complete();
    }

    private observeBreakpoints(): void {
        this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
            .pipe(takeUntil(this.destroy$))
            .subscribe(result => {
                this.isMobile = result.matches;
                if (this.isMobile) {
                    this.displayedColumns = ['select', 'title', 'parentId', 'actions'];
                } else {
                    this.displayedColumns = ['select', 'id', 'title', 'url', 'parentId', 'order', 'actions'];
                }
            });
    }

    ngAfterViewInit() {
        this.dataSource.sort = this.sort;
    }

    loadMenus(): void {
        this.loading = true;
        this.loadingService.setLoading(true);
        this.menuService.getAllMenus().subscribe({
            next: (menus) => {
                this.allMenus = menus;
                this.treeData = this.buildMenuTree(menus);
                this.updateDataSource();

                // Calculate Stats
                const totalMenus = menus.length;
                const rootMenus = menus.filter(m => !m.parentId).length;
                const subMenus = menus.filter(m => m.parentId).length;

                this.summaryStats = [
                    { label: 'Total Modules', value: totalMenus, icon: 'apps', type: 'total' },
                    { label: 'Root Headers', value: rootMenus, icon: 'view_list', type: 'active' },
                    { label: 'Sub Items', value: subMenus, icon: 'subdirectory_arrow_right', type: 'info' }
                ];

                this.loading = false;
                this.loadingService.setLoading(false);
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
                this.loadingService.setLoading(false);
            }
        });
    }

    buildMenuTree(flatMenus: MenuItem[]): MenuItem[] {
        const menuMap = new Map<string, MenuItem>();
        const rootMenus: MenuItem[] = [];

        // 1. First pass: Create clones and initialize children array
        flatMenus.forEach(menu => {
            const id = String(menu.id);
            menuMap.set(id, { ...menu, children: [] });
        });

        // 2. Second pass: Build hierarchy
        flatMenus.forEach(menu => {
            const id = String(menu.id);
            const currentItem = menuMap.get(id)!;
            
            if (menu.parentId) {
                const parentId = String(menu.parentId);
                const parent = menuMap.get(parentId);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(currentItem);
                } else {
                    rootMenus.push(currentItem);
                }
            } else {
                rootMenus.push(currentItem);
            }
        });

        // 3. Sort logic
        const sortFn = (a: MenuItem, b: MenuItem) => (a.order || 0) - (b.order || 0);
        rootMenus.sort(sortFn);
        menuMap.forEach(item => {
            if (item.children) item.children.sort(sortFn);
        });

        return rootMenus;
    }

    toggleNode(nodeId: any) {
        const idStr = String(nodeId);
        if (this.expandedNodes.has(idStr)) {
            this.expandedNodes.delete(idStr);
        } else {
            this.expandedNodes.add(idStr);
        }
        this.updateDataSource();
    }

    isExpanded(nodeId: any): boolean {
        return this.expandedNodes.has(String(nodeId));
    }

    updateDataSource() {
        const flattened: MenuItem[] = [];
        this.treeData.forEach(node => this.flattenNode(node, flattened, 0));
        this.dataSource.data = flattened;
        this.cdr.detectChanges(); // Force UI update
    }

    private flattenNode(node: MenuItem, result: MenuItem[], level: number) {
        node.level = level;
        result.push(node);
        const idStr = String(node.id);
        if (this.expandedNodes.has(idStr) && node.children && node.children.length > 0) {
            node.children.forEach(child => this.flattenNode(child, result, level + 1));
        }
    }

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    dropColumn(event: CdkDragDrop<string[]>) {
        moveItemInArray(this.displayedColumns, event.previousIndex, event.currentIndex);
    }

    /** Whether the number of selected elements matches the total number of rows. */
    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.data.length;
        return numSelected === numRows;
    }

    /** Selects all rows if they are not all selected; otherwise clear selection. */
    toggleAllRows() {
        if (this.isAllSelected()) {
            this.selection.clear();
            return;
        }

        this.selection.select(...this.dataSource.data);
    }

    /** The label for the checkbox on the passed row */
    checkboxLabel(row?: MenuItem): string {
        if (!row) {
            return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
        }
        return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id}`;
    }

    openBulkBranchDialog(): void {
        const selectedMenus = this.selection.selected;
        if (selectedMenus.length === 0) return;

        // Reuse MenuFormDialogComponent for bulk branch assignment
        // We'll pass a "dummy" menu object but indicate it's a bulk action
        const dialogRef = this.dialog.open(MenuFormDialogComponent, {
            width: '500px',
            data: {
                menu: { title: 'Bulk Update', branchId: 'GLOBAL' } as any,
                allMenus: [],
                isBulk: true,
                selectedItems: selectedMenus
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.selection.clear();
                this.loadMenus();
            }
        });
    }

    getColumnClass(column: string): string {
        switch (column) {
            case 'id': return 'col-id';
            case 'title': return 'col-title';
            case 'url': return 'col-url';
            case 'parentId': return 'col-parent';
            case 'order': return 'col-order';
            case 'actions': return 'col-actions';
            default: return '';
        }
    }

    getColumnLabel(column: string): string {
        switch (column) {
            case 'id': return 'ID';
            case 'title': return 'Title';
            case 'url': return 'URL / Path';
            case 'parentId': return 'Parent';
            case 'order': return 'Order';
            case 'actions': return 'Actions';
            default: return column;
        }
    }

    getParentTitle(parentId: any): string {
        const parent = this.allMenus.find(m => m.id === parentId);
        return parent ? parent.title : 'Root';
    }

    trackByFn(index: number, item: MenuItem): any {
        return item.id || index;
    }

    openMenuDialog(menu?: MenuItem): void {
        const dialogRef = this.dialog.open(MenuFormDialogComponent, {
            width: '500px',
            data: {
                menu: menu || null,
                allMenus: this.allMenus.filter(m => !m.parentId) // Only top-level menus as potential parents
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadMenus();
            }
        });
    }

    deleteMenu(menu: MenuItem): void {
        if (!menu.id) return;

        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            width: '400px',
            data: {
                title: 'Confirm Delete',
                message: `Are you sure you want to delete menu item: ${menu.title}? This may affect sub-menus.`,
                confirmText: 'Delete',
                confirmColor: 'warn'
            }
        });

        dialogRef.afterClosed().subscribe(confirm => {
            if (confirm) {
                this.menuService.deleteMenu(menu.id!).subscribe({
                    next: () => {
                        this.loadMenus();
                        this.showStatus(true, 'Menu deleted successfully');
                    },
                    error: (err) => {
                        console.error(err);
                        this.showStatus(false, 'Failed to delete menu');
                    }
                });
            }
        });
    }

    private showStatus(isSuccess: boolean, message: string): void {
        this.dialog.open(StatusDialogComponent, {
            data: { isSuccess, message }
        });
    }
}
