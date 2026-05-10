import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class IdleService {

  // ⏱️ 15 minutes idle time (Production)
  private readonly IDLE_TIME = 15 * 60 * 1000;
  private readonly REFRESH_CHECK_INTERVAL = 60 * 1000; // Check every 1 minute
  private readonly WARNING_TIME = 60 * 1000; // 60 seconds warning before auto logout

  private timeoutId: any;
  private refreshIntervalId: any;
  private lastActivityCheckTime = 0; // ⏱️ Prevent over-checking token expiration on every single interaction
  private readonly events = [
    'mousemove',
    'mousedown',
    'keypress',
    'scroll',
    'touchstart'
  ];

  // 🛡️ Popup variables
  private popupElement: HTMLElement | null = null;
  private countdownIntervalId: any;
  private isPopupOpen = false;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private authService: AuthService
  ) {
    // 🛡️ Only check inactivity if the user is actually logged in
    window.addEventListener('focus', () => {
      if (this.authService.isLoggedIn()) {
        this.checkInactivity();
      }
    });
    
    window.addEventListener('pageshow', () => {
      if (this.authService.isLoggedIn()) {
        this.checkInactivity();
      }
    }); // Reliable on wake-up
    
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.authService.isLoggedIn()) {
        this.checkInactivity();
      }
    });
  }

  startWatching(): void {
    if (!this.authService.isLoggedIn()) return;
    
    localStorage.setItem('lastActivity', Date.now().toString());
    this.resetTimer();
    this.addEventListeners();
    this.startBackgroundRefreshCheck();
  }

  stopWatching(): void {
    this.clearTimer();
    this.clearRefreshInterval();
    this.removeEventListeners();
    this.closeWarningPopup(); // Ensure popup is destroyed on logout or session change
    localStorage.removeItem('lastActivity');
  }

  private startBackgroundRefreshCheck(): void {
    this.clearRefreshInterval();
    this.ngZone.runOutsideAngular(() => {
      this.refreshIntervalId = setInterval(() => {
        // 🛡️ If the user is no longer logged in, stop watching and terminate interval
        if (!this.authService.isLoggedIn()) {
          this.ngZone.run(() => this.stopWatching());
          return;
        }

        // Do not perform background auto-refresh check if the warning modal is currently shown
        if (this.isPopupOpen) return;

        const lastActivity = localStorage.getItem('lastActivity');
        if (lastActivity) {
          const diff = Date.now() - parseInt(lastActivity);
          // If user was active in the last 10 minutes AND token is about to expire
          if (diff < 10 * 60 * 1000 && this.authService.isTokenExpiredSoon()) {
            console.log('[IdleService] User is active & token expiring soon → triggering silent refresh');
            this.ngZone.run(() => {
              this.authService.refreshTokens().subscribe({
                next: () => console.log('[IdleService] Silent refresh successful'),
                error: (err) => {
                  console.error('[IdleService] Silent refresh failed', err);
                  this.logout();
                }
              });
            });
          }
        }
      }, this.REFRESH_CHECK_INTERVAL);
    });
  }

  private clearRefreshInterval(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  private checkInactivity(): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }

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
    this.stopWatching(); // 🛡️ Stop listening to events on logout
    // The centralized auth service will handle clearing storage, closing dialogs, and navigation
    this.authService.logout();
  }

  private getEffectiveWarningTime(): number {
    return this.IDLE_TIME > this.WARNING_TIME ? this.WARNING_TIME : Math.round(this.IDLE_TIME * 0.2);
  }

  private resetTimer = (): void => {
    // 🛡️ If user is not logged in, stop watching immediately to detach listeners
    if (!this.authService.isLoggedIn()) {
      this.stopWatching();
      return;
    }

    // If warning modal is already open, do not reset the timer on general activity events
    if (this.isPopupOpen) return;

    // Prevent resetting the timer if the user is already technically idle
    if (this.checkInactivity()) return;

    localStorage.setItem('lastActivity', Date.now().toString());
    this.clearTimer();

    // 🚀 Check if token is expired/expiring soon on user activity (throttled to once every 30s)
    const now = Date.now();
    if (now - this.lastActivityCheckTime > 30000) {
      this.lastActivityCheckTime = now;
      if (this.authService.isTokenExpiredSoon()) {
        console.log('[IdleService] User is active & token expiring soon (checked on activity) → triggering silent refresh');
        this.ngZone.run(() => {
          this.authService.refreshTokens().subscribe({
            next: () => console.log('[IdleService] Silent refresh successful (on activity)'),
            error: (err) => {
              console.error('[IdleService] Silent refresh failed (on activity)', err);
              this.logout();
            }
          });
        });
      }
    }

    const warningTime = this.getEffectiveWarningTime();
    this.ngZone.runOutsideAngular(() => {
      this.timeoutId = setTimeout(() => {
        this.ngZone.run(() => this.showWarningPopup());
      }, this.IDLE_TIME - warningTime);
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

  // 🛡️ Show dynamic countdown modal
  private showWarningPopup(): void {
    if (this.isPopupOpen) return;
    this.isPopupOpen = true;

    // Temporarily detach automatic background reset listener during warning modal
    this.removeEventListeners();

    const warningDurationSeconds = Math.round(this.getEffectiveWarningTime() / 1000);
    let timeLeft = warningDurationSeconds;

    // Create container overlay
    this.popupElement = document.createElement('div');
    this.popupElement.id = 'idle-warning-overlay';
    this.popupElement.style.position = 'fixed';
    this.popupElement.style.top = '0';
    this.popupElement.style.left = '0';
    this.popupElement.style.width = '100vw';
    this.popupElement.style.height = '100vh';
    this.popupElement.style.zIndex = '999999';
    this.popupElement.style.display = 'flex';
    this.popupElement.style.alignItems = 'center';
    this.popupElement.style.justifyContent = 'center';
    this.popupElement.style.backdropFilter = 'blur(16px)';
    this.popupElement.style['webkitBackdropFilter' as any] = 'blur(16px)';
    this.popupElement.style.backgroundColor = 'rgba(15, 23, 42, 0.75)'; // Dark premium slate with transparency
    this.popupElement.style.transition = 'all 0.3s ease-in-out';
    this.popupElement.style.fontFamily = "'Outfit', 'Inter', sans-serif";

    // Inject styles and HTML structure
    this.popupElement.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
        
        .idle-modal {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.15);
          border-radius: 24px;
          padding: 40px;
          width: 90%;
          max-width: 440px;
          text-align: center;
          color: #f8fafc;
          transform: scale(0.9);
          opacity: 0;
          animation: idlePopupEntrance 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        @keyframes idlePopupEntrance {
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .idle-icon-wrap {
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px auto;
          border: 1px solid rgba(59, 130, 246, 0.3);
          position: relative;
        }

        .idle-icon-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid #3b82f6;
          animation: idlePulse 2s infinite;
          opacity: 0;
        }

        @keyframes idlePulse {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        .idle-title {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .idle-desc {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 30px;
          font-weight: 400;
        }

        .idle-timer-container {
          position: relative;
          width: 120px;
          height: 120px;
          margin: 0 auto 32px auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .idle-timer-svg {
          transform: rotate(-90deg);
          width: 100%;
          height: 100%;
        }

        .idle-timer-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.05);
          stroke-width: 6;
        }

        .idle-timer-progress {
          fill: none;
          stroke: url(#idleGrad);
          stroke-width: 6;
          stroke-linecap: round;
          transition: stroke-dashoffset 1s linear;
          stroke-dasharray: 283; /* 2 * PI * r (r=45) => 282.7 */
        }

        .idle-time-text {
          position: absolute;
          font-size: 32px;
          font-weight: 800;
          color: #3b82f6;
          transition: color 0.3s ease;
        }

        .idle-time-text.warning {
          color: #ef4444;
          animation: idleTextPulse 0.5s ease infinite alternate;
        }

        @keyframes idleTextPulse {
          from { transform: scale(1); }
          to { transform: scale(1.1); }
        }

        .idle-btn {
          width: 100%;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border: none;
          color: white;
          padding: 14px 28px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .idle-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.45);
          background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%);
        }

        .idle-btn:active {
          transform: translateY(0);
          box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
        }
      </style>

      <div class="idle-modal">
        <div class="idle-icon-wrap">
          <div class="idle-icon-pulse"></div>
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        
        <div class="idle-title">Session Expiring</div>
        <div class="idle-desc">You have been inactive for a while. Your session is about to expire. Do you want to continue working?</div>
        
        <div class="idle-timer-container">
          <svg class="idle-timer-svg" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="idleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#3b82f6" />
                <stop offset="100%" stop-color="#ef4444" id="gradStopEnd" />
              </linearGradient>
            </defs>
            <circle class="idle-timer-bg" cx="50" cy="50" r="45" />
            <circle class="idle-timer-progress" id="idle-progress-circle" cx="50" cy="50" r="45" stroke-dashoffset="0" />
          </svg>
          <div class="idle-time-text" id="idle-timer-digits">${timeLeft}s</div>
        </div>

        <button class="idle-btn" id="idle-continue-btn">Continue working</button>
      </div>
    `;

    document.body.appendChild(this.popupElement);

    // Setup Continue button click handler
    const btn = document.getElementById('idle-continue-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        this.ngZone.run(() => this.continueSession());
      });
    }

    const progressCircle = document.getElementById('idle-progress-circle') as SVGCircleElement | null;
    const timerDigits = document.getElementById('idle-timer-digits');
    const totalDash = 283;

    // Start live tick countdown
    this.countdownIntervalId = setInterval(() => {
      timeLeft--;

      if (timerDigits) {
        timerDigits.innerText = `${timeLeft}s`;
        if (timeLeft <= 10) {
          timerDigits.classList.add('warning');
          if (progressCircle) {
            progressCircle.style.stroke = '#ef4444'; // Switch stroke to vivid red on warning threshold
          }
        }
      }

      if (progressCircle) {
        const offset = totalDash - (timeLeft / warningDurationSeconds) * totalDash;
        progressCircle.style.strokeDashoffset = offset.toString();
      }

      if (timeLeft <= 0) {
        this.ngZone.run(() => this.handleTimeoutLogout());
      }
    }, 1000);
  }

  // 🛡️ User clicked Continue Session
  private continueSession(): void {
    this.closeWarningPopup();
    
    // Re-engage listeners and timers
    localStorage.setItem('lastActivity', Date.now().toString());
    this.addEventListeners();
    this.resetTimer();

    // Trigger silent refresh immediately to ensure access token is renewed
    if (this.authService.isLoggedIn()) {
      console.log('[IdleService] User requested session extension → refreshing tokens');
      this.authService.refreshTokens().subscribe({
        next: () => console.log('[IdleService] Tokens refreshed successfully on session extension'),
        error: (err) => {
          console.error('[IdleService] Failed to refresh tokens on session extension', err);
          this.logout();
        }
      });
    }
  }

  private handleTimeoutLogout(): void {
    this.closeWarningPopup();
    this.logout();
  }

  private closeWarningPopup(): void {
    this.isPopupOpen = false;
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    if (this.popupElement && this.popupElement.parentNode) {
      this.popupElement.parentNode.removeChild(this.popupElement);
      this.popupElement = null;
    }
  }
}
