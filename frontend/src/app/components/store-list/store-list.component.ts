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
  limit = 6;
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
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', // Clothing rack with bright colors
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', // Modern clothing store
    'https://images.unsplash.com/photo-1567401893414-91b2a97e5b52?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', // Person browsing clothes
    'https://images.unsplash.com/photo-1562157873-818bc0726f68?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1654&q=80', // Retail display
    'https://images.unsplash.com/photo-1582719471384-894fbb16e074?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1587&q=80', // Fashion store luxury
    'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', // Boutique interior
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', // Modern clothing on racks
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1587&q=80'  // High end clothing display
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
    
    this.storeService.getAllStores(this.page, this.limit)
      .subscribe({
        next: data => {
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
            this.error = 'No stores found. Please try again later.';
            this.loading = false;
            this.stores = [];
            this.filteredStores = [];
          }
        },
        error: error => {
          console.error('Error loading stores:', error);
          this.error = 'Failed to load stores. Please try again later.';
          this.loading = false;
          this.stores = [];
          this.filteredStores = [];
        }
      });
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
      // Fallback to hash-based selection
      index = this.hashString(store._id) % this.storeImages.length;
    }
    
    return this.storeImages[index] || this.storeImages[0];
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
      case 'LUXURY':
        return 'badge-luxury';
      case 'SUSTAINABLE':
        return 'badge-sustainable';
      default:
        return 'badge-retail';
    }
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