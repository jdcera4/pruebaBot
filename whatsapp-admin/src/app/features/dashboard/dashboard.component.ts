import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WhatsappService } from '../../core/services/whatsapp.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  status: any = null;
  qrData: string | null = null;
  isLoading = true;
  errorMsg = '';

  constructor(private whatsappService: WhatsappService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.whatsappService.getDashboardStats().subscribe({
      next: (status: any) => {
        this.status = status;
        this.isLoading = false;
        if (status?.needsQR) {
          this.loadQr();
        }
      },
      error: (err: any) => {
        console.warn('Dashboard stats endpoint not available, using default values');
        // Set default values when the endpoint is not available
        this.status = {
          connected: false,
          contactsCount: 0,
          queuedMessages: 0,
          uptime: 0,
          clientInfo: {}
        };
        this.isLoading = false;
        
        // Try to check connection status separately
        this.checkConnectionStatus();
      }
    });
  }
  
  private checkConnectionStatus(): void {
    this.whatsappService.checkConnection().subscribe({
      next: (status) => {
        if (status.connected) {
          this.status = {
            ...this.status,
            connected: true,
            clientInfo: { pushname: 'Connected' }
          };
        }
      },
      error: () => {
        // Ignore connection check errors
      }
    });
  }

  loadQr(): void {
    this.qrData = null;
    this.whatsappService.getQrStatus().subscribe({
      next: (qrRes: any) => {
        this.qrData = qrRes.qr || null;
      },
      error: () => {
        this.qrData = null;
      }
    });
  }
}
