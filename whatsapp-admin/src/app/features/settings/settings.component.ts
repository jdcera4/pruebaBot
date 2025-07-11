import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { Settings } from '../../core/services/whatsapp.service';

type TimeString = `${number}:${number}`; // HH:MM format

interface BusinessHoursForm {
  enabled: FormControl<boolean | null>;
  startTime: FormControl<TimeString | null>;
  endTime: FormControl<TimeString | null>;
  timeZone: FormControl<string | null>;
  awayMessage: FormControl<string | null>;
}

interface AutoReplyForm {
  enabled: FormControl<boolean | null>;
  message: FormControl<string | null>;
}

interface SettingsForm {
  businessName: FormControl<string | null>;
  businessHours: FormGroup<BusinessHoursForm>;
  autoReply: FormGroup<AutoReplyForm>;
  messageDelay: FormControl<number | null>;
  maxRetries: FormControl<number | null>;
  webhookUrl: FormControl<string | null>;
  webhookEvents: FormArray<FormControl<string | null>>;
}

interface FlowOptionForm {
  id: FormControl<string>;
  text: FormControl<string | null>;
  response: FormControl<string>;
  nextStepId: FormControl<string | null>;
}

interface FlowForm {
  enabled: FormControl<boolean>;
  initialMessage: FormControl<string>;
  options: FormArray<FormGroup<FlowOptionForm>>;
}

// Define the backend flow option type (partial, as it comes from the backend)
type BackendFlowOption = {
  id: string;
  label: string;
  response: string;
  text?: string;
  nextStepId?: string | null;
};

// Define the frontend flow option type with optional text and nextStepId
interface FlowOption {
  id: string;
  label: string;
  response: string;
  text?: string;  // Make text optional
  nextStepId?: string | null;  // Make nextStepId optional
}

// Type guard to check if an object is a valid BackendFlowOption
function isBackendFlowOption(obj: any): obj is BackendFlowOption {
  return (
    obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    'label' in obj &&
    'response' in obj
  );
}

// Helper function to convert a backend flow option to a frontend flow option
function toFlowOption(option: BackendFlowOption, generateId: () => string): FlowOption {
  return {
    id: option.id,
    label: option.label,
    response: option.response,
    text: option.text || option.label || '',
    nextStepId: option.nextStepId ?? null
  };
}

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface TimezoneOption {
  value: string;
  label: string;
}

// Define the backend flow option type (may not have all fields)
// Define the conversation flow interface for the backend
interface ConversationFlow {
  enabled: boolean;
  initialMessage: string;
  options: Array<{
    id: string;
    label: string;
    response: string;
    text?: string;
    nextStepId?: string | null;
  }>;
}

interface ExtendedSettings extends Omit<Settings, 'businessName' | 'businessHours' | 'autoReply' | 'messageDelay' | 'maxRetries' | 'webhookUrl' | 'webhookEvents'> {
  businessName: string | null;
  businessHours: {
    enabled: boolean | null;
    startTime: string | null;
    endTime: string | null;
    timeZone: string | null;
    awayMessage: string | null;
  };
  autoReply: {
    enabled: boolean | null;
    message: string | null;
  };
  messageDelay: number | null;
  maxRetries: number | null;
  webhookUrl: string | null;
  webhookEvents: (string | null)[];
  conversationFlow?: ConversationFlow;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  activeTab: 'general' | 'flow' = 'general';
  isSaving = false;
  message: Message | null = null;

  // Main settings form
  settingsForm!: FormGroup<SettingsForm>;
  
  // Conversation flow form
  flowForm!: FormGroup<FlowForm>;
  
  // Timezone options
  timezones: TimezoneOption[] = [
    { value: 'America/Mexico_City', label: 'CDMX (UTC-6)' },
    { value: 'America/New_York', label: 'New York (UTC-5)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
    { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
    { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
    { value: 'America/Santiago', label: 'Santiago (UTC-4)' },
    { value: 'Europe/Madrid', label: 'Madrid (UTC+1)' }
  ];

  constructor(
    private fb: FormBuilder, 
    private whatsappService: WhatsappService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
    this.loadSettings();
  }

  private initializeForms(): void {
    this.settingsForm = this.fb.group<SettingsForm>({
      businessName: this.fb.control('', [Validators.required]),
      businessHours: this.fb.group<BusinessHoursForm>({
        enabled: this.fb.control(false),
        startTime: this.fb.control('09:00' as TimeString, [
          Validators.required,
          Validators.pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        ]),
        endTime: this.fb.control('18:00' as TimeString, [
          Validators.required,
          Validators.pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        ]),
        timeZone: this.fb.control('America/Mexico_City'),
        awayMessage: this.fb.control('We are currently out of office. Please contact us during business hours.')
      }),
      autoReply: this.fb.group<AutoReplyForm>({
        enabled: this.fb.control(false),
        message: this.fb.control('Thank you for your message. We will get back to you soon.')
      }),
      messageDelay: this.fb.control(2000, [Validators.min(0)]),
      maxRetries: this.fb.control(3, [Validators.min(0), Validators.max(5)]),
      webhookUrl: this.fb.control('', [
        Validators.pattern(/^https?:\/\/.+/)
      ]),
      webhookEvents: this.fb.array<FormControl<string | null>>([])
    });

    this.flowForm = this.fb.group<FlowForm>({
      enabled: this.fb.control(false, { nonNullable: true }),
      initialMessage: this.fb.control('', { nonNullable: true }),
      options: this.fb.array<FormGroup<FlowOptionForm>>([])
    });
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  // Getter for webhook events form array
  get webhookEvents(): FormArray<FormControl<string | null>> {
    return this.settingsForm.get('webhookEvents') as FormArray<FormControl<string | null>>;
  }

  // Getter for flow options form array
  get flowOptions(): FormArray<FormGroup<FlowOptionForm>> {
    return this.flowForm.get('options') as FormArray<FormGroup<FlowOptionForm>>;
  }

  // Add a new webhook event
  addWebhookEvent(event: string = ''): void {
    const control = this.fb.control<string | null>(event, [
      Validators.required,
      Validators.pattern(/^[a-z]+\.[a-z]+$/)
    ]);
    this.webhookEvents.push(control);
  }

  // Remove a webhook event by index
  removeWebhookEvent(index: number): void {
    if (index >= 0 && index < this.webhookEvents.length) {
      this.webhookEvents.removeAt(index);
    }
  }

  // Load settings from the server
  private loadSettings(): void {
    this.whatsappService.getSettings().subscribe((settings: Settings) => {
      // Convert Settings to ExtendedSettings
      const extendedSettings: ExtendedSettings = {
        ...settings,
        businessName: settings.businessName ?? null,
        businessHours: {
          enabled: settings.businessHours?.enabled ?? null,
          startTime: settings.businessHours?.startTime ?? null,
          endTime: settings.businessHours?.endTime ?? null,
          timeZone: settings.businessHours?.timeZone ?? null,
          awayMessage: settings.businessHours?.awayMessage ?? null,
        },
        autoReply: {
          enabled: settings.autoReply?.enabled ?? null,
          message: settings.autoReply?.message ?? null,
        },
        messageDelay: settings.messageDelay ?? null,
        maxRetries: settings.maxRetries ?? null,
        webhookUrl: settings.webhookUrl ?? null,
        webhookEvents: settings.webhookEvents ?? [],
      };
      
      try {
          // Update main form with settings
          this.settingsForm.patchValue({
            businessName: extendedSettings.businessName ?? '',
            messageDelay: extendedSettings.messageDelay ?? 2000,
            maxRetries: extendedSettings.maxRetries ?? 3,
            webhookUrl: extendedSettings.webhookUrl ?? null
          });

                          // Initialize conversation flow if it exists
          if (settings.conversationFlow) {
            this.flowForm.patchValue({
              enabled: settings.conversationFlow.enabled,
              initialMessage: settings.conversationFlow.initialMessage
            });
            
            // Clear existing options
            const flowOptions = this.flowOptions;
            while (flowOptions.length) {
              flowOptions.removeAt(0);
            }
            
            // Add options from settings
            if (settings.conversationFlow.options) {
              // Process each option from the backend
              const options = settings.conversationFlow.options as Array<{
                id: string;
                label: string;
                response: string;
                text?: string;
                nextStepId?: string | null;
              }>;
              
              // Add each option to the form with proper typing
              for (const option of options) {
                const flowOption: FlowOption = {
                  id: option.id,
                  label: option.label,
                  response: option.response,
                  text: option.text || option.label || '',
                  nextStepId: option.nextStepId ?? null
                };
                this.addFlowOption(flowOption);
              }
            }
          }

          // Update business hours
          this.settingsForm.get('businessHours')?.patchValue({
            enabled: extendedSettings.businessHours?.enabled ?? false,
            startTime: (extendedSettings.businessHours?.startTime ?? '09:00') as TimeString,
            endTime: (extendedSettings.businessHours?.endTime ?? '18:00') as TimeString,
            timeZone: extendedSettings.businessHours?.timeZone ?? 'America/Mexico_City',
            awayMessage: extendedSettings.businessHours?.awayMessage ?? 
              'We are currently out of office. Please contact us during business hours.'
          });

          // Update auto-reply settings
          this.settingsForm.get('autoReply')?.patchValue({
            enabled: extendedSettings.autoReply?.enabled ?? false,
            message: extendedSettings.autoReply?.message ?? 
              'Thank you for your message. We will get back to you soon.'
          });

          // Update webhook events
          this.webhookEvents.clear();
          if (extendedSettings.webhookEvents) {
            extendedSettings.webhookEvents.forEach((event) => {
              if (event) {
                this.addWebhookEvent(event);
              }
            });
          }

          // Clear existing options
          while (this.flowOptions.length) {
            this.flowOptions.removeAt(0);
          }

          // Add new options from conversation flow if it exists
          if (extendedSettings.conversationFlow?.options?.length) {
            extendedSettings.conversationFlow.options.forEach((option: any) => {
              this.addFlowOption({
                id: option.id,
                label: option.label,
                response: option.response,
                text: option.text,
                nextStepId: option.nextStepId ?? null
              });
            });
          }
      } catch (error) {
        console.error('Error loading settings:', error);
        this.showMessage('error', 'Failed to load settings. Please try again.');
      }
    }, (error) => {
      console.error('Error loading settings:', error);
      this.showMessage('error', 'Failed to load settings. Please try again.');
    });
  }

  // Save settings to the server
  saveSettings(): void {
    // Validate forms based on active tab
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      this.showMessage('error', 'Please fill in all required fields correctly.');
      return;
    }

    const settingsData = this.settingsForm.getRawValue();
    const dataToSave: any = {
      ...settingsData,
      // Ensure we don't send form control metadata
      businessHours: settingsData.businessHours ? {
        enabled: settingsData.businessHours.enabled,
        startTime: settingsData.businessHours.startTime,
        endTime: settingsData.businessHours.endTime,
        timeZone: settingsData.businessHours.timeZone,
        awayMessage: settingsData.businessHours.awayMessage
      } : undefined,
      autoReply: settingsData.autoReply ? {
        enabled: settingsData.autoReply.enabled,
        message: settingsData.autoReply.message
      } : undefined,
      webhookEvents: settingsData.webhookEvents?.filter(Boolean) as string[]
    };

    // Add conversation flow data if in flow tab
    if (this.activeTab === 'flow' && this.flowForm.valid) {
      const flowData = this.flowForm.getRawValue();
      dataToSave.conversationFlow = {
        enabled: flowData.enabled,
        initialMessage: flowData.initialMessage,
        options: flowData.options.map(option => ({
          id: option.id,
          text: option.text,
          response: option.response,
          nextStepId: option.nextStepId || null
        })).filter(option => option.text && option.response) // Only include valid options
      };
    }

    this.whatsappService.updateSettings(dataToSave).subscribe({
      next: () => {
        this.showMessage('success', 'Settings saved successfully!');
      },
      error: (error) => {
        console.error('Error saving settings:', error);
        this.showMessage('error', 'Failed to save settings. Please try again.');
      }
    });
  }

  // Change active tab
  changeTab(tab: 'general' | 'flow'): void {
    this.activeTab = tab;
  }

  // Add a new flow option with default values if not provided
  addFlowOption(option: FlowOption): void {
    // Ensure required fields have defaults
    const safeOption: FlowOption = {
      id: option.id || this.generateId(),
      label: option.label || '',
      response: option.response || '',
      text: ('text' in option && option.text !== undefined) ? option.text : (option.label || ''),
      nextStepId: ('nextStepId' in option) ? option.nextStepId ?? null : null
    };
    
    // Create form controls with proper typing
    const optionGroup = this.fb.group<FlowOptionForm>({
      id: this.fb.control(safeOption.id, { nonNullable: true }),
      text: this.fb.control(safeOption.text || null, { 
        validators: [Validators.required, Validators.maxLength(500)]
      }),
      response: this.fb.control(safeOption.response, { 
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(1000)]
      }),
      nextStepId: this.fb.control<string | null>(safeOption.nextStepId ?? null)
    });
    
    this.flowOptions.push(optionGroup);
  }

  // Public method to add a new flow option with auto-generated values
  addNewFlowOption(): void {
    const newOption: FlowOption = {
      id: this.generateId(),
      label: 'Nueva opción ' + (this.flowOptions.length + 1),
      response: 'Respuesta para la opción ' + (this.flowOptions.length + 1),
      text: '',
      nextStepId: null
    };
    this.addFlowOption(newOption);
  }

  // Generate a unique ID for flow options
  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  // Remove a flow option by index if it exists
  removeFlowOption(index: number): void {
    if (index >= 0 && index < this.flowOptions.length) {
      this.flowOptions.removeAt(index);
    }
  }

  // Handle form submission based on active tab
  onSubmit(): void {
    if (this.activeTab === 'general') {
      this.saveSettings();
    } else if (this.activeTab === 'flow') {
      this.saveFlow();
    }
  }

  // Save flow settings and validate before proceeding
  private saveFlow(): void {
    if (this.flowForm.invalid) {
      this.flowForm.markAllAsTouched();
      this.showMessage('error', 'Please fill in all required fields for the flow.');
      return;
    }
    this.saveSettings();
  }

  private showMessage(type: 'success' | 'error' | 'info', text: string): void {
    this.message = { type, text };
    setTimeout(() => this.message = null, 5000);
  }
}
