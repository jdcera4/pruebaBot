import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { User, UserRole, WhatsAppConfig } from '../../../core/models/user.model';

interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  requiredPermission?: { resource: string; action: string };
  requiredFeature?: string;
  badge?: string;
  children?: NavigationItem[];
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: User | null = null;
  whatsappConfig: WhatsAppConfig | null = null;
  isCollapsed = false;
  
  // Elementos de navegación por rol
  navigationItems: NavigationItem[] = [];

  // Elementos base disponibles
  private allNavigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      icon: '📊',
      route: '/dashboard'
    },
    {
      label: 'Contactos',
      icon: '👥',
      route: '/contacts',
      requiredPermission: { resource: 'contacts', action: 'read' },
      requiredFeature: 'contacts'
    },
    {
      label: 'Mensajes',
      icon: '💬',
      route: '/messages',
      requiredPermission: { resource: 'messages', action: 'read' },
      requiredFeature: 'messages',
      children: [
        {
          label: 'Ver Mensajes',
          icon: '📋',
          route: '/messages',
          requiredPermission: { resource: 'messages', action: 'read' }
        },
        {
          label: 'Enviar Mensaje',
          icon: '✉️',
          route: '/messages/new',
          requiredPermission: { resource: 'messages', action: 'send' }
        }
      ]
    },
    {
      label: 'Campañas',
      icon: '📢',
      route: '/broadcast',
      requiredPermission: { resource: 'campaigns', action: 'read' },
      requiredFeature: 'campaigns'
    },
    {
      label: 'Flujos',
      icon: '🔄',
      route: '/flows',
      requiredPermission: { resource: 'flows', action: 'read' },
      requiredFeature: 'flows'
    },
    {
      label: 'Análisis',
      icon: '📈',
      route: '/analytics',
      requiredPermission: { resource: 'analytics', action: 'read' },
      requiredFeature: 'analytics'
    },
    {
      label: 'Reportes',
      icon: '📄',
      route: '/reports',
      requiredPermission: { resource: 'reports', action: 'read' },
      requiredFeature: 'reports'
    },
    {
      label: 'Facturación',
      icon: '💰',
      route: '/billing',
      requiredPermission: { resource: 'billing', action: 'read' },
      requiredFeature: 'billing'
    },
    {
      label: 'Usuarios',
      icon: '👤',
      route: '/users',
      requiredPermission: { resource: 'users', action: 'read' },
      requiredFeature: 'users'
    },
    {
      label: 'Configuración',
      icon: '⚙️',
      route: '/settings',
      requiredPermission: { resource: 'settings', action: 'read' },
      requiredFeature: 'settings'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Suscribirse a cambios del usuario actual
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.updateNavigation();
      });

    // Suscribirse a cambios de configuración de WhatsApp
    this.authService.whatsappConfig$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        this.whatsappConfig = config;
        this.updateNavigation();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateNavigation(): void {
    if (!this.currentUser || !this.whatsappConfig) {
      this.navigationItems = [];
      return;
    }

    // Filtrar elementos de navegación según permisos y características disponibles
    this.navigationItems = this.allNavigationItems.filter(item => {
      return this.canShowNavigationItem(item);
    }).map(item => ({
      ...item,
      children: item.children?.filter(child => this.canShowNavigationItem(child))
    }));
  }

  private canShowNavigationItem(item: NavigationItem): boolean {
    // Verificar permisos si están definidos
    if (item.requiredPermission) {
      const hasPermission = this.authService.hasPermission(
        item.requiredPermission.resource,
        item.requiredPermission.action
      );
      if (!hasPermission) return false;
    }

    // Verificar características disponibles si están definidas
    if (item.requiredFeature) {
      const hasFeature = this.authService.canAccessFeature(item.requiredFeature);
      if (!hasFeature) return false;
    }

    return true;
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getRoleDisplayName(role: UserRole): string {
    const roleNames = {
      [UserRole.ADMIN]: 'Administrativo',
      [UserRole.MARKETING]: 'Marketing',
      [UserRole.ECONOMY]: 'Economía'
    };
    return roleNames[role] || role;
  }

  getRoleColor(role: UserRole): string {
    const roleColors = {
      [UserRole.ADMIN]: '#1565c0',
      [UserRole.MARKETING]: '#25d366',
      [UserRole.ECONOMY]: '#ff9800'
    };
    return roleColors[role] || '#666';
  }

  getWhatsAppInstanceName(): string {
    return this.whatsappConfig?.instanceName || 'WhatsApp';
  }
}