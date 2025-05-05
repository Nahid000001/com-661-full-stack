import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-store-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container">
      <div class="fallback-map">
        <div class="map-content">
          <div class="location-icon">📍</div>
          <div class="location-info">
            <div class="location-title">{{ location || 'London' }}</div>
            <div class="location-subtitle">Store Location</div>
          </div>
        </div>
        <div class="map-footer">
          <a [href]="googleMapsLink" target="_blank" rel="noopener" class="view-on-maps-btn">
            View on Google Maps
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .map-container {
      width: 100%;
      height: 300px;
      border-radius: 8px;
      overflow: hidden;
      margin: 1rem 0;
      border: 1px solid #e0e0e0;
    }
    .fallback-map {
      width: 100%;
      height: 100%;
      background-color: #f2f2f2;
      background-image: linear-gradient(45deg, #eaeaea 25%, transparent 25%, transparent 75%, #eaeaea 75%, #eaeaea), 
                        linear-gradient(45deg, #eaeaea 25%, transparent 25%, transparent 75%, #eaeaea 75%, #eaeaea);
      background-size: 20px 20px;
      background-position: 0 0, 10px 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .map-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .location-icon {
      font-size: 3rem;
      margin-right: 1rem;
      color: #db4437;
    }
    .location-info {
      text-align: left;
    }
    .location-title {
      font-size: 1.5rem;
      font-weight: bold;
      color: #202124;
    }
    .location-subtitle {
      font-size: 1rem;
      color: #5f6368;
      margin-top: 0.5rem;
    }
    .map-footer {
      background-color: #fff;
      padding: 1rem;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .view-on-maps-btn {
      display: inline-block;
      padding: 0.5rem 1rem;
      background-color: #4285f4;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .view-on-maps-btn:hover {
      background-color: #3367d6;
    }
  `]
})
export class StoreMapComponent implements OnInit {
  @Input() location: string = '';
  googleMapsLink: string = '';
  
  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.generateGoogleMapsLink();
  }
  
  generateGoogleMapsLink() {
    const query = this.location && this.location.trim() !== '' 
      ? encodeURIComponent(this.location) 
      : 'London,UK';
      
    this.googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
} 