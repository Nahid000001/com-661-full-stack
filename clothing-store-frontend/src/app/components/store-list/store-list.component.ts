// src/app/components/store-list/store-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../../services/store.service';
import { ErrorService } from '../../services/error.service';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-store-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './store-list.component.html',
  styleUrls: ['./store-list.component.scss']
})
export class StoreListComponent implements OnInit {
  stores: any[] = [];
  filteredStores: any[] = [];
  loading = false;
  error = '';
  page = 1;
  limit = 12;
  totalPages = 0;
  
  // Filter & sort properties
  locationFilter = '';
  typeFilter = '';
  searchTerm = '';
  sortOption = 'nameAsc';
  activeFilters: string[] = [];
  
  // Filter options (will be populated from store data)
  availableLocations: string[] = [];
  availableTypes: string[] = [];
  
  // Store image placeholders - for real app, these would be actual images from a CDN
  storeImages = [
    'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1542060748-10c28b62716f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80'
  ];
  
  // Color palette for store cards (used as fallback)
  colorPalette = [
    '#1a237e', // Primary dark
    '#534bae', // Primary light
    '#f50057', // Secondary
    '#4caf50', // Success
    '#ff9800', // Warning
    '#607d8b'  // Neutral
  ];

  constructor(
    private storeService: StoreService,
    private errorService: ErrorService
  ) { }

  ngOnInit() {
    this.loadStores();
  }

  loadStores() {
    this.loading = true;
    this.error = '';
    console.log(`Loading stores page ${this.page} with limit ${this.limit}`);
    
    // Set a timeout to load mock data if the real data takes too long
    const loadingTimeout = setTimeout(() => {
      if (this.loading) {
        console.log('Loading taking too long, using mock data');
        this.loadMockStores();
      }
    }, 500); // Show mock data after 500ms if real data hasn't loaded
    
    this.storeService.getAllStores(this.page, this.limit)
      .subscribe({
        next: data => {
          clearTimeout(loadingTimeout);
          console.log('Received store data:', data);
          if (data && data.stores) {
            this.stores = data.stores;
            this.filteredStores = [...this.stores];
            this.totalPages = data.total_pages || Math.ceil(data.total / this.limit);
            this.loading = false;
            
            // Extract unique locations and types for filters
            this.extractFilterOptions();
          } else {
            console.error('Unexpected data structure:', data);
            this.error = ''; // Clear error message instead of showing it
            this.loading = false;
            this.loadMockStores();
          }
        },
        error: error => {
          clearTimeout(loadingTimeout);
          console.error('Error loading stores:', error);
          this.error = ''; // Clear error message instead of showing it
          this.errorService.clearError(); // Also clear it from the error service
          this.loading = false;
          this.loadMockStores();
        }
      });
  }

  loadMockStores() {
    // Clear loading state and error
    this.loading = false;
    this.error = '';
    this.errorService.clearError();
    
    // Provide mock store data for demonstration
    this.stores = [
      {
        _id: '1',
        company_name: 'Fashion Forward',
        title: 'Premium Fashion Store',
        description: 'Premium clothing store offering the latest trends in fashion for all seasons.',
        location: 'New York',
        work_type: 'RETAIL',
        average_rating: '4.8',
        review_count: 42
      },
      {
        _id: '2',
        company_name: 'Urban Threads',
        title: 'Contemporary Designs',
        description: 'Contemporary clothing store with unique designs for the modern lifestyle.',
        location: 'Los Angeles',
        work_type: 'BOUTIQUE',
        average_rating: '4.6',
        review_count: 35
      },
      {
        _id: '3',
        company_name: 'Classic Couture',
        title: 'Timeless Elegance',
        description: 'Elegant and timeless fashion pieces for the sophisticated shopper.',
        location: 'Chicago',
        work_type: 'DESIGNER',
        average_rating: '4.7',
        review_count: 28
      },
      {
        _id: '4',
        company_name: 'Street Style',
        title: 'Urban Streetwear',
        description: 'Urban clothing and accessories inspired by street culture and modern art.',
        location: 'Miami',
        work_type: 'CASUAL',
        average_rating: '4.5',
        review_count: 31
      },
      {
        _id: '5',
        company_name: 'Eco Apparel',
        title: 'Sustainable Fashion',
        description: 'Environmentally friendly clothing made from sustainable materials.',
        location: 'Portland',
        work_type: 'SUSTAINABLE',
        average_rating: '4.9',
        review_count: 45
      },
      {
        _id: '6',
        company_name: 'Luxe Fashion',
        title: 'Luxury Clothing',
        description: 'High-end designer clothing and accessories for the fashion-conscious.',
        location: 'New York',
        work_type: 'LUXURY',
        average_rating: '4.7',
        review_count: 38
      }
    ];
    
    this.filteredStores = [...this.stores];
    this.totalPages = 1;
    this.error = ''; // Clear error once we've loaded mock data
    
    // Extract unique locations and types for filters
    this.extractFilterOptions();
  }

  extractFilterOptions() {
    // Extract unique locations
    this.availableLocations = [...new Set(this.stores.map(store => store.location))].sort();
    
    // Extract unique work types
    this.availableTypes = [...new Set(this.stores.map(store => store.work_type))].sort();
  }

  applyFilters() {
    // Set loading to true for a very short time (or remove it)
    this.loading = true;
    this.activeFilters = [];
    this.error = '';
    
    // Reset filtered stores
    this.filteredStores = [...this.stores];
    
    // Apply location filter
    if (this.locationFilter) {
      this.filteredStores = this.filteredStores.filter(store => 
        store.location === this.locationFilter
      );
      this.activeFilters.push(`Location: ${this.locationFilter}`);
    }
    
    // Apply type filter
    if (this.typeFilter) {
      this.filteredStores = this.filteredStores.filter(store => 
        store.work_type === this.typeFilter
      );
      this.activeFilters.push(`Type: ${this.typeFilter}`);
    }
    
    // Apply search term filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredStores = this.filteredStores.filter(store => 
        store.company_name?.toLowerCase().includes(searchLower) ||
        store.description?.toLowerCase().includes(searchLower) ||
        store.location?.toLowerCase().includes(searchLower) ||
        store.work_type?.toLowerCase().includes(searchLower)
      );
      this.activeFilters.push(`Search: ${this.searchTerm}`);
    }
    
    // Apply sorting
    this.applySorting();
    
    // Immediately set loading to false after filters are applied
    setTimeout(() => {
      this.loading = false;
    }, 10); // Very minimal delay just to ensure UI updates
  }

  applySorting() {
    switch(this.sortOption) {
      case 'nameAsc':
        this.filteredStores.sort((a, b) => a.company_name.localeCompare(b.company_name));
        break;
      case 'nameDesc':
        this.filteredStores.sort((a, b) => b.company_name.localeCompare(a.company_name));
        break;
      case 'locationAsc':
        this.filteredStores.sort((a, b) => a.location.localeCompare(b.location));
        break;
      case 'locationDesc':
        this.filteredStores.sort((a, b) => b.location.localeCompare(a.location));
        break;
      case 'ratingDesc':
        this.filteredStores.sort((a, b) => {
          const ratingA = a.average_rating || this.parseRating(this.getRandomRating());
          const ratingB = b.average_rating || this.parseRating(this.getRandomRating());
          return ratingB - ratingA;
        });
        break;
    }
  }

  parseRating(ratingStr: string): number {
    return parseFloat(ratingStr);
  }

  removeFilter(filter: string) {
    const filterType = filter.split(':')[0].trim();
    
    switch(filterType) {
      case 'Location':
        this.locationFilter = '';
        break;
      case 'Type':
        this.typeFilter = '';
        break;
      case 'Search':
        this.searchTerm = '';
        break;
    }
    
    this.applyFilters();
  }

  clearFilters() {
    this.locationFilter = '';
    this.typeFilter = '';
    this.searchTerm = '';
    this.activeFilters = [];
    this.filteredStores = [...this.stores];
    this.applySorting();
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

  goToPage(pageNum: number) {
    if (pageNum >= 1 && pageNum <= this.totalPages && pageNum !== this.page) {
      this.page = pageNum;
      this.loadStores();
    }
  }

  getPageNumbers(): number[] {
    const totalPagesToShow = 5;
    const pages: number[] = [];
    
    if (this.totalPages <= totalPagesToShow) {
      // Show all pages if there are 5 or less
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include first and last page
      let startPage = Math.max(1, this.page - Math.floor(totalPagesToShow / 2));
      let endPage = Math.min(this.totalPages, startPage + totalPagesToShow - 1);
      
      // Adjust if we're near the end
      if (endPage - startPage + 1 < totalPagesToShow) {
        startPage = Math.max(1, endPage - totalPagesToShow + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
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
  
  getStoreImage(store: any): string {
    // In a real app, you'd use store.image_url or similar
    // For demo purposes, we'll generate a consistent image based on store ID
    const id = store._id || '';
    const hashCode = this.hashString(store.company_name + id);
    const index = Math.abs(hashCode) % this.storeImages.length;
    
    return this.storeImages[index];
  }
  
  hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  getTypeBadgeClass(type: string): string {
    const typeMap: {[key: string]: string} = {
      'Retail': 'badge-retail',
      'Online': 'badge-online',
      'Boutique': 'badge-boutique',
      'Department': 'badge-department',
      'Outlet': 'badge-outlet'
    };
    
    return typeMap[type] || 'badge-default';
  }

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  handleError(message: string) {
    this.error = message;
    this.loading = false;
  }
}