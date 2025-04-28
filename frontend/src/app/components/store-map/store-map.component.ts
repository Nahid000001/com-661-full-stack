import { Component, Input, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// Extend Window interface to include google property
declare global {
  interface Window {
    google: any;
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
    </div>
  `,
  styles: [`
    .map-container {
      width: 100%;
      height: 300px;
      border-radius: 8px;
      overflow: hidden;
      margin: 1rem 0;
    }
    .map-element {
      width: 100%;
      height: 100%;
    }
  `]
})
export class StoreMapComponent implements OnInit, AfterViewInit {
  @Input() location: string = '';
  @ViewChild('mapElement') mapElement!: ElementRef;
  
  private map: any;
  private geocoder: any;
  
  ngOnInit() {
    // Load Google Maps script if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AlzaSyDYIJNwoGmGS9wD0csiiQo4ut9Ie00dgSM`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }
  
  ngAfterViewInit() {
    // Wait for Google Maps to load
    const checkGoogleMaps = setInterval(() => {
      if (window.google) {
        clearInterval(checkGoogleMaps);
        this.initMap();
      }
    }, 100);
  }
  
  private initMap() {
    this.geocoder = new google.maps.Geocoder();
    
    // Default to London coordinates if geocoding fails
    const defaultLocation = { lat: 51.5074, lng: -0.1278 };
    
    this.geocoder.geocode({ address: this.location }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        
        this.map = new google.maps.Map(this.mapElement.nativeElement, {
          center: location,
          zoom: 15,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });
        
        // Add marker for the store
        new google.maps.Marker({
          map: this.map,
          position: location,
          title: this.location
        });
      } else {
        // If geocoding fails, show default London location
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
        
        new google.maps.Marker({
          map: this.map,
          position: defaultLocation,
          title: 'London'
        });
      }
    });
  }
} 