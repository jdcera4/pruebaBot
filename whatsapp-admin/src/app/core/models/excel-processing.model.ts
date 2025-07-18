export interface ExcelColumn {
  key: string;
  name: string;
  type: ColumnType;
  required: boolean;
  mappedTo?: string;
}

export enum ColumnType {
  NAME = 'name',
  PHONE = 'phone', 
  EMAIL = 'email',
  COMPANY = 'company',
  POSITION = 'position',
  LEAD_SOURCE = 'lead_source',
  LEAD_DATE = 'lead_date',
  PHASE = 'phase',
  OBSERVATIONS = 'observations',
  MANAGER = 'manager',
  OTHER = 'other'
}

export interface ExcelProcessingResult {
  success: boolean;
  totalRows: number;
  validContacts: ProcessedContact[];
  errors: ExcelError[];
  leadSources: LeadSourceGroup[];
  columnMapping: ColumnMapping;
  processingStats: ProcessingStats;
}

export interface ProcessedContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  position?: string;
  leadSource?: string;
  leadDate?: Date;
  phase?: string;
  observations?: string;
  manager?: string;
  rawData: Record<string, any>;
  isValid: boolean;
  validationErrors: string[];
}

export interface LeadSourceGroup {
  source: string;
  contacts: ProcessedContact[];
  count: number;
  customMessage?: string;
  defaultMessage: string;
}

export interface ColumnMapping {
  detected: ExcelColumn[];
  suggested: Record<string, string>;
  manual: Record<string, string>;
}

export interface ProcessingStats {
  totalProcessed: number;
  validContacts: number;
  invalidContacts: number;
  duplicates: number;
  leadSourcesFound: number;
  processingTime: number;
}

export interface ExcelError {
  row: number;
  column?: string;
  error: string;
  severity: 'warning' | 'error';
  suggestion?: string;
}

// Configuraciones de procesamiento por tipo de Excel
export interface ExcelProcessingConfig {
  type: ExcelType;
  requiredColumns: string[];
  optionalColumns: string[];
  validationRules: ValidationRule[];
  messageTemplates: MessageTemplate[];
}

export enum ExcelType {
  SIMPLE = 'simple', // Solo nombre y teléfono
  LEADS = 'leads',   // Formato completo con origen de lead
  CUSTOM = 'custom'  // Formato personalizado
}

export interface ValidationRule {
  column: string;
  rule: string;
  message: string;
}

export interface MessageTemplate {
  leadSource?: string;
  template: string;
  variables: string[];
  priority: number;
}

// Configuraciones predefinidas
export const EXCEL_CONFIGS: Record<ExcelType, ExcelProcessingConfig> = {
  [ExcelType.SIMPLE]: {
    type: ExcelType.SIMPLE,
    requiredColumns: ['name', 'phone'],
    optionalColumns: ['email'],
    validationRules: [
      { column: 'phone', rule: 'phone', message: 'Número de teléfono inválido' },
      { column: 'name', rule: 'required', message: 'Nombre es requerido' }
    ],
    messageTemplates: [
      {
        template: 'Hola {name}, esperamos que estés bien. Te contactamos desde nuestra empresa.',
        variables: ['name'],
        priority: 1
      }
    ]
  },
  [ExcelType.LEADS]: {
    type: ExcelType.LEADS,
    requiredColumns: ['nombre', 'celular', 'origen_de_lead'],
    optionalColumns: ['empresa', 'mail', 'cargo', 'fase', 'observacion', 'encargado', 'fecha_lead'],
    validationRules: [
      { column: 'celular', rule: 'phone', message: 'Número de celular inválido' },
      { column: 'nombre', rule: 'required', message: 'Nombre es requerido' },
      { column: 'origen_de_lead', rule: 'required', message: 'Origen de lead es requerido' }
    ],
    messageTemplates: [
      {
        leadSource: 'Facebook',
        template: 'Hola {nombre}, vimos tu interés en Facebook. Somos de {empresa} y queremos ayudarte.',
        variables: ['nombre', 'empresa'],
        priority: 1
      },
      {
        leadSource: 'Google',
        template: 'Hola {nombre}, encontraste nuestra empresa en Google. ¡Perfecto! Te contactamos para ayudarte.',
        variables: ['nombre'],
        priority: 1
      },
      {
        leadSource: 'Referido',
        template: 'Hola {nombre}, nos recomendaron contigo. Somos de {empresa} y queremos conocerte.',
        variables: ['nombre', 'empresa'],
        priority: 1
      },
      {
        leadSource: 'Web',
        template: 'Hola {nombre}, viste nuestra página web y queremos darte más información.',
        variables: ['nombre'],
        priority: 1
      }
    ]
  },
  [ExcelType.CUSTOM]: {
    type: ExcelType.CUSTOM,
    requiredColumns: [],
    optionalColumns: [],
    validationRules: [],
    messageTemplates: [
      {
        template: 'Hola, te contactamos desde nuestra empresa.',
        variables: [],
        priority: 1
      }
    ]
  }
};

// Mapeo de columnas comunes
export const COLUMN_MAPPINGS: Record<string, ColumnType> = {
  // Nombres
  'nombre': ColumnType.NAME,
  'name': ColumnType.NAME,
  'cliente': ColumnType.NAME,
  'contacto': ColumnType.NAME,
  'full name': ColumnType.NAME,
  'nombre completo': ColumnType.NAME,
  
  // Teléfonos
  'telefono': ColumnType.PHONE,
  'teléfono': ColumnType.PHONE,
  'phone': ColumnType.PHONE,
  'celular': ColumnType.PHONE,
  'movil': ColumnType.PHONE,
  'móvil': ColumnType.PHONE,
  'whatsapp': ColumnType.PHONE,
  'número': ColumnType.PHONE,
  'numero': ColumnType.PHONE,
  'number': ColumnType.PHONE,
  
  // Emails
  'email': ColumnType.EMAIL,
  'mail': ColumnType.EMAIL,
  'correo': ColumnType.EMAIL,
  'e-mail': ColumnType.EMAIL,
  
  // Empresas
  'empresa': ColumnType.COMPANY,
  'company': ColumnType.COMPANY,
  'compañia': ColumnType.COMPANY,
  'organización': ColumnType.COMPANY,
  
  // Cargos
  'cargo': ColumnType.POSITION,
  'position': ColumnType.POSITION,
  'puesto': ColumnType.POSITION,
  'rol': ColumnType.POSITION,
  
  // Origen de Lead
  'origen de lead': ColumnType.LEAD_SOURCE,
  'origen_de_lead': ColumnType.LEAD_SOURCE,
  'lead source': ColumnType.LEAD_SOURCE,
  'fuente': ColumnType.LEAD_SOURCE,
  'source': ColumnType.LEAD_SOURCE,
  
  // Otros
  'fase': ColumnType.PHASE,
  'phase': ColumnType.PHASE,
  'etapa': ColumnType.PHASE,
  'observación': ColumnType.OBSERVATIONS,
  'observacion': ColumnType.OBSERVATIONS,
  'notas': ColumnType.OBSERVATIONS,
  'comments': ColumnType.OBSERVATIONS,
  'encargado': ColumnType.MANAGER,
  'manager': ColumnType.MANAGER,
  'responsable': ColumnType.MANAGER,
  'fecha lead': ColumnType.LEAD_DATE,
  'fecha_lead': ColumnType.LEAD_DATE,
  'lead date': ColumnType.LEAD_DATE,
  'date': ColumnType.LEAD_DATE
};