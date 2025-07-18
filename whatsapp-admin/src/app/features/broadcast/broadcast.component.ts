import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl } from '@angular/forms';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import * as XLSX from 'xlsx';

import { 
  WhatsappService, 
  Campaign as ApiCampaign,
  ExcelBroadcastResponse
} from '../../core/services/whatsapp.service';

// Interfaces for the component
export interface ExcelContact {
  name: string;
  number: string;
}

interface BroadcastResult {
  success: boolean;
  message: string;
  total?: number;
  sent?: number;
  failed?: number;
  results?: Array<{
    success?: any;
    phone: string;
    name?: string;
    status: string;
    error?: string;
  }>;
}

interface BroadcastFormValue {
  excelFile: File | null;
  message: string;
  mediaFile: File | null;
  schedule: boolean;
  scheduleDate: string;
  scheduleTime: string;
  responseFlow: boolean;
  responseFlowForm: {
    steps: Array<{
      trigger: string;
      reply: string;
    }>;
  };
}

interface ResponseStepFormGroup extends FormGroup {
  value: {
    trigger: string;
    reply: string;
  };
  controls: {
    trigger: AbstractControl;
    reply: AbstractControl;
  };
}

import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-broadcast',
  templateUrl: './broadcast.component.html',
  styleUrls: ['./broadcast.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class BroadcastComponent implements OnInit {
  // Component state
  campaigns: ApiCampaign[] = [];
  isSending = false;
  invalidPhones: string[] = [];
  excelContacts: ExcelContact[] = [];
  excelFileName = '';
  mediaFileName = '';
  today = new Date();
  broadcastResult: BroadcastResult | null = null;
  showResults = false;
  selectedExcelFile: File | null = null;
  
  // Form groups
  broadcastForm!: FormGroup;
  private responseFlowForm!: FormGroup;
  
  constructor(
    private fb: FormBuilder,
    private whatsappService: WhatsappService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
  }

  private initializeForms(): void {
    // Initialize the response flow form with one empty step
    const initialStep = this.fb.group({
      trigger: [''],
      reply: ['']
    });

    this.broadcastForm = this.fb.group({
      excelFile: [null],
      message: ['', [Validators.required, Validators.maxLength(1000)]],
      mediaFile: [null],
      schedule: [false],
      scheduleDate: [this.formatDate(new Date())],
      scheduleTime: ['12:00'],
      responseFlow: [false],
      responseFlowForm: this.fb.group({
        steps: this.fb.array([initialStep])
      })
    });
    
    // Store reference to response flow form for easier access
    this.responseFlowForm = this.broadcastForm.get('responseFlowForm') as FormGroup;
  }

  ngOnInit(): void {
    this.loadCampaigns();
  }

  // Form array getter for response flow steps
  get responseFlowArray(): FormArray {
    const form = this.broadcastForm.get('responseFlowForm');
    return form?.get('steps') as FormArray || new FormArray([]);
  }

  // Get form controls safely
  getFormControl(path: string | string[]): AbstractControl | null {
    return this.broadcastForm.get(path);
  }

  loadCampaigns(): void {
    this.whatsappService.getCampaigns().subscribe({
      next: (data: ApiCampaign[]) => {
        this.campaigns = data;
      },
      error: (error) => {
        console.error('Error loading campaigns:', error);
      }
    });
  }

  onMediaFileChange(event: any): void {
    const file = event?.target?.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('El archivo es demasiado grande. El tamaño máximo permitido es 10MB.');
      return;
    }

    this.mediaFileName = file.name;
    this.broadcastForm.patchValue({
      mediaFile: file
    });
  }

  removeMediaFile(): void {
    this.mediaFileName = '';
    this.broadcastForm.patchValue({
      mediaFile: null
    });
    // Reset file input
    const fileInput = document.getElementById('mediaFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Maneja el evento de cambio en el input de archivo Excel
   * @param event Evento del input file
   */
  onExcelFileChange(event: any): void {
    // Reiniciar estado previo
    this.excelContacts = [];
    this.invalidPhones = [];
    
    // Obtener el archivo seleccionado
    const fileInput = event?.target;
    const file = fileInput?.files?.[0];
    
    // Validar que se haya seleccionado un archivo
    if (!file) {
      console.warn('No se ha seleccionado ningún archivo');
      return;
    }
    
    this.selectedExcelFile = file;
    
    // Validar extensión del archivo
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !validExtensions.includes(`.${fileExtension}`)) {
      console.error('Formato de archivo no válido. Por favor suba un archivo Excel (.xlsx, .xls, .csv)');
      this.resetFileInput(fileInput);
      return;
    }
    
    // Mostrar nombre del archivo
    this.excelFileName = file.name;
    
    // Configurar el lector de archivos
    const reader = new FileReader();
    
    // Manejar carga exitosa
    reader.onload = (e: any) => {
      try {
        // Leer el archivo como array de bytes
        const data = new Uint8Array(e.target.result);
        
        // Procesar el archivo Excel
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Validar que el archivo contenga hojas
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('El archivo no contiene hojas de cálculo');
        }
        
        // Obtener la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON con tipo explícito
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        this.processExcelData(jsonData);
        
        // Ya no se sincroniza el archivo con el formulario reactivo

      } catch (error) {
        console.error('Error al procesar el archivo Excel:', error);
        alert(`Error al procesar el archivo Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        // Limpiar solo el estado, NO el input file para evitar error de value
        // Limpiar el input file primero
        const excelInput = document.getElementById('excelFile') as HTMLInputElement;
        if (excelInput) {
          this.resetFileInput(excelInput);
        }
        // Luego limpia el estado del formulario
        this.excelFileName = '';
        this.excelContacts = [];
        this.invalidPhones = [];
        this.broadcastForm.patchValue({
          excelFile: null
        });
      }
    };

    reader.onerror = (error) => {
      console.error('Error al leer el archivo:', error);
      alert('Error al leer el archivo. Por favor, inténtelo de nuevo.');
      const excelInput = document.getElementById('excelFile') as HTMLInputElement;
if (excelInput) {
  this.resetFileInput(excelInput);
}
    };

    reader.readAsArrayBuffer(file);
  }

  /**
   * Reinicia el input de archivo de forma segura
   * @param fileInput Elemento input de tipo file
   */
  resetFileInput(fileInput: HTMLInputElement): void {
    if (!fileInput) return;
    try {
      // Solo se puede asignar una cadena vacía
      fileInput.value = '';
    } catch (error) {
      console.error('Error al reiniciar el input de archivo:', error);
    }
  }

  addResponseStep(trigger: string = '', reply: string = ''): void {
    const responseFlowForm = this.broadcastForm?.get('responseFlowForm') as FormGroup;
    if (!responseFlowForm) {
      console.error('No se pudo encontrar el formulario de flujo de respuestas');
      return;
    }
    const steps = responseFlowForm.get('steps') as FormArray;
    if (!steps) {
      console.error('No se pudo encontrar el arreglo de pasos');
      return;
    }
    steps.push(this.fb.group({
      trigger: [trigger, Validators.required],
      reply: [reply, Validators.required]
    }));
  }

  removeResponseStep(index: number): void {
    const responseFlowForm = this.broadcastForm?.get('responseFlowForm') as FormGroup;
    if (!responseFlowForm) return;
    const steps = responseFlowForm.get('steps') as FormArray;
    if (!steps || steps.length <= 1) return;
    steps.removeAt(index);
  }

  addNewStep(): void {
    this.addResponseStep('', '');
  }

  onSubmit(): void {
    if (this.broadcastForm.invalid || this.excelContacts.length === 0) {
      this.markFormGroupTouched(this.broadcastForm);
      return;
    }
    this.isSending = true;
    this.showResults = false;
    this.broadcastResult = null;
    const formData = new FormData();
    const formValue = this.broadcastForm.value;
    // Add form values to FormData
    formData.append('message', formValue.message);
    if (formValue.mediaFile) {
      formData.append('media', formValue.mediaFile);
    }
    // Add Excel file
    if (this.selectedExcelFile) {
      formData.append('excel', this.selectedExcelFile);
    }
    // Add response flow if enabled
    if (formValue.responseFlow) {
      formData.append('responseFlow', JSON.stringify(formValue.responseFlowForm.steps));
    }
    // Add scheduling if enabled
    if (formValue.schedule) {
      const scheduleDateTime = new Date(`${formValue.scheduleDate}T${formValue.scheduleTime}`);
      formData.append('schedule', scheduleDateTime.toISOString());
    }
    this.whatsappService.sendExcelBroadcast(formData).pipe(
      finalize(() => {
        this.isSending = false;
      })
    ).subscribe({
      next: (response: ExcelBroadcastResponse) => {
        this.broadcastResult = {
          success: response.success,
          message: response.message || 'Mensajes enviados correctamente',
          total: response.total,
          sent: response.sent,
          failed: response.failed,
          results: response.results || []
        };
        this.showResults = true;
      },
      error: (error: any) => {
        console.error('Error sending broadcast:', error);
        this.broadcastResult = {
          success: false,
          message: error.error?.message || 'Error al enviar los mensajes. Por favor, inténtelo de nuevo.'
        };
        this.showResults = true;
      }
    });
  }

  retryFailed(): void {
    if (!this.broadcastResult?.results) return;
    const failedResults = this.broadcastResult.results.filter(r => !r.success);
    if (failedResults.length === 0) return;
    this.isSending = true;
    this.broadcastResult = null;
    const formData = new FormData();
    const formValue = this.broadcastForm.value;
    // Add form values to FormData
    formData.append('message', formValue.message);
    if (formValue.mediaFile) {
      formData.append('media', formValue.mediaFile);
    }
    // Add only failed contacts
    const failedContacts = failedResults.map(r => ({
      phone: r.phone,
      name: r.name || ''
    }));
    formData.append('contacts', JSON.stringify(failedContacts));
    this.whatsappService.sendExcelBroadcast(formData).pipe(
      finalize(() => {
        this.isSending = false;
      })
    ).subscribe({
      next: (response: ExcelBroadcastResponse) => {
        this.broadcastResult = {
          success: response.success,
          message: response.message || 'Reintento de envío completado',
          total: response.total,
          sent: response.sent,
          failed: response.failed,
          results: [...(this.broadcastResult?.results || []), ...(response.results || [])]
        };
        this.showResults = true;
      },
      error: (error: any) => {
        console.error('Error retrying failed messages:', error);
        this.broadcastResult = {
          success: false,
          message: error.error?.message || 'Error al reintentar el envío. Por favor, inténtelo de nuevo.'
        };
        this.showResults = true;
      }
    });
  }

  /**
   * Marca todos los controles de un form group como touched
   * @param formGroup Grupo o arreglo de formulario a marcar
   */
  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    if (!formGroup?.controls) return;
    
    Object.values(formGroup.controls).forEach((control: AbstractControl) => {
      if (control) {
        control.markAsTouched();
        
        if (control instanceof FormGroup || control instanceof FormArray) {
          this.markFormGroupTouched(control);
        }
      }
    });
  }

  /**
   * Formatea una fecha en formato YYYY-MM-DD
   * @param date Fecha a formatear
   * @returns Fecha formateada como cadena YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    try {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formateando fecha:', error);
      // Retorna la fecha actual en caso de error
      const today = new Date();
      return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    }
  }

  /**
   * Reinicia el formulario a su estado inicial
   */
  resetForm(): void {
    // Reset form values
    this.broadcastForm.reset({
      excelFile: null,
      message: '',
      mediaFile: null,
      schedule: false,
      scheduleDate: this.formatDate(new Date()),
      scheduleTime: '12:00',
      responseFlow: false,
      responseFlowForm: {
        steps: []
      }
    });
    
    // Reset file inputs
    const excelInput = document.getElementById('excelFile') as HTMLInputElement;
    const mediaInput = document.getElementById('mediaFile') as HTMLInputElement;
    
    if (excelInput) {
  // Solo se puede asignar una cadena vacía
  excelInput.value = '';
}
    if (mediaInput) mediaInput.value = '';
    
    // Reset component state
    this.excelContacts = [];
    this.invalidPhones = [];
    this.excelFileName = '';
    this.mediaFileName = '';
    this.broadcastResult = null;
    this.showResults = false;
    
    // Add one empty response step
    this.addResponseStep();
  }

  /**
   * Limpia el número de teléfono eliminando caracteres no numéricos
   */
  public cleanPhoneNumber(phone: string): string {
    return (phone || '').replace(/[^\d]/g, '');
  }

  /**
   * Valida si un número de teléfono es válido (ejemplo: 10-15 dígitos)
   */
  public isValidPhoneNumber(phone: string): boolean {
    return /^\d{10,15}$/.test(phone);
  }

  /**
   * Inserta una variable en el textarea del mensaje
   * @param variable Variable a insertar (ej: {nombre})
   */
  insertVariable(variable: string): void {
    const messageControl = this.broadcastForm.get('message');
    if (!messageControl) return;

    const currentValue = messageControl.value || '';
    const newValue = currentValue + variable;
    messageControl.setValue(newValue);
    
    // Enfocar el textarea después de insertar
    setTimeout(() => {
      const textarea = document.getElementById('message') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newValue.length, newValue.length);
      }
    }, 100);
  }

  /**
   * Obtiene una vista previa del mensaje con el primer contacto
   * @returns Mensaje con variables reemplazadas
   */
  getMessagePreview(): string {
    const message = this.broadcastForm.get('message')?.value || '';
    if (!message || this.excelContacts.length === 0) return '';

    const firstContact = this.excelContacts[0];
    return message.replace(/{nombre}/g, firstContact.name);
  }

  /**
   * Obtiene la hora actual de Colombia
   * @returns Hora actual formateada en zona horaria de Colombia
   */
  getCurrentColombiaTime(): string {
    try {
      const now = new Date();
      return now.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Error obteniendo hora de Colombia:', error);
      return new Date().toLocaleString();
    }
  }

  /**
   * Obtiene una vista previa de cuándo se enviará el mensaje programado
   * @returns Fecha y hora formateada para mostrar al usuario
   */
  getSchedulePreview(): string {
    const scheduleDate = this.broadcastForm.get('scheduleDate')?.value;
    const scheduleTime = this.broadcastForm.get('scheduleTime')?.value;
    
    if (!scheduleDate || !scheduleTime) return '';
    
    try {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      
      // Verificar si la fecha es válida
      if (isNaN(scheduledDateTime.getTime())) return '';
      
      // Formatear para mostrar en hora de Colombia
      return scheduledDateTime.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando vista previa de programación:', error);
      return '';
    }
  }

  /**
   * Obtiene el texto del botón de envío según el estado actual
   * @returns Texto apropiado para el botón de envío
   */
  getSubmitButtonText(): string {
    if (this.isSending) {
      return this.broadcastForm.get('schedule')?.value 
        ? 'Programando envío...' 
        : 'Enviando mensajes...';
    }
    
    return this.broadcastForm.get('schedule')?.value 
      ? 'Programar Envío' 
      : 'Enviar Difusión';
  }

  /**
   * Obtiene el icono apropiado para el resultado
   * @returns Icono según el tipo de resultado
   */
  getResultIcon(): string {
    if (!this.broadcastResult) return '❓';
    
    if (this.broadcastResult.success) {
      return this.isScheduledSend() ? '📅' : '✅';
    }
    
    return '❌';
  }

  /**
   * Obtiene el título apropiado para el resultado
   * @returns Título según el tipo de resultado
   */
  getResultTitle(): string {
    if (!this.broadcastResult) return 'Resultado';
    
    if (this.broadcastResult.success) {
      return this.isScheduledSend() ? 'Envío Programado Exitosamente' : 'Envío Completado';
    }
    
    return 'Error en el Envío';
  }

  /**
   * Verifica si el envío actual es programado
   * @returns true si es un envío programado
   */
  isScheduledSend(): boolean {
    return this.broadcastForm.get('schedule')?.value === true;
  }

  /**
   * Obtiene la fecha y hora programada formateada
   * @returns Fecha y hora programada en formato legible
   */
  getScheduledTimeFormatted(): string {
    const scheduleDate = this.broadcastForm.get('scheduleDate')?.value;
    const scheduleTime = this.broadcastForm.get('scheduleTime')?.value;
    
    if (!scheduleDate || !scheduleTime) return '';
    
    try {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      
      if (isNaN(scheduledDateTime.getTime())) return '';
      
      return scheduledDateTime.toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formateando fecha programada:', error);
      return '';
    }
  }

  /**
   * Crea una nueva difusión limpiando el formulario
   */
  createNewBroadcast(): void {
    // Cerrar el modal de resultados
    this.showResults = false;
    this.broadcastResult = null;
    
    // Resetear el formulario manteniendo algunos valores por conveniencia
    const currentSchedule = this.broadcastForm.get('schedule')?.value;
    const currentScheduleDate = this.broadcastForm.get('scheduleDate')?.value;
    const currentScheduleTime = this.broadcastForm.get('scheduleTime')?.value;
    
    // Limpiar formulario
    this.resetForm();
    
    // Mantener configuración de programación si estaba activada
    if (currentSchedule) {
      this.broadcastForm.patchValue({
        schedule: true,
        scheduleDate: currentScheduleDate,
        scheduleTime: currentScheduleTime
      });
    }
    
    // Scroll hacia arriba para mejor UX
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Enfocar el campo de archivo Excel
    setTimeout(() => {
      const excelInput = document.getElementById('excelFile');
      if (excelInput) {
        excelInput.focus();
      }
    }, 500);
  }

  /**
   * Descarga la plantilla de Excel con el formato correcto
   */
  downloadTemplate(): void {
    console.log('📥 Descargando plantilla de Excel...');
    
    this.whatsappService.downloadTemplate().subscribe({
      next: (blob: Blob) => {
        // Crear URL del blob
        const url = window.URL.createObjectURL(blob);
        
        // Crear elemento de descarga
        const link = document.createElement('a');
        link.href = url;
        link.download = `plantilla_contactos_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Agregar al DOM, hacer clic y remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar URL del blob
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Plantilla descargada exitosamente');
      },
      error: (error) => {
        console.error('❌ Error descargando plantilla:', error);
        alert('Error al descargar la plantilla. Por favor, inténtelo de nuevo.');
      }
    });
  }

  /**
   * Procesa los datos extraídos del archivo Excel y valida los encabezados y contactos
   * @param jsonData Matriz de filas del Excel
   */
  processExcelData(jsonData: any[][]): void {
    this.excelContacts = [];
    this.invalidPhones = [];

    if (!jsonData || jsonData.length < 2) {
      alert('El archivo Excel no contiene datos suficientes.');
      return;
    }

    // DEBUG: Mostrar encabezados y filas
    console.log('jsonData:', jsonData);
    console.log('Encabezados detectados: ' + JSON.stringify(jsonData[0]));
    // Buscar encabezados bilingües
    const headerRow = jsonData[0].map((h: any) => (h || '').toString().trim().toLowerCase());
    console.log('headerRow mapeado: ' + JSON.stringify(headerRow));
    let nameIdx = headerRow.findIndex((h: string) => h === 'nombre' || h === 'name');
    let numberIdx = headerRow.findIndex((h: string) => h === 'número' || h === 'numero' || h === 'number');

    if (nameIdx === -1 || numberIdx === -1) {
      alert('El archivo debe tener columnas "nombre"/"name" y "número"/"number".');
      return;
    }

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || (!row[nameIdx] && !row[numberIdx])) continue;
      const name = (row[nameIdx] || '').toString().trim();
      const number = (row[numberIdx] || '').toString().trim();
      const cleaned = this.cleanPhoneNumber(number);
      console.log(`[Fila ${i}] name: '${name}', number: '${number}', cleaned: '${cleaned}'`);
      if (this.isValidPhoneNumber(cleaned)) {
        console.log(`--> VÁLIDO: { name: '${name}', number: '${cleaned}' }`);
        this.excelContacts.push({ name, number: cleaned });
        this.cdr.detectChanges();
      } else {
        console.log(`--> INVÁLIDO: '${number}' (limpio: '${cleaned}')`);
        this.invalidPhones.push(number);
      }
    }

    if (this.excelContacts.length === 0) {
      alert('No se encontraron contactos válidos en el archivo.');
    }
  }

}
