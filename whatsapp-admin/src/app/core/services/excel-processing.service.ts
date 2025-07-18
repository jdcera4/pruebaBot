import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import {
  ExcelProcessingResult,
  ProcessedContact,
  LeadSourceGroup,
  ColumnMapping,
  ProcessingStats,
  ExcelError,
  ExcelType,
  EXCEL_CONFIGS,
  COLUMN_MAPPINGS,
  ColumnType,
  MessageTemplate
} from '../models/excel-processing.model';

@Injectable({
  providedIn: 'root'
})
export class ExcelProcessingService {

  constructor() { }

  /**
   * Procesa un archivo Excel y extrae contactos con análisis inteligente
   */
  processExcelFile(file: File): Observable<ExcelProcessingResult> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        try {
          const startTime = Date.now();
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('El archivo no contiene hojas de cálculo válidas');
          }

          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          
          if (jsonData.length === 0) {
            throw new Error('El archivo está vacío o no contiene datos válidos');
          }

          const result = this.analyzeAndProcessData(jsonData, startTime);
          observer.next(result);
          observer.complete();
          
        } catch (error) {
          observer.error(error);
        }
      };

      reader.onerror = () => {
        observer.error(new Error('Error al leer el archivo'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Analiza y procesa los datos del Excel
   */
  private analyzeAndProcessData(data: any[], startTime: number): ExcelProcessingResult {
    const errors: ExcelError[] = [];
    const validContacts: ProcessedContact[] = [];
    
    // 1. Detectar tipo de Excel y mapear columnas
    const columnMapping = this.detectAndMapColumns(data[0]);
    const excelType = this.detectExcelType(columnMapping);
    const config = EXCEL_CONFIGS[excelType];

    console.log('Tipo de Excel detectado:', excelType);
    console.log('Mapeo de columnas:', columnMapping);

    // 2. Procesar cada fila
    data.forEach((row, index) => {
      try {
        const contact = this.processRow(row, columnMapping, index + 2);
        if (contact.isValid) {
          validContacts.push(contact);
        } else {
          contact.validationErrors.forEach(error => {
            errors.push({
              row: index + 2,
              error: error,
              severity: 'error'
            });
          });
        }
      } catch (error) {
        errors.push({
          row: index + 2,
          error: `Error procesando fila: ${error}`,
          severity: 'error'
        });
      }
    });

    // 3. Agrupar por origen de lead si aplica
    const leadSources = this.groupByLeadSource(validContacts, config);

    // 4. Generar estadísticas
    const processingTime = Date.now() - startTime;
    const stats: ProcessingStats = {
      totalProcessed: data.length,
      validContacts: validContacts.length,
      invalidContacts: data.length - validContacts.length,
      duplicates: this.countDuplicates(validContacts),
      leadSourcesFound: leadSources.length,
      processingTime
    };

    return {
      success: true,
      totalRows: data.length,
      validContacts,
      errors,
      leadSources,
      columnMapping,
      processingStats: stats
    };
  }

  /**
   * Detecta y mapea las columnas del Excel
   */
  private detectAndMapColumns(firstRow: any): ColumnMapping {
    const detected = [];
    const suggested: Record<string, string> = {};
    const manual: Record<string, string> = {};

    const headers = Object.keys(firstRow);
    
    for (const header of headers) {
      const normalizedHeader = this.normalizeColumnName(header);
      const mappedType = COLUMN_MAPPINGS[normalizedHeader];
      
      if (mappedType) {
        detected.push({
          key: header,
          name: header,
          type: mappedType,
          required: this.isRequiredColumn(mappedType),
          mappedTo: mappedType
        });
        suggested[header] = mappedType;
      } else {
        detected.push({
          key: header,
          name: header,
          type: ColumnType.OTHER,
          required: false
        });
      }
    }

    return { detected, suggested, manual };
  }

  /**
   * Normaliza el nombre de una columna para el mapeo
   */
  private normalizeColumnName(name: string): string {
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Determina si una columna es requerida
   */
  private isRequiredColumn(type: ColumnType): boolean {
    return [ColumnType.NAME, ColumnType.PHONE].includes(type);
  }

  /**
   * Detecta el tipo de Excel basado en las columnas encontradas
   */
  private detectExcelType(columnMapping: ColumnMapping): ExcelType {
    const mappedTypes = columnMapping.detected.map(col => col.type);
    
    // Si tiene origen de lead, es tipo LEADS
    if (mappedTypes.includes(ColumnType.LEAD_SOURCE)) {
      return ExcelType.LEADS;
    }
    
    // Si solo tiene nombre y teléfono, es SIMPLE
    if (mappedTypes.includes(ColumnType.NAME) && 
        mappedTypes.includes(ColumnType.PHONE) && 
        mappedTypes.length <= 3) {
      return ExcelType.SIMPLE;
    }
    
    // En otros casos, es CUSTOM
    return ExcelType.CUSTOM;
  }

  /**
   * Procesa una fila individual
   */
  private processRow(row: any, columnMapping: ColumnMapping, rowNumber: number): ProcessedContact {
    const contact: ProcessedContact = {
      id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      phone: '',
      rawData: row,
      isValid: true,
      validationErrors: []
    };

    // Extraer datos según el mapeo de columnas
    for (const column of columnMapping.detected) {
      const value = row[column.key];
      
      switch (column.type) {
        case ColumnType.NAME:
          contact.name = this.cleanString(value);
          break;
        case ColumnType.PHONE:
          contact.phone = this.cleanPhoneNumber(value);
          break;
        case ColumnType.EMAIL:
          contact.email = this.cleanString(value);
          break;
        case ColumnType.COMPANY:
          contact.company = this.cleanString(value);
          break;
        case ColumnType.POSITION:
          contact.position = this.cleanString(value);
          break;
        case ColumnType.LEAD_SOURCE:
          contact.leadSource = this.cleanString(value);
          break;
        case ColumnType.PHASE:
          contact.phase = this.cleanString(value);
          break;
        case ColumnType.OBSERVATIONS:
          contact.observations = this.cleanString(value);
          break;
        case ColumnType.MANAGER:
          contact.manager = this.cleanString(value);
          break;
        case ColumnType.LEAD_DATE:
          contact.leadDate = this.parseDate(value);
          break;
      }
    }

    // Validaciones
    this.validateContact(contact);

    return contact;
  }

  /**
   * Valida un contacto procesado
   */
  private validateContact(contact: ProcessedContact): void {
    // Nombre requerido
    if (!contact.name || contact.name.trim().length === 0) {
      contact.validationErrors.push('Nombre es requerido');
      contact.isValid = false;
    }

    // Teléfono requerido y válido
    if (!contact.phone || contact.phone.trim().length === 0) {
      contact.validationErrors.push('Teléfono es requerido');
      contact.isValid = false;
    } else if (!this.isValidPhoneNumber(contact.phone)) {
      contact.validationErrors.push('Número de teléfono inválido');
      contact.isValid = false;
    }

    // Email válido si está presente
    if (contact.email && !this.isValidEmail(contact.email)) {
      contact.validationErrors.push('Email inválido');
      // No marcamos como inválido por email, solo advertencia
    }

    // Si no hay nombre pero sí teléfono, usar teléfono como nombre
    if (!contact.name && contact.phone) {
      contact.name = contact.phone;
      contact.validationErrors = contact.validationErrors.filter(e => e !== 'Nombre es requerido');
      contact.isValid = contact.validationErrors.length === 0;
    }
  }

  /**
   * Agrupa contactos por origen de lead
   */
  private groupByLeadSource(contacts: ProcessedContact[], config: any): LeadSourceGroup[] {
    const groups: Record<string, ProcessedContact[]> = {};
    
    // Agrupar contactos por origen de lead
    contacts.forEach(contact => {
      const source = contact.leadSource || 'Sin origen';
      if (!groups[source]) {
        groups[source] = [];
      }
      groups[source].push(contact);
    });

    // Crear grupos con mensajes personalizados
    return Object.entries(groups).map(([source, contactList]) => {
      const template = this.findMessageTemplate(source, config.messageTemplates);
      
      return {
        source,
        contacts: contactList,
        count: contactList.length,
        defaultMessage: template.template,
        customMessage: template.template
      };
    });
  }

  /**
   * Encuentra la plantilla de mensaje apropiada para un origen de lead
   */
  private findMessageTemplate(leadSource: string, templates: MessageTemplate[]): MessageTemplate {
    // Buscar plantilla específica para el origen de lead
    const specificTemplate = templates.find(t => 
      t.leadSource && 
      t.leadSource.toLowerCase() === leadSource.toLowerCase()
    );
    
    if (specificTemplate) {
      return specificTemplate;
    }

    // Buscar plantilla genérica
    const genericTemplate = templates.find(t => !t.leadSource);
    
    return genericTemplate || {
      template: 'Hola {nombre}, te contactamos desde nuestra empresa.',
      variables: ['nombre'],
      priority: 1
    };
  }

  /**
   * Cuenta contactos duplicados
   */
  private countDuplicates(contacts: ProcessedContact[]): number {
    const phones = contacts.map(c => c.phone);
    const uniquePhones = new Set(phones);
    return phones.length - uniquePhones.size;
  }

  /**
   * Limpia una cadena de texto
   */
  private cleanString(value: any): string {
    if (!value) return '';
    return value.toString().trim();
  }

  /**
   * Limpia y formatea un número de teléfono
   */
  private cleanPhoneNumber(phone: any): string {
    if (!phone) return '';
    
    let cleaned = phone.toString().replace(/[^\d]/g, '');
    
    // Si es un número de 10 dígitos sin código de país, agregar 57 (Colombia)
    if (cleaned.length === 10 && !cleaned.startsWith('57')) {
      cleaned = '57' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Valida si un número de teléfono es válido
   */
  private isValidPhoneNumber(phone: string): boolean {
    const cleaned = this.cleanPhoneNumber(phone);
    return /^\d{10,15}$/.test(cleaned);
  }

  /**
   * Valida si un email es válido
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Parsea una fecha desde diferentes formatos
   */
  private parseDate(value: any): Date | undefined {
    if (!value) return undefined;
    
    try {
      // Si ya es una fecha
      if (value instanceof Date) {
        return value;
      }
      
      // Si es un número (Excel date serial)
      if (typeof value === 'number') {
        return new Date((value - 25569) * 86400 * 1000);
      }
      
      // Si es una cadena
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  }

  /**
   * Genera mensajes personalizados para cada grupo de lead source
   */
  generateCustomMessages(leadSources: LeadSourceGroup[]): Record<string, string> {
    const messages: Record<string, string> = {};
    
    leadSources.forEach(group => {
      messages[group.source] = group.customMessage || group.defaultMessage;
    });
    
    return messages;
  }

  /**
   * Reemplaza variables en una plantilla de mensaje
   */
  replaceMessageVariables(template: string, contact: ProcessedContact): string {
    let message = template;
    
    // Variables disponibles
    const variables: Record<string, string> = {
      '{nombre}': contact.name || '',
      '{name}': contact.name || '',
      '{empresa}': contact.company || '',
      '{company}': contact.company || '',
      '{cargo}': contact.position || '',
      '{position}': contact.position || '',
      '{email}': contact.email || '',
      '{telefono}': contact.phone || '',
      '{phone}': contact.phone || '',
      '{origen}': contact.leadSource || '',
      '{lead_source}': contact.leadSource || '',
      '{fase}': contact.phase || '',
      '{phase}': contact.phase || '',
      '{observaciones}': contact.observations || '',
      '{observations}': contact.observations || '',
      '{encargado}': contact.manager || '',
      '{manager}': contact.manager || ''
    };
    
    // Reemplazar variables
    Object.entries(variables).forEach(([variable, value]) => {
      message = message.replace(new RegExp(variable, 'gi'), value);
    });
    
    return message;
  }
}