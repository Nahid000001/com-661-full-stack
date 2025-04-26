import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-health-check',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './health-check.component.html',
  styleUrls: ['./health-check.component.scss']
})
export class HealthCheckComponent implements OnInit {
  status: 'loading' | 'connected' | 'error' = 'loading';
  apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.checkApiHealth();
  }

  checkApiHealth(): void {
    this.http.get(`${this.apiUrl}/health-check`)
      .subscribe({
        next: () => {
          this.status = 'connected';
        },
        error: () => {
          this.status = 'error';
        }
      });
  }

  retry(): void {
    this.status = 'loading';
    this.checkApiHealth();
  }
} 