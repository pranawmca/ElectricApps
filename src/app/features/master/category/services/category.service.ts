import { Injectable } from '@angular/core';
import { ApiService } from '../../../../shared/api.service';
import { Observable } from 'rxjs';
import { Category } from '../models/category.model';
import { HttpParams } from '@angular/common/http';
import { GridRequest } from '../../../../shared/models/grid-request.model';
import { GridResponse } from '../../../../shared/models/grid-response.model';
import { CategoryGridDto } from '../models/category-grid-response.model';


@Injectable({ providedIn: 'root' })
export class CategoryService {

    constructor(private api: ApiService) { }

    create(payload: Category): Observable<any> {
        console.log('payload', payload)
        return this.api.post('categories', payload);
    }

    update(id: string, payload: Category): Observable<any> {
        return this.api.put(`categories/${id}`, payload);
    }

    delete(id: any): Observable<any> {
        return this.api.delete(`categories/${id}`);
    }

    // 🔹 Bulk delete (THIS IS WHAT YOU ASKED)
    deleteMany(ids: string[]): Observable<any> {
        return this.api.post<any>(`categories/bulk-delete`, ids);
    }

    getAll(): Observable<Category[]> {
        return this.api.get('categories');
    }



    getPaged(request: GridRequest): Observable<GridResponse<CategoryGridDto>> {
        return this.api.post<GridResponse<CategoryGridDto>>(
            `categories/paged`, request
        );
    }

    getById(id: string): Observable<Category> {
        return this.api.get<Category>(`categories/${id}`);
    }


    uploadExcel(file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        return this.api.post(`categories/upload-excel`, formData);
    }

    downloadTemplate(): Observable<Blob> {
        return this.api.getBlob('categories/download-template');
    }

    checkDuplicate(name: string, id: string | null = null): Observable<{ exists: boolean, message: string }> {
        let url = `categories/check-duplicate?name=${encodeURIComponent(name)}`;
        if (id) {
            url += `&excludeId=${id}`;
        }
        return this.api.get<{ exists: boolean, message: string }>(url);
    }
}
