// src/app/components/store-list/store-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StoreService } from '../../services/store.service';

@Component({
  selector: 'app-store-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './store-list.component.html',
  styleUrls: ['./store-list.component.scss']
})
export class StoreListComponent implements OnInit {
  stores: any[] = [];
  loading = false;
  error = '';
  page = 1;
  limit = 10;
  totalPages = 0;

  constructor(private storeService: StoreService) { }

  ngOnInit() {
    this.loadStores();
  }

  loadStores() {
    this.loading = true;
    this.storeService.getAllStores(this.page, this.limit)
      .subscribe({
        next: data => {
          this.stores = data.stores;
          this.totalPages = data.total_pages;
          this.loading = false;
        },
        error: error => {
          this.error = error.error.message || 'Error loading stores';
          this.loading = false;
        }
      });
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadStores();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadStores();
    }
  }
}