import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StoreService } from '../../../services/store.service';
import { Store } from '../../../interfaces/store.interface';

@Component({
  selector: 'app-admin-stores',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './admin-stores.component.html',
  styleUrls: ['./admin-stores.component.scss']
})
export class AdminStoresComponent implements OnInit {
  stores: Store[] = [];
  loading = true;
  error = '';

  constructor(private storeService: StoreService) { }

  ngOnInit(): void {
    this.loadStores();
  }

  loadStores(): void {
    this.loading = true;
    this.storeService.getAllStores(1, 100).subscribe({
      next: (response) => {
        this.stores = response.stores;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load stores';
        this.loading = false;
        console.error('Error loading stores:', err);
      }
    });
  }

  deleteStore(id: string): void {
    if (confirm('Are you sure you want to delete this store? This action cannot be undone.')) {
      this.storeService.deleteStore(id).subscribe({
        next: () => {
          this.stores = this.stores.filter(store => store._id !== id);
        },
        error: (err) => {
          console.error('Error deleting store:', err);
          alert('Failed to delete store. Please try again.');
        }
      });
    }
  }
} 