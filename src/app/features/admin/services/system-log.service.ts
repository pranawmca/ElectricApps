import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../shared/api.service';
import { environment } from '../../../enviornments/environment';

export interface SystemLog {
  id: number;
  message: string;
  level: string;
  timeStamp: string;
  exception: string;
  serviceName: string;
  correlationId: string;
}

export interface PaginatedLogs {
  items: SystemLog[];
  totalCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class SystemLogService {
  private readonly api = inject(ApiService);
  private readonly baseUrl = environment.api.identity;

  getLogs(page: number, pageSize: number, level?: string, serviceName?: string, search?: string, sortBy: string = 'TimeStamp', sortOrder: string = 'DESC'): Observable<PaginatedLogs> {
    let url = `SystemLogs?pageNumber=${page}&pageSize=${pageSize}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
    if (level) url += `&level=${level}`;
    if (serviceName) url += `&serviceName=${serviceName}`;
    if (search) url += `&search=${search}`;
    
    return this.api.get<PaginatedLogs>(url, this.baseUrl);
  }

  getServiceNames(): Observable<string[]> {
    return this.api.get<string[]>('SystemLogs/services', this.baseUrl);
  }

  clearLogs(): Observable<string> {
    return this.api.delete<string>('SystemLogs/clear', this.baseUrl);
  }
}
