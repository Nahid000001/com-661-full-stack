import { Component, Input, OnInit, ElementRef, ViewChild, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

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
          <p>This page didn't load Google Maps correctly. Please try refreshing the page.</p>
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
    }
  `]
})
export class StoreMapComponent implements OnInit, AfterViewInit {
  @Input() location: string = '';
  @ViewChild('mapElement') mapElement!: ElementRef;
  
  private map: any;
  private geocoder: any;
  loadError: boolean = false;
  private mapInitialized: boolean = false;
  private scriptLoadAttempted: boolean = false;
  
  // Google Maps API Key - use environment variable in production
  private readonly apiKey = 'AIzaSyDYIJNwoGmGS9wD0csiiQo4ut9Ie00dgSM';
  
  constructor(private ngZone: NgZone) {}

  ngOnInit() {
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    // Add error handling
    script.onerror = () => {
      this.ngZone.run(() => {
        this.loadError = true;
        console.error('Google Maps script failed to load');
      });
    };
    
    // Add a timeout in case the script hangs
    const timeoutId = setTimeout(() => {
      if (!window.google || !window.google.maps) {
        this.ngZone.run(() => {
          this.loadError = true;
          console.error('Google Maps script load timed out');
        });
      }
    }, 10000); // 10 second timeout
    
    // Clean up timeout when script loads
    script.onload = () => {
      clearTimeout(timeoutId);
    };
    
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
      return;
    }
    
    try {
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
        this.geocoder.geocode({ address: this.location }, (results: any, status: any) => {
          this.ngZone.run(() => {
            if (status === 'OK' && results && results[0]) {
              const location = results[0].geometry.location;
              
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
            } else {
              console.error('Geocoding failed:', status);
              // Keep the default map centered on London
            }
          });
        });
      } else {
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
    }
  }
} 