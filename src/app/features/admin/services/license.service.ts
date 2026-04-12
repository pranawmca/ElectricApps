import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviornments/environment';

export interface SubscriptionInfo {
  id: string;
  companyId: string;
  customerName: string; // Business Name
  planType: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  paymentTxnId: string;
  daysRemaining: number;
}

@Injectable({
  providedIn: 'root'
})
export class LicenseService {
  private apiUrl = `${environment.api.identity}/admin/subscriptions`;

  constructor(private http: HttpClient) { }

  getAllSubscriptions(): Observable<SubscriptionInfo[]> {
    return this.http.get<SubscriptionInfo[]>(this.apiUrl);
  }

  extendSubscription(id: string, days: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/extend`, days);
  }

  makePremium(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/make-premium`, {});
  }

  confirmPayment(paymentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/confirm-payment`, paymentData);
  }

  onboardCustomer(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/onboard`, payload);
  }
}
