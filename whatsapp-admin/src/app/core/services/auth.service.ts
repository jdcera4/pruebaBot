import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { 
  User, 
  UserRole, 
  LoginRequest, 
  LoginResponse, 
  WhatsAppConfig,
  ROLE_CONFIGS,
  ROLE_PERMISSIONS
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private whatsappConfigSubject = new BehaviorSubject<WhatsAppConfig | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public whatsappConfig$ = this.whatsappConfigSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const storedUser = localStorage.getItem('currentUser');
    const storedConfig = localStorage.getItem('whatsappConfig');
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
        
        if (storedConfig) {
          const config = JSON.parse(storedConfig);
          this.whatsappConfigSubject.next(config);
        } else {
          // Generar config basado en el rol del usuario
          const config = ROLE_CONFIGS[user.role as UserRole];
          this.whatsappConfigSubject.next(config);
        }
      } catch (error) {
        console.error('Error loading stored user:', error);
        this.logout();
      }
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    // Por ahora simulamos el login, luego conectaremos con el backend real
    return this.simulateLogin(credentials).pipe(
      tap(response => {
        if (response.success) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('whatsappConfig', JSON.stringify(response.whatsappConfig));
          localStorage.setItem('authToken', response.token);
          
          this.currentUserSubject.next(response.user);
          this.whatsappConfigSubject.next(response.whatsappConfig);
        }
      })
    );
  }

  private simulateLogin(credentials: LoginRequest): Observable<LoginResponse> {
    // Usuarios de prueba
    const testUsers: Record<string, User> = {
      'admin': {
        id: '1',
        username: 'admin',
        email: 'admin@empresa.com',
        role: UserRole.ADMIN,
        whatsappInstance: 'admin-instance',
        permissions: ROLE_PERMISSIONS[UserRole.ADMIN],
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true,
        profile: {
          firstName: 'Administrador',
          lastName: 'Sistema',
          department: 'Administración',
          avatar: 'https://ui-avatars.com/api/?name=Admin&background=1565c0&color=fff'
        }
      },
      'marketing': {
        id: '2',
        username: 'marketing',
        email: 'marketing@empresa.com',
        role: UserRole.MARKETING,
        whatsappInstance: 'marketing-instance',
        permissions: ROLE_PERMISSIONS[UserRole.MARKETING],
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true,
        profile: {
          firstName: 'Usuario',
          lastName: 'Marketing',
          department: 'Marketing',
          avatar: 'https://ui-avatars.com/api/?name=Marketing&background=25d366&color=fff'
        }
      },
      'economia': {
        id: '3',
        username: 'economia',
        email: 'economia@empresa.com',
        role: UserRole.ECONOMY,
        whatsappInstance: 'economy-instance',
        permissions: ROLE_PERMISSIONS[UserRole.ECONOMY],
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true,
        profile: {
          firstName: 'Usuario',
          lastName: 'Economía',
          department: 'Economía',
          avatar: 'https://ui-avatars.com/api/?name=Economia&background=ff9800&color=fff'
        }
      }
    };

    return new Observable<LoginResponse>(observer => {
      setTimeout(() => {
        const user = testUsers[credentials.username.toLowerCase()];
        
        if (user && credentials.password === '123456') {
          const whatsappConfig = ROLE_CONFIGS[user.role];
          
          observer.next({
            success: true,
            user: user,
            token: `token_${user.id}_${Date.now()}`,
            whatsappConfig: whatsappConfig
          });
        } else {
          observer.next({
            success: false,
            user: null as any,
            token: '',
            whatsappConfig: null as any
          });
        }
        observer.complete();
      }, 1000); // Simular delay de red
    });
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('whatsappConfig');
    localStorage.removeItem('authToken');
    
    this.currentUserSubject.next(null);
    this.whatsappConfigSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentWhatsAppConfig(): WhatsAppConfig | null {
    return this.whatsappConfigSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  hasPermission(resource: string, action: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    return user.permissions.some(permission => 
      permission.resource === resource && 
      permission.actions.includes(action)
    );
  }

  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  canAccessFeature(feature: string): boolean {
    const config = this.getCurrentWhatsAppConfig();
    return config?.allowedFeatures.includes(feature) || false;
  }

  getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // Método para cambiar de instancia de WhatsApp (si el usuario tiene permisos)
  switchWhatsAppInstance(instanceId: string): Observable<boolean> {
    const user = this.getCurrentUser();
    if (!user || !this.hasPermission('whatsapp', 'configure')) {
      return of(false);
    }

    // Aquí iría la lógica para cambiar de instancia
    // Por ahora solo simulamos
    return of(true);
  }

  // Método para obtener estadísticas del usuario actual
  getUserStats(): Observable<any> {
    const user = this.getCurrentUser();
    if (!user) return of(null);

    // Simular estadísticas basadas en el rol
    const mockStats = {
      [UserRole.ADMIN]: {
        totalUsers: 15,
        activeInstances: 3,
        totalMessages: 1250,
        systemHealth: 98
      },
      [UserRole.MARKETING]: {
        activeCampaigns: 8,
        totalContacts: 2500,
        conversionRate: 15.5,
        totalMessages: 850
      },
      [UserRole.ECONOMY]: {
        totalInvoices: 45,
        pendingPayments: 12,
        totalRevenue: 125000,
        totalMessages: 320
      }
    };

    return of(mockStats[user.role]);
  }
}