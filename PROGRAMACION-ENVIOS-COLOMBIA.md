# Programación de Envíos - Zona Horaria Colombia

## Mejoras Implementadas

### 🌎 Zona Horaria de Colombia
- **Configuración**: Todos los envíos programados ahora usan la zona horaria `America/Bogota` (GMT-5)
- **Validación**: El sistema valida que la fecha programada sea futura en hora de Colombia
- **Visualización**: La interfaz muestra la hora actual de Colombia y una vista previa del envío programado

### 🚀 Funcionalidades Nuevas

#### Frontend (Angular)
- **Interfaz mejorada**: Nueva sección con información de zona horaria
- **Hora actual**: Muestra la hora actual de Colombia en tiempo real
- **Vista previa**: Muestra cuándo se enviará el mensaje programado
- **Botón dinámico**: El texto del botón cambia según si es envío inmediato o programado

#### Backend (Node.js)
- **Programación automática**: Sistema que ejecuta campañas programadas automáticamente
- **Validación de fechas**: Verifica que las fechas programadas sean futuras en hora de Colombia
- **Recuperación**: Al reiniciar el servidor, recupera y programa las campañas pendientes
- **Cancelación**: Endpoint para cancelar campañas programadas

### 📋 Cómo Usar

1. **Crear Envío Programado**:
   - Sube tu archivo Excel con contactos
   - Escribe tu mensaje
   - Activa "Programar envío"
   - Selecciona fecha y hora (en hora de Colombia)
   - Haz clic en "Programar Envío"

2. **Verificar Programación**:
   - El sistema muestra la hora actual de Colombia
   - Muestra una vista previa de cuándo se enviará
   - Confirma la programación con un mensaje de éxito

3. **Cancelar Programación**:
   - Usa el endpoint `DELETE /api/campaigns/:id/schedule`
   - O reinicia el servidor para cancelar todas las programaciones

### 🔧 Detalles Técnicos

#### Validaciones
- La fecha debe ser futura en hora de Colombia
- Se convierte automáticamente la fecha local a hora de Colombia
- Valida formato de fecha y hora antes de programar

#### Ejecución Automática
- Usa `setTimeout` para programar la ejecución
- Se ejecuta automáticamente a la hora programada
- Maneja errores y actualiza el estado de la campaña

#### Recuperación al Reiniciar
- Al conectar WhatsApp, verifica campañas programadas pendientes
- Reprograma automáticamente las que aún no se han ejecutado
- Ejecuta inmediatamente las que ya deberían haberse enviado

### 📱 Interfaz de Usuario

#### Información de Zona Horaria
```
🌎 Hora de Colombia (GMT-5)
Hora actual: 16/07/2025, 14:30:25
```

#### Vista Previa de Programación
```
Se enviará: martes, 17 de julio de 2025, 09:00
```

#### Estados del Botón
- **Envío inmediato**: "Enviar Difusión"
- **Envío programado**: "Programar Envío"
- **Procesando**: "Programando envío..." / "Enviando mensajes..."

### 🛠️ Archivos Modificados

#### Frontend
- `broadcast.component.ts`: Lógica de programación y zona horaria
- `broadcast.component.html`: Interfaz mejorada con información de Colombia
- `broadcast.component.scss`: Estilos para la nueva interfaz

#### Backend
- `server.js`: Lógica de programación automática y zona horaria

### ✅ Funcionalidades Verificadas

- ✅ Programación en hora de Colombia
- ✅ Validación de fechas futuras
- ✅ Ejecución automática a la hora programada
- ✅ Recuperación al reiniciar servidor
- ✅ Interfaz intuitiva con información de zona horaria
- ✅ Vista previa de programación
- ✅ Cancelación de campañas programadas

### 🎯 Próximos Pasos Recomendados

1. **Notificaciones**: Agregar notificaciones cuando se ejecute una campaña programada
2. **Historial**: Mostrar historial de campañas programadas y ejecutadas
3. **Repetición**: Opción para programar envíos recurrentes
4. **Múltiples zonas**: Soporte para otras zonas horarias si es necesario