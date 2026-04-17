import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
// Trigger re-build

import { SummaryStat, SummaryStatsComponent } from '../../../shared/components/summary-stats-component/summary-stats-component';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
    selector: 'app-menu-management',
    standalone: true,
    imports: [CommonModule, MaterialModule, MatTableModule, MatPaginatorModule, MatSortModule, MatDialogModule, ScrollingModule, DragDropModule, SummaryStatsComponent],
    templateUrl: './menu-management.component.html',
    styleUrl: './menu-management.component.scss'
})
export class MenuManagementComponent implements OnInit, AfterViewInit {
    displayedColumns: string[] = ['id', 'title', 'url', 'parentId', 'order', 'actions'];
    summaryStats: SummaryStat[] = [];
    loading = false;

    columnWidths: { [key: string]: number } = {
        'id': 250,
        'title': 250,
        'url': 250,
        'parentId': 150,
        'order': 100,
        'actions': 120
    };

    getGridTemplate(): string {
        return this.displayedColumns.map(col => `${this.columnWidths[col]}px`).join(' ');
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
    visibleData$ = this.dataSource.connect();
    allMenus: MenuItem[] = [];

    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private menuService: MenuService,
        private dialog: MatDialog,
        private loadingService: LoadingService
    ) { }

    ngOnInit(): void {
        this.loadMenus();
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
                this.dataSource.data = menus;

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

    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    dropColumn(event: CdkDragDrop<string[]>) {
        moveItemInArray(this.displayedColumns, event.previousIndex, event.currentIndex);
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

    getParentTitle(parentId: number): string {
        const parent = this.allMenus.find(m => m.id === parentId);
        return parent ? parent.title : 'Unknown';
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
