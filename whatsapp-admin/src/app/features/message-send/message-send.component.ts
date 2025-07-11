import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { NotificationService } from '../../core/services/notification.service';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';
import { Router } from '@angular/router';


@Component({
  selector: 'app-message-send',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    FileUploadComponent
  ],
  templateUrl: './message-send.component.html',
  styleUrls: ['./message-send.component.scss']
})
export class MessageSendComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  whatsappService = inject(WhatsappService); // Made public for template access
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  
  messageForm: FormGroup;
  isSending = false;

  private subscriptions = new Subscription();
  selectedFile: File | null = null;
  
  // Expose the connection status as an observable
  connectionStatus$ = this.whatsappService.connectionStatus$;
  
  // Computed property to get the phone form control
  get phone() {
    return this.messageForm.get('phone');
  }
  
  // Computed property to get the message form control
  get message() {
    return this.messageForm.get('message');
  }

  constructor() {
    // Initialize the form with validation
    this.messageForm = this.fb.group({
      phone: ['', [
        Validators.required, 
        Validators.pattern(/^[0-9]+$/),
        Validators.minLength(10),
        Validators.maxLength(15)
      ]],
      message: ['', [
        Validators.required,
        Validators.maxLength(1000)
      ]]
    });
  }

  ngOnInit(): void {
    // Load any saved draft from local storage
    this.loadDraft();
    
    // Auto-save form changes
    this.messageForm.valueChanges.subscribe(() => {
      this.saveDraft();
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onFileSelected(files: File[]): void {
    if (files && files.length > 0) {
      this.selectedFile = files[0];
    }
  }

  onFileRemoved(file: File): void {
    if (this.selectedFile === file) {
      this.selectedFile = null;
    }
  }

  onSubmit(): void {
    console.log('[DEBUG] onSubmit called');
    alert('[DEBUG] onSubmit called');
    if (this.messageForm.invalid) {
      this.messageForm.markAllAsTouched();
      this.notificationService.error('Por favor complete todos los campos requeridos');
      console.warn('[DEBUG] Formulario inválido');
      alert('[DEBUG] Formulario inválido');
      return;
    }

    const { phone, message } = this.messageForm.value;
    this.isSending = true;
    // Aseguramos que 'phones' sea un array
    const phones = [phone];
    console.log('[DEBUG] Enviando mensaje:', { phones, message, file: this.selectedFile });
    alert('[DEBUG] Enviando mensaje: ' + JSON.stringify({ phones, message, file: !!this.selectedFile }));

    const sendBroadcast$ = this.whatsappService.sendBroadcast(
      phones,
      message,
      this.selectedFile || undefined
    );

    this.subscriptions.add(
      sendBroadcast$.subscribe({
        next: () => {
          console.log('[DEBUG] Mensaje enviado correctamente');
          alert('[DEBUG] Mensaje enviado correctamente');
          this.notificationService.success('Mensaje enviado correctamente');
          this.messageForm.reset();
          this.selectedFile = null;
          this.clearDraft();
          console.log('[DEBUG] Redireccionando a /messages');
          alert('[DEBUG] Redireccionando a /messages');
          this.router.navigate(['/messages']);
        },
        error: (error) => {
          console.error('[DEBUG] Error sending message:', error);
          alert('[DEBUG] Error sending message: ' + (error?.error?.message || error));
          this.notificationService.error(
            error.error?.message || 'Error al enviar el mensaje. Por favor, intente nuevamente.'
          );
        },
        complete: () => {
          this.isSending = false;
          console.log('[DEBUG] Envío de mensaje completado');
        }
      })
    );
  }

  private saveDraft(): void {
    const draft = {
      ...this.messageForm.value,
      hasFile: !!this.selectedFile
    };
    localStorage.setItem('messageDraft', JSON.stringify(draft));
  }

  private loadDraft(): void {
    const draft = localStorage.getItem('messageDraft');
    if (draft) {
      try {
        const { phone, message, hasFile } = JSON.parse(draft);
        this.messageForm.patchValue({ phone, message });
        // Note: File cannot be restored from local storage
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }

  private clearDraft(): void {
    localStorage.removeItem('messageDraft');
  }
}
