import { Component, Input, OnInit, ElementRef, ViewChild, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

// Extend Window interface to include google property
declare global {
  interface Window {
    google: any;
    [key: string]: any; // Add index signature to allow dynamic properties
  }
}

// Declare google variable
declare const google: any;

@Component({
  selector: 'app-store-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container">
      <div #mapElement class="map-element"></div>
      <div *ngIf="loadError" class="error-message">
        <div class="error-icon">!</div>
        <div class="error-text">
          <h3>Sorry! Something went wrong.</h3>
          <p>This page didn't load Google Maps correctly.</p>
          <p *ngIf="errorMessage">Error: {{ errorMessage }}</p>
          <button class="retry-button" (click)="retryLoadMap()">Retry Loading Map</button>
          <div *ngIf="isAdmin" class="admin-options">
            <p class="admin-tip">Admin tip: You might need to check the Google Maps API key or billing status.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      position: relative;
      width: 100%;
      height: 300px;
      border-radius: 8px;
      overflow: hidden;
      margin: 1rem 0;
      background-color: #f9f9f9;
    }
    .map-element {
      width: 100%;
      height: 100%;
    }
    .error-message {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #f5f5f5;
      text-align: center;
      padding: 20px;
    }
    .error-icon {
      background: #888;
      color: white;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      margin-bottom: 15px;
    }
    .error-text h3 {
      font-size: 18px;
      margin-bottom: 10px;
    }
    .error-text p {
      font-size: 14px;
      color: #666;
      margin-bottom: 15px;
    }
    .retry-button {
      background-color: #4285f4;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .retry-button:hover {
      background-color: #3367d6;
    }
    .admin-options {
      margin-top: 15px;
      padding: 10px;
      background-color: rgba(0,0,0,0.05);
      border-radius: 4px;
    }
    .admin-tip {
      color: #d32f2f;
      font-size: 13px;
      margin: 0;
    }
  `]
})
export class StoreMapComponent implements OnInit, AfterViewInit {
  @Input() location: string = '';
  @ViewChild('mapElement') mapElement!: ElementRef;
  
  private map: any;
  private geocoder: any;
  loadError: boolean = false;
  errorMessage: string = '';
  isAdmin: boolean = false;
  private mapInitialized: boolean = false;
  private scriptLoadAttempted: boolean = false;
  
  // Google Maps API Key - use environment variable
  private readonly apiKey = environment.googleMapsApiKey || '';
  
  constructor(private ngZone: NgZone, private authService: AuthService) {}

  ngOnInit() {
    console.log('StoreMapComponent initialized with location:', this.location);
    console.log('Google Maps API Key:', this.apiKey);
    
    // Check if user is admin
    this.isAdmin = this.authService.hasRole('admin');
    
    // Wait a brief moment before trying to load Google Maps
    // This helps ensure the DOM is ready
    setTimeout(() => {
      this.loadGoogleMapsScript();
    }, 100);
  }
  
  ngAfterViewInit() {
    // If Google Maps API is already loaded, initialize the map
    if (window.google && window.google.maps) {
      this.initMap();
    } else if (!this.scriptLoadAttempted) {
      // If script wasn't loaded in ngOnInit, try again
      this.loadGoogleMapsScript();
    }
  }
  
  private loadGoogleMapsScript() {
    // Prevent multiple load attempts
    if (this.scriptLoadAttempted) {
      return;
    }
    
    this.scriptLoadAttempted = true;
    
    // Check if script is already loaded
    if (window.google && window.google.maps) {
      this.initMap();
      return;
    }
    
    // Create a unique callback function name
    const callbackName = 'googleMapsInitialize_' + Math.random().toString(36).substring(2, 15);

    // Define the callback function
    window[callbackName] = () => {
      this.ngZone.run(() => {
        console.log('Google Maps API loaded successfully');
        // Make sure view is ready before initializing map
        if (this.mapElement && this.mapElement.nativeElement) {
          this.initMap();
        } else {
          // Wait for view to be ready
          setTimeout(() => this.initMap(), 200);
        }
      });
    };
    
    // Create script element
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&callback=${callbackName}&loading=async`;
    script.async = true;
    script.defer = true;
    
    // Add error handling
    script.onerror = (error) => {
      this.ngZone.run(() => {
        this.loadError = true;
        this.errorMessage = 'Failed to load Google Maps script';
        console.error('Google Maps script failed to load:', error);
      });
    };
    
    // Add a timeout in case the script hangs
    const timeoutId = setTimeout(() => {
      if (!window.google || !window.google.maps) {
        this.ngZone.run(() => {
          this.loadError = true;
          this.errorMessage = 'Google Maps script load timed out';
          console.error('Google Maps script load timed out');
        });
      }
    }, 10000); // 10 second timeout
    
    // Clean up timeout when script loads
    script.onload = () => {
      clearTimeout(timeoutId);
    };
    
    console.log('Adding Google Maps script to head with API key:', this.apiKey);
    // Append the script to the document head
    document.head.appendChild(script);
  }
  
  private initMap() {
    // Avoid initializing the map multiple times
    if (this.mapInitialized) {
      return;
    }
    
    // Check if element and Google Maps API are available
    if (!this.mapElement || !this.mapElement.nativeElement) {
      console.log('Map element not available');
      setTimeout(() => this.initMap(), 200);
      return;
    }
    
    if (!window.google || !window.google.maps) {
      console.log('Google Maps API not available');
      this.loadError = true;
      this.errorMessage = 'Google Maps API not available';
      return;
    }
    
    try {
      console.log('Initializing map with location:', this.location);
      this.mapInitialized = true;
      this.geocoder = new google.maps.Geocoder();
      
      // Default to London coordinates
      const defaultLocation = { lat: 51.5074, lng: -0.1278 };
      
      // Create the map first with default location
      this.map = new google.maps.Map(this.mapElement.nativeElement, {
        center: defaultLocation,
        zoom: 12,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });
      
      // Only proceed with geocoding if we have a location
      if (this.location && this.location.trim() !== '') {
        console.log('Geocoding location:', this.location);
        
        // Try to make the location more specific for geocoding by adding country
        let searchAddress = this.location;
        
        // If no country is specified, add United Kingdom as a fallback
        if (!searchAddress.toLowerCase().includes('uk') && 
            !searchAddress.toLowerCase().includes('united kingdom') &&
            !searchAddress.toLowerCase().includes('england') &&
            !searchAddress.toLowerCase().includes('scotland') &&
            !searchAddress.toLowerCase().includes('wales')) {
          searchAddress += ', United Kingdom';
        }
        
        console.log('Using search address for geocoding:', searchAddress);
        
        this.geocoder.geocode({ address: searchAddress }, (results: any, status: any) => {
          this.ngZone.run(() => {
            console.log('Geocoding results:', status, results);
            if (status === 'OK' && results && results[0]) {
              const location = results[0].geometry.location;
              console.log('Found coordinates:', location.lat(), location.lng());
              
              // Update map center and zoom
              this.map.setCenter(location);
              this.map.setZoom(15);
              
              // Add marker for the store
              new google.maps.Marker({
                map: this.map,
                position: location,
                title: this.location,
                animation: google.maps.Animation.DROP
              });
              
              // Clear any error state since we found the location
              this.loadError = false;
              this.errorMessage = '';
            } else {
              console.error('Geocoding failed:', status);
              this.errorMessage = `Geocoding failed: ${status}`;
              this.loadError = true;
              
              // Try with manual coordinates for common locations as fallback
              this.tryFallbackLocation();
            }
          });
        });
      } else {
        console.log('No location provided, using default (London)');
        // Add marker for default location (London)
        new google.maps.Marker({
          map: this.map,
          position: defaultLocation,
          title: 'London',
          animation: google.maps.Animation.DROP
        });
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      this.loadError = true;
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error initializing map';
    }
  }
  
  // Add a method to try fallback locations for common cities
  private tryFallbackLocation() {
    // Map of common locations to their coordinates
    const locationMap: {[key: string]: {lat: number, lng: number}} = {
      'london': { lat: 51.5074, lng: -0.1278 },
      'manchester': { lat: 53.4808, lng: -2.2426 },
      'birmingham': { lat: 52.4862, lng: -1.8904 },
      'liverpool': { lat: 53.4084, lng: -2.9916 },
      'leeds': { lat: 53.8008, lng: -1.5491 },
      'glasgow': { lat: 55.8642, lng: -4.2518 },
      'edinburgh': { lat: 55.9533, lng: -3.1883 },
      'bristol': { lat: 51.4545, lng: -2.5879 },
      'cardiff': { lat: 51.4816, lng: -3.1791 },
      'newcastle': { lat: 54.9783, lng: -1.6178 }
    };
    
    // Check if the location contains any of our known cities
    const lowerCaseLocation = this.location.toLowerCase();
    
    for (const [city, coords] of Object.entries(locationMap)) {
      if (lowerCaseLocation.includes(city)) {
        console.log(`Found fallback coordinates for ${city}`);
        
        // Set map to these coordinates
        this.map.setCenter(coords);
        this.map.setZoom(12);
        
        // Add a marker
        new google.maps.Marker({
          map: this.map,
          position: coords,
          title: this.location,
          animation: google.maps.Animation.DROP
        });
        
        // Clear error state since we found a fallback
        this.loadError = false;
        this.errorMessage = '';
        return;
      }
    }
    
    // If we get here, we couldn't find a fallback
    console.log('No fallback location found for:', this.location);
  }
  
  retryLoadMap() {
    console.log('Retrying map load...');
    this.loadError = false;
    this.errorMessage = '';
    this.scriptLoadAttempted = false;
    this.mapInitialized = false;
    
    // Try to remove existing Google Maps script tag if it exists
    const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    existingScripts.forEach(script => script.remove());
    
    // Clear any existing callback references
    for (const key in window) {
      if (key.startsWith('googleMapsInitialize_')) {
        delete window[key];
      }
    }
    
    // Load the map again
    this.loadGoogleMapsScript();
  }
} 