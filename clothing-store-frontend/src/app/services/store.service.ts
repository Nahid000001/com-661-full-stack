// src/app/services/store.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  constructor(private http: HttpClient) { }

  getAllStores(page: number = 1, limit: number = 10): Observable<any> {
    return this.http.get(`${environment.apiUrl}/stores?page=${page}&limit=${limit}`);
  }

  getStoreById(id: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/stores/${id}`);
  }

  createStore(storeData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/stores`, storeData);
  }

  updateStore(id: string, storeData: any): Observable<any> {
    return this.http.put(`${environment.apiUrl}/stores/${id}`, storeData);
  }

  deleteStore(id: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/stores/${id}`);
  }
}