import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotifyService {
  private snackBar = inject(MatSnackBar);

  private readonly defaultConfig: MatSnackBarConfig = {
    duration: 5000,
    horizontalPosition: 'end',
    verticalPosition: 'bottom'
  };

  /**
   * Success notification (Green)
   */
  success(message: string, action: string = 'OK'): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Error notification (Red)
   */
  error(message: string, action: string = 'CLOSE'): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Warning notification (Amber)
   */
  warn(message: string, action: string = 'OK'): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ['warning-snackbar']
    });
  }

  /**
   * Info notification (Blue)
   */
  info(message: string, action: string = 'INFO'): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ['info-snackbar']
    });
  }
}
