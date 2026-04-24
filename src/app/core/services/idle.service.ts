import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class IdleService {

  // ⏱️ 15 minutes idle time (Production)
  private readonly IDLE_TIME = 15 * 60 * 1000;

  private timeoutId: any;
  private readonly events = [
    'mousemove',
    'mousedown',
    'keypress',
    'scroll',
    'touchstart'
  ];

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private authService: AuthService
  ) {
    window.addEventListener('focus', () => this.checkInactivity());
    window.addEventListener('pageshow', () => this.checkInactivity()); // Reliable on wake-up
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkInactivity();
      }
    });
  }

  startWatching(): void {
    localStorage.setItem('lastActivity', Date.now().toString());
    this.resetTimer();
    this.addEventListeners();
  }

  stopWatching(): void {
    this.clearTimer();
    this.removeEventListeners();
  }

  private checkInactivity(): boolean {
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
      const diff = Date.now() - parseInt(lastActivity);
      if (diff >= this.IDLE_TIME) {
        console.warn('User was inactive for too long → auto logout');
        this.logout();
        return true;
      }
    }
    return false;
  }

  private logout(): void {
    console.warn('User idle → auto logout');
    // The centralized auth service will handle clearing storage, closing dialogs, and navigation
    this.authService.logout();
  }

  private resetTimer = (): void => {
    // Prevent resetting the timer if the user is already technically idle
    if (this.checkInactivity()) return;

    localStorage.setItem('lastActivity', Date.now().toString());
    this.clearTimer();

    this.ngZone.runOutsideAngular(() => {
      this.timeoutId = setTimeout(() => {
        this.ngZone.run(() => this.logout());
      }, this.IDLE_TIME);
    });
  };

  private clearTimer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private addEventListeners(): void {
    this.events.forEach(event =>
      window.addEventListener(event, this.resetTimer, true)
    );
  }

  private removeEventListeners(): void {
    this.events.forEach(event =>
      window.removeEventListener(event, this.resetTimer, true)
    );
  }
}
