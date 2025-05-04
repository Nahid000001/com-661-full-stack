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
  
  // Store images - fixed images for specific store types
  storeImagesByType: {[key: string]: string} = {
    'RETAIL': 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80', 
    'BOUTIQUE': 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'DESIGNER': 'https://images.unsplash.com/photo-1567401893414-91b2a97e5b52?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'CASUAL': 'https://images.unsplash.com/photo-1562157873-818bc0726f68?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1654&q=80',
    'LUXURY': 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1587&q=80',
    'SUSTAINABLE': 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
  };
  
  // Images for specific stores - mapped by company name with unique images for each store
  storeImagesByName: {[key: string]: string} = {
    'MhN Fashion Hub': 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
    'Beach Boutique': 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
    'Urban Threads': 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'Fashion Forward': 'https://images.unsplash.com/photo-1560243563-062bfc001d68?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'Chic Boutique': 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'Trendy Threads': 'https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80',
    'Modern Wardrobe': 'https://images.unsplash.com/photo-1623288516140-b768acc319a3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1459&q=80',
    'Style Studio': 'https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'Elite Fashion': 'https://images.unsplash.com/photo-1567401893414-91b2a97e5b52?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'Luxury Attire': 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1587&q=80',
    'Eco Clothing': 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1064&q=80',
    'London Outfitters': 'https://images.unsplash.com/photo-1559664367-ed94ee1c9bbd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'Designer Den': 'https://images.unsplash.com/photo-1604868189535-3f77ecf35fa7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'Casual Corner': 'https://images.unsplash.com/photo-1542060748-10c28b62716f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'High Street Fashion': 'https://images.unsplash.com/photo-1513786715904-610fa728ae55?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=987&q=80',
    'The Style Stop': 'https://images.unsplash.com/photo-1554568218-0f1715e72254?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1287&q=80',
    'Fashion Haven': 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'Classic Garments': 'https://images.unsplash.com/photo-1466694292615-12eb6172bc20?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1400&q=80',
    'Trendsetter': 'https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1472&q=80',
    'Style Hub': 'https://images.unsplash.com/photo-1540221652346-e5dd6b50f3e7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1469&q=80'
  };
  
  // Additional unique images for stores not explicitly mapped
  additionalUniqueImages = [
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1587&q=80',
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1591085686350-798c0f9faa7f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1931&q=80',
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
    'https://images.unsplash.com/photo-1551232864-3f0890e580d9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1287&q=80',
    'https://images.unsplash.com/photo-1462392246754-28dfa2df8e6b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1611424594952-1b31fabe94f8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1364&q=80',
    'https://images.unsplash.com/photo-1614771637369-ed94441a651a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1607083206968-13611e3d76db?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1305&q=80',
    'https://images.unsplash.com/photo-1570053926159-a554ca88e4b4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    'https://images.unsplash.com/photo-1470309864661-68328b2cd0a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
  ];
  
  // Index for assigning images from additionalUniqueImages
  private assignedImageCount = 0;
  
  // Used to keep track of which store IDs have already been assigned an image
  private storeIdToImage: {[key: string]: string} = {};
  
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
    if (!Array.isArray(this.filteredStores)) return;
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
    try {
      // First check if this store already has an image assigned by ID (for consistency across pages)
      if (store._id && this.storeIdToImage[store._id]) {
        return this.storeIdToImage[store._id];
      }
      
      // Check if the store has a predefined image by company name
      if (store.company_name && this.storeImagesByName[store.company_name]) {
        const image = this.storeImagesByName[store.company_name];
        // Also save by ID for consistency across pages
        if (store._id) {
          this.storeIdToImage[store._id] = image;
        }
        return image;
      }
      
      // If no predefined image, assign from work type (as a category)
      if (store.work_type && typeof store.work_type === 'string') {
        const workType = store.work_type.toUpperCase();
        if (this.storeImagesByType[workType]) {
          // We'll only use this as a last resort if we've assigned all unique images
          const typeImage = this.storeImagesByType[workType];
          
          // First try to get a unique image from our additional pool
          if (this.assignedImageCount < this.additionalUniqueImages.length) {
            const uniqueImage = this.additionalUniqueImages[this.assignedImageCount++];
            
            // Save this assignment by ID and company name
            if (store._id) {
              this.storeIdToImage[store._id] = uniqueImage;
            }
            if (store.company_name) {
              this.storeImagesByName[store.company_name] = uniqueImage;
            }
            
            return uniqueImage;
          }
          
          // If we've used all unique images, use the type image
          if (store._id) {
            this.storeIdToImage[store._id] = typeImage;
          }
          return typeImage;
        }
      }
      
      // If all else fails, use a default image
      const defaultImage = 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80';
      
      // Save this assignment for future consistency
      if (store._id) {
        this.storeIdToImage[store._id] = defaultImage;
      }
      if (store.company_name) {
        this.storeImagesByName[store.company_name] = defaultImage;
      }
      
      return defaultImage;
    } catch (error) {
      console.error('Error getting store image:', error);
      return 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80';
    }
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