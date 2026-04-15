import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/api.service';
import { environment } from '../../../enviornments/environment';

export interface Customer {
    id?: string;
    companyId?: string | null;
    customerName?: string | null;
    customerType?: string | null;
    phone?: string | null;
    email?: string | null;
    gstNumber?: string | null;
    creditLimit?: number | null;
    billingAddress?: any;
    shippingAddress?: any;
    status?: string | null;
    customerStatus?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class customerService {
  private api = inject(ApiService);
  private readonly baseUrl = environment.CustomerApiBaseUrl;

  addCustomer(customer: Customer) {
    return this.api.post<Customer>('Customers', customer, this.baseUrl);
  }

  getAllCustomers(): Observable<Customer[]> {
    return this.api.get<Customer[]>('Customers', this.baseUrl);
  }

  getCustomersLookup(): Observable<any[]> {
    return this.api.get<any[]>('Customers/lookup', this.baseUrl);
  }

  getPaged(request: any): Observable<any> {
    return this.api.post<any>('Customers/paged', request, this.baseUrl);
  }

  getById(id: string): Observable<Customer> {
    return this.api.get<Customer>(`Customers/${id}`, this.baseUrl);
  }

  update(id: string, customer: Customer): Observable<Customer> {
    return this.api.put<Customer>(`Customers/${id}`, customer, this.baseUrl);
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`Customers/${id}`, this.baseUrl);
  }
}

