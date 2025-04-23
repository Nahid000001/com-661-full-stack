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
  colorPalette = [
    '#1a237e', // Primary dark
    '#534bae', // Primary light
    '#f50057', // Secondary
    '#4caf50', // Success
    '#ff9800', // Warning
    '#607d8b'  // Neutral
  ];
  
  // Store image placeholders - same as in store-list component
  storeImages = [
    'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1542060748-10c28b62716f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80'
  ];

  constructor(private storeService: StoreService) { }

  ngOnInit() {
    this.loadFeaturedStores();
  }

  loadFeaturedStores() {
    this.loading = true;
    console.log('Attempting to load featured stores...');
    
    this.storeService.getAllStores(1, 4)
      .subscribe({
        next: data => {
          console.log('Received store data:', data);
          if (data && data.stores) {
            this.featuredStores = data.stores;
            console.log('Featured stores set:', this.featuredStores);
          } else {
            console.error('Unexpected data structure:', data);
            this.error = 'Invalid data format received from server';
          }
          this.loading = false;
        },
        error: error => {
          console.error('Error loading stores:', error);
          this.error = error.error?.message || 'Error loading featured stores';
          this.loading = false;
        }
      });
  }

  retryLoading(): void {
    this.error = '';
    this.loadFeaturedStores();
  }

  getRandomColor(): string {
    const randomIndex = Math.floor(Math.random() * this.colorPalette.length);
    return this.colorPalette[randomIndex];
  }

  getStoreInitial(name: string): string {
    if (!name) return '';
    return name.charAt(0).toUpperCase();
  }

  getRandomRating(): string {
    // Generate a random rating between 3.5 and 5.0
    const rating = (Math.random() * 1.5 + 3.5).toFixed(1);
    return rating;
  }
  
  // Method to generate random dates for reviews
  getRandomDate(): Date {
    // Generate a random date between 1 and 30 days ago
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  }
  
  // New method to get store image based on store data
  getStoreImage(store: any): string {
    // If we had actual store images, we would use them here
    // For now, we'll use a hash function to consistently select an image based on store ID or name
    if (!store) return this.storeImages[0];
    
    const hash = this.hashString(store._id || store.company_name);
    const index = hash % this.storeImages.length;
    return this.storeImages[index >= 0 ? index : 0];
  }

  // Hash function to consistently map store IDs to images
  hashString(str: string): number {
    if (!str) return 0;
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }
  
  // Method to truncate text for consistent store descriptions
  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  }
}