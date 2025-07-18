import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  status: any = null;
  qrData: string | null = null;
  isLoading = true;
  errorMsg = '';
  isConnected = false;
  needsQR = false;
  private qrCheckSubscription?: Subscription;

  constructor(private whatsappService: WhatsappService) {}

  ngOnInit(): void {
    this.loadDashboardData();
    this.startQrPolling();
  }

  ngOnDestroy(): void {
    if (this.qrCheckSubscription) {
      this.qrCheckSubscription.unsubscribe();
    }
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.whatsappService.getDashboardStats().subscribe({
      next: (stats: any) => {
        this.status = {
          ...stats,
          connected: this.isConnected
        };
        this.isLoading = false;
      },
      error: (err: any) => {
        console.warn('Dashboard stats endpoint not available, using default values');
        this.status = {
          connected: this.isConnected,
          totalContacts: 0,
          totalMessages: 0,
          campaigns: { total: 0, completed: 0, inProgress: 0 },
          unreadMessages: 0
        };
        this.isLoading = false;
      }
    });
  }

  private startQrPolling(): void {
    // Verificar QR inmediatamente
    this.checkQrStatus();
    
    // Verificar QR cada 3 segundos
    this.qrCheckSubscription = interval(3000).subscribe(() => {
      this.checkQrStatus();
    });
  }

  private checkQrStatus(): void {
    this.whatsappService.getQrStatus().subscribe({
      next: (qrStatus) => {
        this.isConnected = qrStatus.connected || false;
        this.needsQR = qrStatus.needsQR || false;
        this.qrData = qrStatus.qrCode || null;
        
        // Actualizar el estado en el dashboard
        if (this.status) {
          this.status.connected = this.isConnected;
        }
        
        // Si se conectó, detener el polling del QR
        if (this.isConnected && this.qrCheckSubscription) {
          this.qrCheckSubscription.unsubscribe();
          this.qrData = null;
          this.needsQR = false;
          
          // Recargar datos del dashboard
          this.loadDashboardData();
        }
      },
      error: (err) => {
        console.error('Error checking QR status:', err);
        this.isConnected = false;
        this.needsQR = true;
      }
    });
  }

  refreshQr(): void {
    this.qrData = null;
    this.checkQrStatus();
  }
}
