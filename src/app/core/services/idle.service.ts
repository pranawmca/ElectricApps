import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class IdleService {

  // ⏱️ 15 minutes idle time (change as needed)
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
    private ngZone: NgZone
  ) {
    // Check when window gets focus (laptop wakeup/tab switch)
    this.events.forEach(event => {
       if (event === 'visibilitychange' || event === 'focus') return;
    });

    window.addEventListener('focus', () => this.checkInactivity());
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

  private checkInactivity(): void {
    const lastActivity = localStorage.getItem('lastActivity');
    if (lastActivity) {
      const diff = Date.now() - parseInt(lastActivity);
      if (diff >= this.IDLE_TIME) {
        console.warn('User was inactive for too long (checked on wake/focus) → auto logout');
        this.logout();
      }
    }
  }

  private logout(): void {
    console.warn('User idle → auto logout');
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  private resetTimer = (): void => {
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
