import { Injectable } from '@angular/core';
import { ApiService } from '../../../../shared/api.service';
import { Observable } from 'rxjs';
import { Unit } from '../models/units.model';



@Injectable({ providedIn: 'root' })
export class UnitService {

    constructor(private api: ApiService) { }

    saveBulkUnits(units: any[]): Observable<any> {
        return this.api.post(`units/bulk`, { units });
    }

    update(id: string, payload: Unit): Observable<any> {
        return this.api.put(`units/update/${id}`, payload);
    }

    delete(id: any): Observable<any> {
        return this.api.delete(`units/delete/${id}`);
    }

    // 🔹 Bulk delete (THIS IS WHAT YOU ASKED)
    deleteMany(ids: string[]): Observable<any> {
        return this.api.post<any>(`units/bulk-delete`, ids);
    }

    getAll(): Observable<Unit[]> {
        return this.api.get<Unit[]>('units/get');
    }

    importUnits(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.api.post('units/upload-excel', formData);
    }

    downloadTemplate(): void {
        this.api.getBlob('units/download-template').subscribe((response: any) => {
          const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'Unit_Template.xlsx';
          link.click();
          window.URL.revokeObjectURL(url);
        });
    }

    getById(id: string): Observable<Unit> {
        return this.api.get<Unit>(`units/getbyid/${id}`);
    }
}
