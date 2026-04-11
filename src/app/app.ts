import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IdleService } from './core/services/idle.service';
import { ThemeService } from './core/services/theme.service';
import { OverlayContainer } from '@angular/cdk/overlay';
import { LoadingService } from './core/services/loading.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DialogPersistenceService } from './shared/services/dialog-persistence.service';
import { CompanyService } from './features/company/services/company.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MatProgressSpinnerModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private idleService = inject(IdleService);
  private themeService = inject(ThemeService);
  private overlayContainer = inject(OverlayContainer);
  private loadingService = inject(LoadingService);
  private cdr = inject(ChangeDetectorRef);
  private dialogPersistence = inject(DialogPersistenceService);
  private titleService = inject(Title);
  private companyService = inject(CompanyService);

  isGlobalLoading = false;

  ngOnInit(): void {
    // Initial dynamic title
    this.titleService.setTitle("Enterprise ERP");

    // Company Tagline Fetching via API
    this.companyService.getCompanyProfile().subscribe({
      next: (profile) => {
        if (profile && profile.tagline) {
          this.titleService.setTitle(`${profile.name} | ${profile.tagline}`);
        } else if (profile) {
          this.titleService.setTitle(profile.name);
        }
      },
      error: () => {
        this.titleService.setTitle("Enterprise ERP");
      }
    });

    if (localStorage.getItem('accessToken')) {
      this.idleService.startWatching();
    }

    this.loadingService.loading$.subscribe(isLoading => {
      this.isGlobalLoading = isLoading;
      this.cdr.detectChanges();
    });

    // Page refresh ke baad pending dialog restore karo
    this.dialogPersistence.checkAndRestore();
  }
}
