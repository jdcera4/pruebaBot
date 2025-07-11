export interface ConversationFlowOption {
  id: string;
  text: string;
  nextStepId: string | null; // null para finalizar la conversación
  responseText?: string; // Respuesta al seleccionar esta opción
}

export interface ConversationStep {
  id: string;
  message: string;
  options: ConversationFlowOption[];
  isRoot: boolean;
}

export interface ConversationFlow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  steps: ConversationStep[];
  createdAt: Date;
  updatedAt: Date;
}

// Helper para generar IDs únicos
export function generateId(prefix: string = 'step'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper para crear un nuevo flujo vacío
export function createEmptyFlow(name: string = 'Nuevo flujo'): ConversationFlow {
  const rootStepId = generateId('step');
  const optionId = generateId('opt');
  
  return {
    id: generateId('flow'),
    name,
    description: '',
    isActive: true,
    steps: [
      {
        id: rootStepId,
        message: '¿En qué puedo ayudarte?',
        isRoot: true,
        options: [
          {
            id: optionId,
            text: 'Opción 1',
            nextStepId: null,
            responseText: 'Gracias por seleccionar la opción 1.'
          }
        ]
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  };
}
