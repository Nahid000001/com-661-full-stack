import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ErrorService } from '../../services/error.service';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss']
})
export class AlertComponent implements OnInit, OnDestroy {
  message: string | null = null;
  private errorSubscription!: Subscription;

  constructor(private errorService: ErrorService) { }

  ngOnInit(): void {
    this.errorSubscription = this.errorService.error$.subscribe(
      (error: string) => {
        this.message = error;
        if (error) {
          setTimeout(() => {
            this.close();
          }, 5000);
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe();
    }
  }

  close(): void {
    this.errorService.clearError();
  }
} 