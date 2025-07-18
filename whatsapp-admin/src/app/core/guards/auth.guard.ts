import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return false;
    }

    // Verificar permisos específicos si están definidos en la ruta
    const requiredPermission = route.data?.['requiredPermission'];
    if (requiredPermission) {
      const hasPermission = this.authService.hasPermission(
        requiredPermission.resource,
        requiredPermission.action
      );
      
      if (!hasPermission) {
        // Redirigir al dashboard si no tiene permisos
        this.router.navigate(['/dashboard']);
        return false;
      }
    }

    return true;
  }
}