// src/app/components/home/home.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { ReviewService } from '../../services/review.service';
import { Store } from '../../interfaces/store.interface';
import { Review } from '../../models/review.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  featuredStores: any[] = [];
  latestReviews: any[] = [];
  loading = false;
  loadingReviews = false;
  error = '';
  reviewError = '';
  colorPalette = [
    '#1a237e', // Primary dark
    '#534bae', // Primary light
    '#f50057', // Secondary
    '#4caf50', // Success
    '#ff9800', // Warning
    '#607d8b'  // Neutral
  ];
  
  // Optimized store image placeholders - using smaller, compressed images
  storeImages = [
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1567401893414-91b2a97e5b52?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1582719471384-894fbb16e074?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=60'
  ];

  // Simplified avatars to reduce image loading
  avatarImages = [
    'https://ui-avatars.com/api/?name=J+D&background=0D8ABC&color=fff&size=64',
    'https://ui-avatars.com/api/?name=S+S&background=F08080&color=fff&size=64',
    'https://ui-avatars.com/api/?name=M+B&background=008080&color=fff&size=64',
    'https://ui-avatars.com/api/?name=E+J&background=9370DB&color=fff&size=64',
    'https://ui-avatars.com/api/?name=D+W&background=20B2AA&color=fff&size=64',
    'https://ui-avatars.com/api/?name=J+L&background=FF6347&color=fff&size=64',
    'https://ui-avatars.com/api/?name=R+T&background=6495ED&color=fff&size=64',
    'https://ui-avatars.com/api/?name=L+A&background=8A2BE2&color=fff&size=64'
  ];

  // Preload dummy data to prevent empty UI during loading
  private dummyStores = this.getDummyStores();
  private dummyReviews = this.getDummyReviews();

  constructor(
    private storeService: StoreService,
    private reviewService: ReviewService
  ) {
    // Initialize with dummy data immediately to prevent blank page
    this.featuredStores = this.dummyStores;
    this.latestReviews = this.dummyReviews;
  }

  ngOnInit() {
    // Start with dummy data already loaded, then set loading state
    this.loading = true;
    this.loadingReviews = true;
    
    // Load real data in parallel to replace dummy data
    this.loadPageData();
    
    // Reduce fallback timeout from 5s to 3s
    setTimeout(() => {
      if (this.loading || this.error) {
        console.log('Fallback: Loading dummy store data after timeout');
        this.featuredStores = this.dummyStores;
        this.loading = false;
        this.error = '';
      }
      
      if (this.loadingReviews || this.reviewError) {
        console.log('Fallback: Loading dummy review data after timeout');
        this.latestReviews = this.dummyReviews;
        this.loadingReviews = false;
        this.reviewError = '';
      }
    }, 3000);
  }

  // Load all data in parallel
  loadPageData() {
    // Use forkJoin to run requests in parallel
    forkJoin({
      health: this.storeService.checkBackendStatus().pipe(catchError(err => of({ status: 'error' }))),
      stores: this.storeService.getFeaturedStores(3).pipe(catchError(err => of({ stores: [] }))),
      reviews: this.reviewService.getLatestReviews(3).pipe(catchError(err => of([])))
    }).subscribe({
      next: (results) => {
        // Process stores
        if (results.stores && results.stores.stores && results.stores.stores.length > 0) {
          this.featuredStores = results.stores.stores;
        }
        this.loading = false;
        
        // Process reviews
        if (results.reviews && results.reviews.length > 0) {
          this.latestReviews = results.reviews;
        }
        this.loadingReviews = false;
      },
      error: (error) => {
        console.error('Error loading page data:', error);
        // Fallback to dummy data on error
        this.featuredStores = this.dummyStores;
        this.latestReviews = this.dummyReviews;
        this.loading = false;
        this.loadingReviews = false;
      }
    });
  }

  // Get dummy reviews when no real reviews are available
  getDummyReviews(): any[] {
    return [
      {
        review_id: 'review1',
        user: 'Emma Johnson',
        rating: 5,
        comment: 'Great selection of clothing with excellent customer service. Will definitely shop here again!',
        created_at: new Date(2023, 5, 15),
        store_id: 'dummy1',
        store_name: 'Urban Threads'
      },
      {
        review_id: 'review2',
        user: 'Michael Smith',
        rating: 5,
        comment: 'Loved the variety of styles available. Found exactly what I was looking for at a reasonable price.',
        created_at: new Date(2023, 5, 10),
        store_id: 'dummy2',
        store_name: 'Fashion Forward'
      },
      {
        review_id: 'review3',
        user: 'Sophia Martinez',
        rating: 5,
        comment: 'One of my favourite stores! The sustainable practices of this store are impressive. Great quality products that last a long time.',
        created_at: new Date(2023, 5, 5),
        store_id: 'dummy3',
        store_name: 'MhN Fashion Hub'
      }
    ];
  }

  // Add method to provide dummy store data when no stores are available in the database
  getDummyStores(): Store[] {
    return [
      {
        _id: 'dummy1',
        company_name: 'Fashion Elite',
        title: 'Premium Fashion Outlet',
        description: 'Designer clothing and accessories for fashion enthusiasts. We offer the latest trends in high-end fashion.',
        location: 'New York',
        work_type: 'retail',
        owner: 'admin',
        average_rating: 4.7,
        review_count: 42,
        views: 250,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        _id: 'dummy2',
        company_name: 'Urban Threads',
        title: 'Contemporary Urban Wear',
        description: 'Streetwear and casual fashion for the modern lifestyle. Featuring urban designs and comfortable everyday wear.',
        location: 'Los Angeles',
        work_type: 'retail',
        owner: 'admin',
        average_rating: 4.3,
        review_count: 28,
        views: 185,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        _id: 'dummy3',
        company_name: 'Eco Apparel',
        title: 'Sustainable Fashion',
        description: 'Eco-friendly clothing made from sustainable materials. Making a positive impact on the planet with ethical fashion.',
        location: 'Portland',
        work_type: 'manufacturing',
        owner: 'admin',
        average_rating: 4.9,
        review_count: 17,
        views: 120,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        _id: 'dummy4',
        company_name: 'Vintage Revival',
        title: 'Classic Fashion Reimagined',
        description: 'Vintage-inspired clothing with a modern twist. Rediscover timeless fashion trends updated for today.',
        location: 'Chicago',
        work_type: 'retail',
        owner: 'admin',
        average_rating: 4.5,
        review_count: 35,
        views: 210,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  // Simplified and memoized methods
  // Store image cache
  private imageCache: Record<string, string> = {};
  
  getStoreImage(store: any): string {
    const storeId = store._id || '';
    
    // Return from cache if already computed
    if (this.imageCache[storeId]) {
      return this.imageCache[storeId];
    }
    
    // Otherwise compute and cache
    const index = this.hashString(storeId || store.company_name || '') % this.storeImages.length;
    this.imageCache[storeId] = this.storeImages[index];
    return this.imageCache[storeId];
  }

  // Avatar cache
  private avatarCache: Record<string, string> = {};
  
  getUserAvatar(review: any): string {
    const userId = review.user_id || review.user || '';
    
    // Return from cache if already computed
    if (this.avatarCache[userId]) {
      return this.avatarCache[userId];
    }
    
    // Otherwise compute and cache
    const index = this.hashString(userId) % this.avatarImages.length;
    this.avatarCache[userId] = this.avatarImages[index];
    return this.avatarCache[userId];
  }

  // Other UI helper methods
  getColorForName(name: string): string {
    return this.colorPalette[this.hashString(name) % this.colorPalette.length];
  }

  formatDate(date: any): string {
    if (!date) return 'Unknown date';
    const d = new Date(date);
    return d.toLocaleDateString();
  }

  getStarsArray(rating: number): number[] {
    return Array(Math.round(rating)).fill(0);
  }

  getRandomRating(): string {
    return (4 + Math.random()).toFixed(1);
  }

  getRandomColor(): string {
    return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
  }

  truncateText(text: string, maxLength: number): string {
    return text?.length > maxLength ? text.substring(0, maxLength) + '...' : text || '';
  }

  hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Add the missing retryLoading method
  retryLoading(): void {
    this.error = '';
    this.loading = true;
    this.loadingReviews = true;
    this.loadPageData();
  }

  getTypeBadgeClass(type: string): string {
    switch (type?.toLowerCase()) {
      case 'retail': return 'badge-primary';
      case 'manufacturing': return 'badge-secondary';
      case 'wholesale': return 'badge-success';
      case 'online': return 'badge-info';
      default: return 'badge-dark';
    }
  }
}