import { Component, inject, OnInit, ViewChild, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { MaterialModule } from '../../shared/material/material/material-module';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { BreadcrumbComponent } from './breadcrumb-component/breadcrumb-component';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { DeveloperInfoComponent } from '../../shared/components/developer-info/developer-info';
import { MatSidenav } from '@angular/material/sidenav';
import { MenuItem } from '../../core/models/menu-item.model';
import { MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../features/dashboard/services/notification.service';
import { NotificationDto } from '../../features/dashboard/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { LanguageService } from '../../core/services/language.service';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { LoadingService } from '../../core/services/loading.service';
import { CompanyService } from '../../features/company/services/company.service';
import { environment } from '../../enviornments/environment';
import { map, filter } from 'rxjs/operators';
import { StockDrawerComponent } from '../../features/inventory/stock-drawer-component/stock-drawer-component';
import { NavigationEnd } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { UserProfileComponent } from '../../shared/components/user-profile/user-profile';

@Component({
  selector: 'app-main-layout-component',
  imports: [CommonModule, RouterOutlet, RouterModule, BreadcrumbComponent,
    MaterialModule, StockDrawerComponent],
  templateUrl: './main-layout-component.html',
  styleUrl: './main-layout-component.scss',
})
export class MainLayoutComponent implements OnInit {

  @ViewChild(MatSidenav) sidenav!: MatSidenav;

  private breakpointObserver = inject(BreakpointObserver);
  private cdr = inject(ChangeDetectorRef);
  private menuService = inject(MenuService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private themeService = inject(ThemeService);
  private loadingService = inject(LoadingService);
  private companyService = inject(CompanyService);
  private dialog = inject(MatDialog);
  private titleService = inject(Title);
  private document = inject(DOCUMENT);
  private languageService = inject(LanguageService);

  isMobile = false;
  isDarkMode = false;
  isRtl = false;
  currentTheme = '';
  userEmail: string | null = null;
  notifications: NotificationDto[] = [];
  unreadCount = 0;
  currentTime = new Date();
  private timerInstance: any;

  currentYear = new Date().getFullYear();

  companyName = 'Electric Inventory';
  companyTagline = 'Inventory Management System';
  companyLogoUrl: string | null = null;

  isStockDrawerOpen = false;
  isConfigOpen = false;
  isSidenavOpened = true; // Track sidebar state
  isGlassMode = false;
  isCompactTable = false;
  
  get currentBranchName(): string | null {
    const branchName = this.authService.getBranchName();
    if (branchName) return branchName;
    return this.isSuperAdmin ? 'All Branches' : (this.hasMultipleBranches ? 'Multiple Branches' : 'All Branches');
  }

  isSuperAdmin = false;
  hasMultipleBranches = false;
  branches: any[] = [];


  translate(key: string): string {
    return this.languageService.translate(key);
  }

  get isHindiMode() {
    return this.languageService.isHindiMode;
  }

  toggleLanguage(): void {
    this.languageService.setHindiMode(!this.isHindiMode);
    this.cdr.detectChanges();
  }

  availableThemes: { name: string, label: string, color: string }[] = [];

  // Tree Components
  treeControl = new NestedTreeControl<MenuItem>(node => node.children);
  dataSource = new MatTreeNestedDataSource<MenuItem>();

  hasChild = (_: number, node: MenuItem) => !!node.children && node.children.length > 0;

  // Accordion-style toggle: Only one ROOT menu open at a time
  toggleNode(node: MenuItem): void {
    const isExpanded = this.treeControl.isExpanded(node);

    if (!isExpanded) {
      // Only collapse root-level siblings (not nested children)
      const isRootNode = this.dataSource.data.includes(node);

      if (isRootNode) {
        // This is a root node - collapse all other root nodes
        this.dataSource.data.forEach(rootNode => {
          if (rootNode !== node) {
            this.treeControl.collapse(rootNode);
          }
        });
      }
      // If it's a nested node (child), don't collapse anything - just expand it
    }

    // Toggle the clicked node
    this.treeControl.toggle(node);
  }

  // Helper method to collapse all nodes (kept for future use)
  private collapseAll(): void {
    this.treeControl.collapseAll();
  }

  ngOnInit(): void {
    this.userEmail = localStorage.getItem('email');

    // Subscribe to Menu Service
    this.menuService.getMenu().subscribe((menus: MenuItem[]) => {
      this.dataSource.data = menus;
    });

    // 1. Prioritize data from Login Response (AuthService)
    const authCompanyName = this.authService.getCompanyName();
    const authTagline = this.authService.getCompanyTagline();
    
    if (authCompanyName) {
      this.companyName = authCompanyName;
      this.titleService.setTitle(this.companyName);
      this.updateManifest(this.companyName);
    }
    
    if (authTagline) {
      this.companyTagline = authTagline;
    }

    // 2. Fetch Company Profile for additional branding
    this.companyService.getCompanyProfile().subscribe({
      next: (profile) => {
        if (profile) {
          if (profile.name) {
            this.companyName = profile.name;
            this.titleService.setTitle(this.companyName);
            this.updateManifest(this.companyName);
          }
          if (profile.tagline) {
            this.companyTagline = profile.tagline;
          }

          if (profile.logoUrl && !profile.logoUrl.startsWith('http')) {
            // Remove leading slash from logoUrl if present to avoid double slashes
            const cleanLogoUrl = profile.logoUrl.startsWith('/') ? profile.logoUrl.substring(1) : profile.logoUrl;
            this.companyLogoUrl = `${environment.CompanyRootUrl}/${cleanLogoUrl}`;
          } else {
            this.companyLogoUrl = profile.logoUrl;
          }
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Failed to load company profile', err)
    });

    this.availableThemes = this.themeService.availableThemes;

    this.breakpointObserver
      .observe([Breakpoints.Handset, '(max-width: 959px)'])
      .subscribe(result => {
        const wasMobile = this.isMobile;
        this.isMobile = result.matches;
        
        // If transitioning from Mobile to Desktop, force sidenav to open
        if (wasMobile && !this.isMobile) {
           this.isSidenavOpened = true; // Full view
           // Use a timeout to ensure Material is ready for mode switch
           setTimeout(() => {
              if (this.sidenav && !this.sidenav.opened) {
                this.sidenav.open();
              }
           }, 100);
        }
        
        this.cdr.detectChanges();
      });

    // Theme subscription
    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
      this.cdr.detectChanges();
    });

    // Theme subscription
    this.themeService.activeTheme$.subscribe(theme => {
      this.currentTheme = theme;
      this.cdr.detectChanges();
    });

    // Direction subscription
    this.themeService.direction$.subscribe(dir => {
      this.isRtl = dir === 'rtl';
      this.cdr.detectChanges();
    });

    // Global loading state handled at App level for covering dialogs
    // Logic moved to app.ts

    // Step 1: Count Check on Page Load
    this.loadUnreadCount();

    // Sidenav Clock Timer
    this.timerInstance = setInterval(() => {
      this.currentTime = new Date();
      this.cdr.detectChanges();
    }, 1000);

    // Dynamic Title based on Route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => {
        let child = this.router.routerState.snapshot.root;
        while (child.firstChild) {
          child = child.firstChild;
        }
        return child.data['title'] || child.data['breadcrumb'] || null;
      })
    ).subscribe((routeTitle) => {
      const baseName = this.companyName || 'ElectricApps';
      if (routeTitle) {
        this.titleService.setTitle(`${baseName} - ${routeTitle}`);
      } else {
        this.titleService.setTitle(baseName);
      }
    });

    this.isSuperAdmin = this.authService.getUserRole() === 'Super Admin';
    const assignedBranchIds = this.authService.getAssignedBranches() || '';
    this.hasMultipleBranches = assignedBranchIds.includes(',');

    if (this.isSuperAdmin || this.hasMultipleBranches) {
      this.loadBranches();
    }
  }

  loadBranches(): void {
    const companyId = this.authService.getCompanyId();
    if (companyId) {
      this.companyService.getBranchesByCompany(companyId).subscribe({
        next: (data) => {
          if (this.isSuperAdmin) {
            this.branches = data || [];
          } else {
            // Filter only the branches assigned to this user
            const assignedIds = (this.authService.getAssignedBranches() || '').split(',').map(b => b.trim());
            this.branches = (data || []).filter(b => assignedIds.includes(b.id.toString()));
          }
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Failed to load branches', err)
      });
    }
  }

  switchBranch(branch: any): void {
    const branchName = branch ? (branch.branchName || branch.name) : 'Global View';
    
    // ⚡ Trigger premium global loader
    this.loadingService.setLoading(true, `Switching to ${branchName}...`);
    
    // Wait for a small duration to show the loader, then reload
    setTimeout(() => {
      if (!branch) {
        // Switch to "All Branches" (Super Admin view)
        this.authService.setWorkingBranch(null, null);
      } else {
        this.authService.setWorkingBranch(branch.id, branch.branchName || branch.name);
      }
      
      // Reload the current page to refresh all data with the new X-Branch-Id header
      window.location.reload();
    }, 800);
  }

  private updateManifest(name: string): void {
    const manifestElement = this.document.getElementById('app-manifest') as HTMLLinkElement;
    if (manifestElement) {
      // Create a dynamic manifest blob to reflect the dynamic name
      const manifest = {
        name: name + ' - Inventory ERP',
        short_name: name,
        display: 'standalone',
        start_url: './',
        theme_color: '#3b82f6',
        background_color: '#f8fafc',
        icons: [
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      };
      const stringManifest = JSON.stringify(manifest);
      const blob = new Blob([stringManifest], { type: 'application/json' });
      const manifestUrl = URL.createObjectURL(blob);
      manifestElement.setAttribute('href', manifestUrl);
    }
  }

  ngOnDestroy(): void {
    if (this.timerInstance) {
      clearInterval(this.timerInstance);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }

  setTheme(themeName: string): void {
    this.themeService.setTheme(themeName);
  }

  toggleDirection(): void {
    this.themeService.toggleDirection();
  }

  toggleSidenav(): void {
    if (this.isMobile) {
      this.sidenav.toggle();
    }
    // On Desktop, we just toggle the 'collapsed' class via isSidenavOpened
    this.isSidenavOpened = !this.isSidenavOpened;
    this.cdr.detectChanges();
  }

  toggleStockDrawer(): void {
    this.isStockDrawerOpen = !this.isStockDrawerOpen;
    this.cdr.detectChanges();
  }

  toggleGlassMode(): void {
    this.isGlassMode = !this.isGlassMode;
    if (this.isGlassMode) {
      document.body.classList.add('glass-active');
    } else {
      document.body.classList.remove('glass-active');
    }
    this.cdr.detectChanges();
  }

  toggleTableDensity(): void {
    this.isCompactTable = !this.isCompactTable;
    if (this.isCompactTable) {
        document.body.classList.add('compact-density');
    } else {
        document.body.classList.remove('compact-density');
    }
    this.cdr.detectChanges();
  }

  logout(): void {
    this.authService.logout();
  }

  openProfile(): void {
    this.dialog.open(UserProfileComponent, {
      panelClass: 'user-profile-dialog-panel',
      maxWidth: '420px',
      autoFocus: false,
      enterAnimationDuration: '250ms',
      exitAnimationDuration: '200ms'
    });
  }
  openSettings() { }

  // Step 1 Helper: Load count
  loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (count) => {
        this.unreadCount = count;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load notification count', err)
    });
  }

  // Step 2: List Load on Bell Click
  loadNotifications(): void {
    this.cdr.detectChanges();
    this.notificationService.getUnreadNotifications().subscribe({
      next: (data) => {
        this.notifications = data;
        this.unreadCount = data.length;

        // Count update logic is fine, but we also rely on separate count API. 
        // This keeps them in sync when list is opened.
      },
      error: (err) => console.error('Failed to load notifications', err)
    });
  }

  // Step 3: Single Read on Click
  markAsRead(notification: NotificationDto): void {
    if (!notification.isRead) {
      this.cdr.detectChanges();
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          // Remove from local list or mark as read
          notification.isRead = true;
          this.cdr.detectChanges();
          this.notifications = this.notifications.filter(n => !n.isRead);
          if (this.unreadCount > 0) this.unreadCount--;

          // Navigate
          if (notification.targetUrl) {
            this.navigateTo(notification.targetUrl);
            this.cdr.detectChanges();
          }
        },
        error: (err) => console.error('Failed to mark as read', err)
      });
    } else {
      if (notification.targetUrl) {
        this.navigateTo(notification.targetUrl);
      }
    }
  }

  // Step 4: Bulk Read
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = [];
        this.unreadCount = 0;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to mark all as read', err)
    });
  }

  navigateTo(link: string): void {
    if (link) {
      this.router.navigate([link]);
    }
  }

  viewAllNotifications(): void {
    this.router.navigate(['/notifications']);
    this.cdr.detectChanges();
  }

  // Method to be called when menu is opened
  onMenuOpened(): void {
    this.loadNotifications();
  }

  getIconForType(type: string): string {
    switch (type?.toLowerCase()) {
      case 'warning': return 'warning';
      case 'success': return 'check_circle';
      case 'alert': return 'error';
      case 'info': return 'info';
      default: return 'notifications';
    }
  }

  showDeveloperInfo(): void {
    this.dialog.open(DeveloperInfoComponent, {
      panelClass: 'premium-dev-dialog',
      maxWidth: '400px',
      autoFocus: false
    });
  }

  resetConfig(): void {
    this.themeService.setTheme('indigo-pink'); // Default theme
    if (this.isDarkMode) this.themeService.toggleDarkMode();
    if (this.isRtl) this.themeService.toggleDirection();
    this.isConfigOpen = false;
    this.cdr.detectChanges();
  }
}
