import { Injectable, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiService } from '../../../shared/api.service';
import { PurchaseOrderPayload } from '../models/purchaseorder.model';
import { PriceListItemDto } from '../models/price-list-item.dto';
import { BulkGrnRequest } from '../models/grnbulkrequest.model';

@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    private api = inject(ApiService);
    
    private inventoryUpdateSource = new Subject<void>();
    inventoryUpdate$ = this.inventoryUpdateSource.asObservable();

    notifyInventoryChange() {
        this.inventoryUpdateSource.next();
    }

    getNextPoNumber(branchId?: string | null): Observable<{ poNumber: string }> {
        const url = branchId ? `purchaseorders/next-number?branchId=${branchId}` : 'purchaseorders/next-number';
        return this.api.get<{ poNumber: string }>(url);
    }

    savePoDraft(payload: PurchaseOrderPayload): Observable<any> {
        return this.api.post('PurchaseOrders/save-po', payload);
    }

    getPriceLists(): Observable<any[]> {
        return this.api.get<any[]>('pricelists');
    }

    getPriceListsForDropdown(): Observable<any[]> {
        return this.api.get<any[]>('pricelists/dropdown');
    }

    getPriceListRate(priceListId: string, productId: number): Observable<any> {
        return this.api.get<any>(`pricelists/${priceListId}/product-rate/${productId}`);
    }

    getProductRate(productId: string, priceListId: string): Observable<any> {
        const url = `PurchaseOrders/get-product-rate?productId=${productId}&priceListId=${priceListId}`;
        return this.api.get(url);
    }

    getPagedOrders(request: any, branchId?: string | null): Observable<any> {
        return this.api.post<any>('PurchaseOrders/get-paged-orders', { ...request, branchId: branchId });
    }

    getQuickPagedOrders(request: any, branchId?: string | null): Observable<any> {
        return this.api.post<any>('PurchaseOrders/get-paged-orders', { ...request, isQuick: true, branchId: branchId });
    }

    getQuickPagedPurchases(page: number, size: number, sort: string, order: string, search: string, startDate?: Date, endDate?: Date, branchId?: string | null): Observable<any> {
        const request = {
            pageIndex: page - 1, // 0-based index
            pageSize: size,
            sortField: sort === 'Date' ? 'CreatedDate' : sort,
            sortOrder: order,
            filter: search,
            fromDate: startDate?.toISOString(),
            toDate: endDate?.toISOString(),
            isQuick: true,
            branchId: branchId
        };
        return this.api.post<any>('PurchaseOrders/get-paged-orders', request);
    }

    getQuickPagedSales(page: number, size: number, sort: string, order: string, search: string, startDate?: Date, endDate?: Date, branchId?: string | null): Observable<any> {
        const request: any = {
            pageNumber: page,
            pageSize: size,
            sortBy: sort === 'Date' ? 'SoDate' : sort,
            sortOrder: order,
            searchTerm: search,
            isQuick: true,
            branchId: branchId
        };
        if (startDate) request.startDate = startDate.toISOString();
        if (endDate) request.endDate = endDate.toISOString();
        
        return this.api.get<any>(`saleorder?${this.api.toQueryString(request)}`);
    }

    deletePurchaseOrder(poId: string): Observable<any> {
        return this.api.delete(`PurchaseOrders/${poId}`);
    }

    deleteSaleOrder(soId: string): Observable<any> {
        return this.api.delete(`saleorder/${soId}`);
    }

    bulkDeletePurchaseOrders(ids: string[]): Observable<any> {
        return this.api.post('PurchaseOrders/bulk-delete-orders', { ids });
    }

    bulkDeletePOItems(poId: string, itemIds: string[]): Observable<any> {
        const payload = {
            purchaseOrderId: poId,
            itemIds: itemIds
        };
        return this.api.post('PurchaseOrders/bulk-delete-items', payload);
    }

    updatePOStatus(id: string, status: string, reason?: string): Observable<any> {
        const payload = {
            Id: id,
            Status: status,
            Reason: reason || null
        };
        return this.api.put('PurchaseOrders/UpdateStatus', payload);
    }

    toggleDispatchStatus(id: string): Observable<any> {
        return this.api.put(`PurchaseOrders/${id}/toggle-dispatch`, {});
    }

    getPODataForGRN(poIds: string, grnHeaderId: string | null = null, gatePassNo: string | null = null): Observable<any> {
        let url = `GRN/GetPOData?poIds=${poIds}&`;
        if (grnHeaderId) url += `grnHeaderId=${grnHeaderId}&`;
        if (gatePassNo) url += `gatePassNo=${gatePassNo}`;
        url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;
        return this.api.get(url);
    }

    saveGRN(payload: any): Observable<any> {
        return this.api.post('GRN/Save', payload);
    }

    getCurrentStock(
        sortField: string = '',
        sortOrder: string = '',
        pageIndex: number = 0,
        pageSize: number = 10,
        search: string = '',
        startDate: Date | null = null,
        endDate: Date | null = null,
        warehouseId: string | null = null,
        rackId: string | null = null,
        showPurged: boolean = false,
        branchId: string | null = null
    ): Observable<any> {
        const request: any = {
            sortField,
            sortOrder,
            pageIndex,
            pageSize,
            search,
            warehouseId,
            rackId,
            showPurged,
            branchId
        };

        if (startDate) {
            request.startDate = this.formatDate(startDate);
        }
        if (endDate) {
            request.endDate = this.formatDate(endDate);
        }

        return this.api.get(`stock/current-stock?${this.api.toQueryString(request)}`);
    }

    private formatDate(date: Date): string {
        const d = new Date(date);
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        const year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }

    getGRNPagedList(
        sortField: string = '',
        sortOrder: string = '',
        pageIndex: number = 0,
        pageSize: number = 10,
        search: string = '',
        isQuick: boolean = false,
        branchId: string | null = null
    ): Observable<any> {
        const request = {
            sortField,
            sortOrder,
            pageIndex,
            pageSize,
            search,
            isQuick,
            branchId
        };
        return this.api.get(`grn/grn-list?${this.api.toQueryString(request)}`);
    }

    getPendingPurchaseOrders(): Observable<any[]> {
        return this.api.get<any[]>('PurchaseOrders/pending-pos');
    }

    getPOItemsForGRN(poId: string): Observable<any[]> {
        return this.api.get<any[]>(`PurchaseOrders/po-items/${poId}`);
    }

    getPriceListItems(priceListId: string): Observable<PriceListItemDto[]> {
        return this.api.get<PriceListItemDto[]>(`pricelists/price-list-items/${priceListId}`);
    }

    downloadStockReport(productIds: string[]): Observable<Blob> {
        return this.api.postBlob('Stock/ExportExcel', productIds);
    }

    getGrnPrintData(grnNumber: string): Observable<any> {
        return this.api.get(`GRN/print-data/${grnNumber}`);
    }

    createBulkGrn(data: BulkGrnRequest): Observable<any> {
        return this.api.post('GRN/bulk-create', data);
    }

    quickPurchase(payload: any): Observable<any> {
        return this.api.post('QuickTransaction/quick-purchase', payload);
    }

    quickSale(payload: any): Observable<any> {
        return this.api.post('SaleOrder/save', payload);
    }

    getSuppliers(): Observable<any[]> {
        return this.api.get<any[]>('suppliers/dropdown');
    }

    getCustomers(): Observable<any[]> {
        return this.api.get<any[]>('customers/dropdown');
    }

    getProductById(id: string): Observable<any> {
        return this.api.get<any>(`products/${id}`);
    }

    adjustStock(payload: any): Observable<any> {
        return this.api.post('stock/adjust', payload);
    }

    moveStockToExpiredRack(payload: any): Observable<any> {
        return this.api.post('stock/move-to-expired', payload);
    }

    getDisposedStock(
        sortField: string = '',
        sortOrder: string = '',
        pageIndex: number = 0,
        pageSize: number = 10,
        search: string = '',
        startDate: Date | null = null,
        endDate: Date | null = null,
        warehouseId: string | null = null,
        rackId: string | null = null
    ): Observable<any> {
        const request = {
            sortField,
            sortOrder,
            pageIndex,
            pageSize,
            search,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            warehouseId,
            rackId
        };
        return this.api.get(`stock/disposed-stock?${this.api.toQueryString(request)}`);
    }

    getBatchHistory(
        productId: string,
        warehouseId: string | null,
        rackId: string | null,
        mfgDate?: string | null,
        expDate?: string | null
    ): Observable<any[]> {
        const request = {
            productId,
            warehouseId,
            rackId,
            mfgDate,
            expDate
        };
        return this.api.get<any[]>(`stock/batch-history?${this.api.toQueryString(request)}`);
    }

    getWarehouseStock(
        search: string = '',
        sortField: string = '',
        sortOrder: string = '',
        pageIndex: number = 0,
        pageSize: number = 10,
        productId: string | null = null,
        warehouseId: string | null = null
    ): Observable<any> {
        const request = {
            search,
            sortField,
            sortOrder,
            pageIndex,
            pageSize,
            productId,
            warehouseId
        };
        return this.api.get(`stock/warehouse-stock?${this.api.toQueryString(request)}`);
    }

    syncStock(): Observable<any> {
        return this.api.post('stock/sync', {});
    }

    // --- Stock Transfer Methods ---
    getTransfers(): Observable<any[]> {
        return this.api.get<any[]>('StockTransfer/list');
    }

    createTransfer(request: any): Observable<any> {
        return this.api.post<any>('StockTransfer/create', request);
    }

    getTransferById(id: string): Observable<any> {
        return this.api.get<any>(`StockTransfer/${id}`);
    }
}
