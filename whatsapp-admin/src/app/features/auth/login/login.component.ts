import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  // Usuarios de demostración
  demoUsers = [
    {
      username: 'admin',
      password: '123456',
      role: 'Administrativo',
      description: 'Acceso completo al sistema',
      color: '#1565c0',
      icon: '👨‍💼'
    },
    {
      username: 'marketing',
      password: '123456', 
      role: 'Marketing',
      description: 'Campañas y flujos de conversación',
      color: '#25d366',
      icon: '📢'
    },
    {
      username: 'economia',
      password: '123456',
      role: 'Economía', 
      description: 'Reportes y facturación',
      color: '#ff9800',
      icon: '💰'
    }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.createForm();
    
    // Si ya está autenticado, redirigir al dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  private createForm(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Login exitoso:', response.user);
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'Credenciales inválidas. Verifique su usuario y contraseña.';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error en login:', error);
        this.errorMessage = 'Error de conexión. Intente nuevamente.';
        this.isLoading = false;
      }
    });
  }

  loginWithDemo(demoUser: any): void {
    this.loginForm.patchValue({
      username: demoUser.username,
      password: demoUser.password
    });
    
    // Auto-submit después de un breve delay para mostrar la animación
    setTimeout(() => {
      this.onSubmit();
    }, 300);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  // Getters para validación en el template
  get username() {
    return this.loginForm.get('username');
  }

  get password() {
    return this.loginForm.get('password');
  }

  get isFormValid() {
    return this.loginForm.valid;
  }
}