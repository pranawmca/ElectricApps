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

@Injectable({
  providedIn: 'root'
})
export class SystemLogService {
  private readonly api = inject(ApiService);
  private readonly baseUrl = environment.api.identity; // Identity service handles logs

  getLogs(level?: string, serviceName?: string, limit: number = 200): Observable<SystemLog[]> {
    let url = `SystemLogs?limit=${limit}`;
    if (level) url += `&level=${level}`;
    if (serviceName) url += `&serviceName=${serviceName}`;
    
    return this.api.get<SystemLog[]>(url, this.baseUrl);
  }

  getServiceNames(): Observable<string[]> {
    return this.api.get<string[]>('SystemLogs/services', this.baseUrl);
  }

  clearLogs(): Observable<string> {
    return this.api.delete<string>('SystemLogs/clear', this.baseUrl);
  }
}
