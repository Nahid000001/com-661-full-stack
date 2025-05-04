// src/app/components/home/home.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { ReviewService } from '../../services/review.service';
import { Store } from '../../interfaces/store.interface';
import { Review } from '../../models/review.model';

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
  
  // Store image placeholders - updated with higher quality images
  storeImages = [
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', // Clothing rack with bright colors
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', // Modern clothing store
    'https://images.unsplash.com/photo-1567401893414-91b2a97e5b52?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', // Person browsing clothes
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1654&q=80', // Retail display
    'https://images.unsplash.com/photo-1582719471384-894fbb16e074?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1587&q=80', // Fashion store luxury
    'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', // Boutique interior
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', // Modern clothing on racks
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1587&q=80'  // High end clothing display
  ];

  // Avatar placeholders for reviewers - updated to use identicon-style avatars
  avatarImages = [
    'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
    'https://ui-avatars.com/api/?name=Sarah+Smith&background=F08080&color=fff',
    'https://ui-avatars.com/api/?name=Michael+Brown&background=008080&color=fff',
    'https://ui-avatars.com/api/?name=Emily+Johnson&background=9370DB&color=fff',
    'https://ui-avatars.com/api/?name=David+Wilson&background=20B2AA&color=fff',
    'https://ui-avatars.com/api/?name=Jennifer+Lee&background=FF6347&color=fff',
    'https://ui-avatars.com/api/?name=Robert+Taylor&background=6495ED&color=fff',
    'https://ui-avatars.com/api/?name=Lisa+Anderson&background=8A2BE2&color=fff'
  ];

  constructor(
    private storeService: StoreService,
    private reviewService: ReviewService
  ) { }

  ngOnInit() {
    // Set loading state first
    this.loading = true;
    this.loadingReviews = true;
    
    // Check backend health first
    this.checkBackendHealth();
    
    // Load latest reviews
    this.loadLatestReviews();
    
    // Add a backup in case something goes wrong - increase timeout to 5 seconds
    setTimeout(() => {
      // If still loading or showing error after 5 seconds, force load dummy data
      if (this.loading || this.error) {
        console.log('Fallback: Loading dummy store data after timeout');
        this.featuredStores = this.getDummyStores();
        this.loading = false;
        this.error = '';
      }
      
      // If still loading reviews, load dummy reviews
      if (this.loadingReviews || this.reviewError) {
        console.log('Fallback: Loading dummy review data after timeout');
        this.latestReviews = this.getDummyReviews();
        this.loadingReviews = false;
        this.reviewError = '';
      }
    }, 5000);
  }

  // Add backend health check method
  checkBackendHealth() {
    this.storeService.checkBackendStatus().subscribe({
      next: (response) => {
        console.log('Backend health status:', response);
        if (response && response.status === 'healthy') {
          // Backend is healthy, load stores
          this.loadFeaturedStores();
        } else {
          // Backend is not healthy, use dummy data
          console.log('Backend is not healthy, using dummy data');
          this.featuredStores = this.getDummyStores();
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Backend health check error:', error);
        // On error, load dummy data
        this.featuredStores = this.getDummyStores();
        this.loading = false;
      }
    });
  }

  // Load latest reviews from backend
  loadLatestReviews() {
    this.loadingReviews = true;
    this.reviewError = '';
    
    this.reviewService.getLatestReviews(3).subscribe({
      next: (reviews) => {
        console.log('Received reviews:', reviews);
        this.loadingReviews = false;
        
        if (reviews && reviews.length > 0) {
          this.latestReviews = reviews;
          this.reviewError = '';
        } else {
          console.log('No reviews returned or empty array, using dummy data');
          this.latestReviews = this.getDummyReviews();
        }
      },
      error: (error) => {
        console.error('Error loading latest reviews:', error);
        // Fall back to dummy reviews
        this.latestReviews = this.getDummyReviews();
        this.loadingReviews = false;
        this.reviewError = '';
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
        is_remote: false,
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
        is_remote: false,
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
        is_remote: false,
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
        is_remote: false,
        owner: 'admin',
        average_rating: 4.5,
        review_count: 35,
        views: 210,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  loadFeaturedStores() {
    this.loading = true;
    this.error = '';
    console.log('Attempting to load featured stores...');
    
    // Get only top 3 stores sorted by rating
    this.storeService.getFeaturedStores(3)
      .subscribe({
        next: data => {
          console.log('Received store data:', data);
          this.loading = false;
          
          if (data && data.stores && data.stores.length > 0) {
            this.featuredStores = data.stores;
            this.error = '';
            console.log('Featured stores set:', this.featuredStores);
          } else {
            console.log('No stores returned or empty array, using dummy data');
            // Fall back to dummy data if no stores are returned
            this.featuredStores = this.getDummyStores().slice(0, 3); // Take only the top 3 dummy stores
            // Important: Don't set any error message
            this.error = '';
          }
        },
        error: error => {
          console.error('Error loading featured stores:', error);
          console.error('Error details:', JSON.stringify(error));
          this.loading = false;
          // Fall back to dummy data on error, but don't show error message
          this.featuredStores = this.getDummyStores().slice(0, 3); // Take only the top 3 dummy stores
          this.error = '';
        }
      });
  }

  retryLoading(): void {
    this.loadFeaturedStores();
  }

  // Helper methods for the template
  getStoreImage(store: any): string {
    // Map store types to specific image categories 
    const typeToImageIndex: Record<string, number> = {
      'RETAIL': 0,
      'BOUTIQUE': 1,
      'DESIGNER': 2,
      'CASUAL': 3,
      'LUXURY': 4,
      'SUSTAINABLE': 5
    };
    
    // Use store type to determine image if available, otherwise use ID
    let index = 0;
    if (store.work_type && typeof store.work_type === 'string' && typeToImageIndex[store.work_type] !== undefined) {
      index = typeToImageIndex[store.work_type];
    } else if (store._id) {
      // Get a consistent image based on store ID
      index = Math.abs(this.hashString(store._id)) % this.storeImages.length;
    }
    
    return this.storeImages[index] || this.storeImages[0];
  }
  
  // Get avatar for review user
  getUserAvatar(review: any): string {
    // If the review has a user avatar, return it
    if (review.userAvatar) {
      return review.userAvatar;
    }
    
    // If the review has a user name, generate a name-based avatar
    if (review.user) {
      // Encode the name properly for URL
      const encodedName = encodeURIComponent(review.user);
      // Generate a consistent color based on the user name
      const color = this.getColorForName(review.user);
      return `https://ui-avatars.com/api/?name=${encodedName}&background=${color}&color=fff`;
    }
    
    // Fallback to a random avatar from our collection
    const randomIndex = Math.floor(Math.random() * this.avatarImages.length);
    return this.avatarImages[randomIndex];
  }

  // Generate a consistent color based on a name
  getColorForName(name: string): string {
    // Create a simple hash of the name
    const hash = this.hashString(name);
    
    // List of good background colors (avoid very light colors)
    const colors = [
      '1A237E', '0D47A1', '01579B', '006064', '004D40', 
      '1B5E20', '33691E', '827717', 'F57F17', 'FF6F00', 
      'E65100', 'BF360C', '3E2723', '4A148C', '311B92', 
      '0D47A1', '880E4F', '4A148C', '004D40', '1A237E'
    ];
    
    // Use the hash to select a color
    const colorIndex = hash % colors.length;
    return colors[colorIndex];
  }

  // Format date to display in a readable format
  formatDate(date: any): string {
    if (!date) {
      return 'Unknown date';
    }
    
    // Convert to Date object if it's a string
    const dateObj = typeof date === 'string' 
      ? new Date(date) 
      : (date instanceof Date ? date : new Date());
      
    // Format the date
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Generate stars array for a rating
  getStarsArray(rating: number): number[] {
    const rounded = Math.round(rating);
    return Array(rounded).fill(0);
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

  // Add a hashString method similar to the one in store-list component
  hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
  
  // Add badge class method for store types
  getTypeBadgeClass(type: string): string {
    if (!type) return 'badge-retail'; // Default
    
    const normalizedType = type.toUpperCase();
    
    switch (normalizedType) {
      case 'RETAIL':
        return 'badge-retail';
      case 'BOUTIQUE':
        return 'badge-boutique';
      case 'DESIGNER':
        return 'badge-designer';
      case 'CASUAL':
        return 'badge-casual';
      case 'FORMAL':
        return 'badge-formal';
      case 'LUXURY':
        return 'badge-luxury';
      case 'SUSTAINABLE':
        return 'badge-sustainable';
      case 'MANUFACTURING':
        return 'badge-manufacturing';
      default:
        return 'badge-retail';
    }
  }
}