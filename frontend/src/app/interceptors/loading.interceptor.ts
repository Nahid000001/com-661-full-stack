import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

let totalRequests = 0;

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Skip loading indicator for certain requests (e.g., health checks)
  if (req.url.includes('/health-check')) {
    return next(req);
  }
  
  totalRequests++;
  loadingService.setLoading(true);
  
  return next(req).pipe(
    finalize(() => {
      totalRequests--;
      if (totalRequests === 0) {
        loadingService.setLoading(false);
      }
    })
  );
}; 