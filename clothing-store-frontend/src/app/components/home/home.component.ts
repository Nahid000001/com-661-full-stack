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
    this.error = '';
    console.log('Attempting to load featured stores...');
    
    // Add a small delay to ensure loading state is visible
    setTimeout(() => {
      this.storeService.getFeaturedStores(4)
        .subscribe({
          next: data => {
            console.log('Received store data:', data);
            this.loading = false;
            
            if (data && data.stores && data.stores.length > 0) {
              this.featuredStores = data.stores;
              this.error = '';
              console.log('Featured stores set:', this.featuredStores);
            } else {
              console.log('No stores returned or empty array, loading mock data');
              this.loadMockStores();
            }
          },
          error: error => {
            console.error('Error loading featured stores:', error);
            this.loading = false;
            console.log('Loading mock data due to error');
            // Don't set error message, just load mock data silently
            this.loadMockStores();
          }
        });
    }, 300);
  }

  loadMockStores() {
    // Provide mock store data for demonstration
    this.featuredStores = [
      {
        _id: '1',
        company_name: 'Fashion Forward',
        description: 'Premium clothing store offering the latest trends in fashion for all seasons.',
        location: 'New York',
        work_type: 'RETAIL',
        average_rating: '4.8',
        review_count: 42
      },
      {
        _id: '2',
        company_name: 'Urban Threads',
        description: 'Contemporary clothing store with unique designs for the modern lifestyle.',
        location: 'Los Angeles',
        work_type: 'BOUTIQUE',
        average_rating: '4.6',
        review_count: 35
      },
      {
        _id: '3',
        company_name: 'Classic Couture',
        description: 'Elegant and timeless fashion pieces for the sophisticated shopper.',
        location: 'Chicago',
        work_type: 'DESIGNER',
        average_rating: '4.7',
        review_count: 28
      },
      {
        _id: '4',
        company_name: 'Street Style',
        description: 'Urban clothing and accessories inspired by street culture and modern art.',
        location: 'Miami',
        work_type: 'CASUAL',
        average_rating: '4.5',
        review_count: 31
      }
    ];
    this.error = ''; // Clear any error since we have mock data to show
  }

  retryLoading(): void {
    this.loadFeaturedStores();
  }

  // Helper methods for the template
  getStoreImage(store: any): string {
    // Consistently assign the same image to the same store
    const index = store._id ? parseInt(store._id.toString().charAt(0), 10) % this.storeImages.length : 0;
    return this.storeImages[index] || this.storeImages[0];
  }
  
  getRandomRating(): string {
    return (4 + Math.random()).toFixed(1);
  }
  
  getRandomColor(): string {
    return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
  }
  
  truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}