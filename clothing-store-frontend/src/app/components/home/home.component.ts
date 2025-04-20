// src/app/components/home/home.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  featuredStores: any[] = [];
  loading = false;
  error = '';

  constructor(private storeService: StoreService) { }

  ngOnInit() {
    this.loadFeaturedStores();
  }

  loadFeaturedStores() {
    this.loading = true;
    this.storeService.getAllStores(1, 4) // Get first 4 stores for featured section
      .subscribe({
        next: data => {
          this.featuredStores = data.stores;
          this.loading = false;
        },
        error: error => {
          this.error = error.error.message || 'Error loading featured stores';
          this.loading = false;
        }
      });
  }
}