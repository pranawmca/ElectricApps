import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../enviornments/environment';

@Injectable({
    providedIn: 'root'
})
export class FinanceService {
    private supplierApi = `${environment.api.supplier}/finance`;
    private customerApi = `${environment.api.customer}/finance`;
    private inventoryApi = `${environment.api.inventory}`;

    constructor(private http: HttpClient) { }

    // Supplier Methods
    getSupplierLedger(request: any): Observable<any> {
        return this.http.post(`${this.supplierApi}/ledger`, request);
    }

    recordSupplierPayment(payment: any): Observable<any> {
        return this.http.post(`${this.supplierApi}/payment-entry`, payment);
    }

    getPendingDues(branchId?: string | null): Observable<any[]> {
        const url = branchId ? `${this.supplierApi}/pending-dues?branchId=${branchId}` : `${this.supplierApi}/pending-dues`;
        return this.http.get<any[]>(url).pipe(
            map(dues => {
                if (!Array.isArray(dues)) return [];
                return dues.map(d => ({
                    supplierId: d.supplierId || d.SupplierId,
                    supplierName: d.supplierName || d.SupplierName,
                    pendingAmount: d.pendingAmount || d.PendingAmount,
                    status: d.status || d.Status,
                    dueDate: d.dueDate || d.DueDate,
                    lastReferenceId: d.lastReferenceId || d.LastReferenceId
                }));
            })
        );
    }

    getPaymentsReport(request: any, branchId?: string | null): Observable<any> {
        const payload = { ...request };
        if (branchId) payload.branchId = branchId;
        return this.http.post<any>(`${this.supplierApi}/payments-report`, payload);
    }

    checkDuplicateReference(reference: string): Observable<boolean> {
        if (!reference || reference.trim().length === 0) return new Observable(obs => obs.next(false));

        const request = {
            searchTerm: reference.trim(),
            pageNumber: 1,
            pageSize: 10, // Small page size is enough
            sortBy: 'Date',
            sortOrder: 'desc'
        };

        return this.getPaymentsReport(request).pipe(
            map((res: any) => {
                const items = res?.items?.items || res?.items || [];
                // Exact match check (case insensitive)
                return items.some((item: any) =>
                    (item.referenceNumber || item.ReferenceNumber || '').toLowerCase() === reference.trim().toLowerCase()
                );
            })
        );
    }

    // Customer Methods
    getCustomerLedger(request: any): Observable<any> {
        return this.http.post(`${this.customerApi}/ledger`, request);
    }

    recordCustomerReceipt(receipt: any): Observable<any> {
        return this.http.post(`${this.customerApi}/receipt`, receipt);
    }

    recordBulkCustomerReceipts(receipts: any[]): Observable<any> {
        return this.http.post(`${this.customerApi}/bulk-receipts`, { receipts: receipts });
    }

    getOutstandingTracker(request: any): Observable<any> {
        return this.http.post(`${this.customerApi}/outstanding`, request);
    }

    getTotalReceivables(branchId?: string | null, companyId?: string | null): Observable<any> {
        let url = `${this.customerApi}/outstanding-total?`;
        if (branchId) url += `branchId=${branchId}&`;
        if (companyId) url += `companyId=${companyId}`;
        url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;
        return this.http.get(url);
    }

    getTotalPayables(branchId?: string | null, companyId?: string | null): Observable<any> {
        let url = `${this.supplierApi}/pending-total?`;
        if (branchId) url += `branchId=${branchId}&`;
        if (companyId) url += `companyId=${companyId}`;
        url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;
        return this.http.get(url);
    }

    getPendingCustomerDues(branchId?: string | null): Observable<any[]> {
        const url = branchId ? `${this.customerApi}/pending-dues?branchId=${branchId}` : `${this.customerApi}/pending-dues`;
        return this.http.get<any[]>(url).pipe(
            map(dues => {
                if (!Array.isArray(dues)) return [];
                return dues.map(d => ({
                    customerId: d.customerId || d.CustomerId,
                    customerName: d.customerName || d.CustomerName,
                    phone: d.phone || d.Phone || '',  // ← WhatsApp ke liye zaruri!
                    pendingAmount: d.pendingAmount || d.PendingAmount,
                    status: d.status || d.Status,
                    dueDate: d.dueDate || d.DueDate,
                    lastReferenceId: d.lastReferenceId || d.LastReferenceId
                }));
            })
        );
    }

    getReceiptsReport(request: any, branchId?: string | null): Observable<any> {
        const payload = { ...request };
        if (branchId) payload.branchId = branchId;
        return this.http.post<any>(`${this.customerApi}/receipts-report`, payload);
    }

    sendDuesSms(smsData: any): Observable<any> {
        return this.http.post(`${this.customerApi}/send-dues-sms`, smsData);
    }

    // P&L Methods
    getProfitAndLossReport(filters: any): Observable<any> {
        // We aggregate data from Suppliers (Payments), Customers (Income/Receipts), and Inventory (General Expenses)
        const paymentReq = this.http.post<any>(`${this.supplierApi}/total-payments`, filters);
        const receiptReq = this.http.post<any>(`${this.customerApi}/total-receipts`, filters);
        const expensesReq = this.http.post<any[]>(`${this.inventoryApi}/expense-entries/chart-data`, filters);
        
        const purchaseParams = {
            pageIndex: 0,
            pageSize: 2000,
            fromDate: filters.startDate,
            toDate: filters.endDate,
            branchId: filters.branchId
        };
        const purchaseReq = this.http.post<any>(`${this.inventoryApi}/PurchaseOrders/get-paged-orders`, purchaseParams);
        
        let saleUrl = `${this.inventoryApi}/saleorder?pageNumber=1&pageSize=2000&startDate=${filters.startDate}&endDate=${filters.endDate}`;
        if (filters.branchId) {
            saleUrl += `&branchId=${filters.branchId}`;
        }
        const saleReq = this.http.get<any>(saleUrl);

        return forkJoin([paymentReq, receiptReq, expensesReq, purchaseReq, saleReq]).pipe(
            map(([paymentRes, receiptRes, expensesRes, purchaseRes, saleRes]) => {
                const supplierPayments = paymentRes.totalPayments || paymentRes.TotalPayments || 0;
                const totalReceipts = receiptRes.totalReceipts || receiptRes.TotalReceipts || 0;
                const generalExpenses = Array.isArray(expensesRes) ? expensesRes.reduce((sum, e) => sum + (e.amount || e.Amount || 0), 0) : 0;
                
                const purchaseItems = purchaseRes.data || purchaseRes.items || purchaseRes.Items || purchaseRes.Data || [];
                const totalPurchases = purchaseItems.reduce((sum: number, p: any) => sum + (p.grandTotal || p.GrandTotal || 0), 0);

                const saleItems = saleRes.data || saleRes.items || saleRes.Items || saleRes.Data || [];
                const totalSales = saleItems.reduce((sum: number, s: any) => sum + (s.grandTotal || s.GrandTotal || 0), 0);

                return {
                    totalIncome: totalReceipts,
                    totalExpenses: supplierPayments + generalExpenses,
                    totalPurchases,
                    totalSales
                };
            })
        );
    }

    // Expense Category Methods
    getExpenseCategories(): Observable<any[]> {
        return this.http.get<any[]>(`${this.inventoryApi}/expense-categories`);
    }

    createExpenseCategory(category: any): Observable<any> {
        return this.http.post(`${this.inventoryApi}/expense-categories`, category);
    }

    updateExpenseCategory(id: string, category: any): Observable<any> {
        return this.http.put(`${this.inventoryApi}/expense-categories/${id}`, category);
    }

    deleteExpenseCategory(id: string): Observable<any> {
        return this.http.delete(`${this.inventoryApi}/expense-categories/${id}`);
    }

    // Expense Entry Methods
    getExpenseEntries(pageNumber: number = 1, pageSize: number = 50, search: string = '', branchId?: string | null): Observable<any> {
        let url = `${this.inventoryApi}/expense-entries?pageNumber=${pageNumber}&pageSize=${pageSize}&search=${search}`;
        if (branchId) url += `&branchId=${branchId}`;
        return this.http.get<any>(url);
    }

    createExpenseEntry(entry: any): Observable<any> {
        return this.http.post(`${this.inventoryApi}/expense-entries`, entry);
    }

    updateExpenseEntry(id: string, entry: any): Observable<any> {
        return this.http.put(`${this.inventoryApi}/expense-entries/${id}`, entry);
    }

    deleteExpenseEntry(id: string): Observable<any> {
        return this.http.delete(`${this.inventoryApi}/expense-entries/${id}`);
    }

    getPurchaseOrders(filters: any): Observable<any> {
        const purchaseParams = {
            pageIndex: 0,
            pageSize: 5000,
            fromDate: filters.startDate,
            toDate: filters.endDate
        };
        return this.http.post<any>(`${this.inventoryApi}/PurchaseOrders/get-paged-orders`, purchaseParams);
    }

    getExpenseChartData(filters: any = {}): Observable<any[]> {
        return this.http.post<any[]>(`${this.inventoryApi}/expense-entries/chart-data`, filters);
    }

    getMonthlyTrends(months: number = 6, branchId?: string | null): Observable<any> {
        const query = branchId ? `?months=${months}&branchId=${branchId}` : `?months=${months}`;
        const receiptsReq = this.http.get<any[]>(`${this.customerApi}/monthly-receipts${query}`);
        const paymentsReq = this.http.get<any[]>(`${this.supplierApi}/monthly-payments${query}`);
        const expensesReq = this.http.get<any[]>(`${this.inventoryApi}/expense-entries/monthly-totals${query}`);

        return forkJoin([receiptsReq, paymentsReq, expensesReq]).pipe(
            map(([receipts, payments, expenses]) => {
                // Return unified data
                return {
                    receipts,
                    payments,
                    expenses
                };
            })
        );
    }
}
