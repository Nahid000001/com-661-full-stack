// src/app/components/store-data-test/store-data-test.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { Store } from '../../interfaces/store.interface';

@Component({
  selector: 'app-store-data-test',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './store-data-test.component.html',
  styleUrls: ['./store-data-test.component.scss']
})
export class StoreDataTestComponent implements OnInit {
  stores: Store[] = [];
  loading = false;
  error: string | null = null;

  constructor(private storeService: StoreService) { }

  ngOnInit(): void {
    this.testStoreData();
  }

  testStoreData(): void {
    this.loading = true;
    this.error = null;
    
    this.storeService.getAllStores()
      .subscribe({
        next: (response) => {
          this.stores = response.stores;
          this.loading = false;
        },
        error: (error) => {
          this.error = error.message || 'Error loading store data';
          this.loading = false;
        }
      });
  }

  retry(): void {
    this.testStoreData();
  }
} 