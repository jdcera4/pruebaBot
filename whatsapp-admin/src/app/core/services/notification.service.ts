import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private defaultDuration = 5000; // 5 seconds
  private actionText = 'OK';

  constructor(
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  private getConfig(type: NotificationType): MatSnackBarConfig {
    const panelClass = `notification-${type}`;
    return {
      duration: this.defaultDuration,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [panelClass, 'notification']
    };
  }

  show(
    message: string,
    type: NotificationType = 'info',
    action: string = this.actionText,
    duration: number = this.defaultDuration
  ): MatSnackBarRef<TextOnlySnackBar> {
    const config = this.getConfig(type);
    config.duration = duration;
    
    return this.snackBar.open(message, action, config);
  }

  success(message: string, action: string = this.actionText, duration: number = this.defaultDuration) {
    return this.show(message, 'success', action, duration);
  }

  error(message: string, action: string = this.actionText, duration: number = 10000) {
    return this.show(message, 'error', action, duration);
  }

  info(message: string, action: string = this.actionText, duration: number = this.defaultDuration) {
    return this.show(message, 'info', action, duration);
  }

  warning(message: string, action: string = this.actionText, duration: number = this.defaultDuration) {
    return this.show(message, 'warning', action, duration);
  }

  dismiss() {
    this.snackBar.dismiss();
  }

  showErrorWithAction(message: string, action: string, route: string[], duration: number = 10000) {
    const snackBarRef = this.error(message, action, duration);
    
    snackBarRef.onAction().subscribe(() => {
      this.router.navigate(route);
    });

    return snackBarRef;
  }

  showSuccessWithAction(message: string, action: string, route: string[], duration: number = 5000) {
    const snackBarRef = this.success(message, action, duration);
    
    snackBarRef.onAction().subscribe(() => {
      this.router.navigate(route);
    });

    return snackBarRef;
  }
}
