# WhatsApp Campaign Manager

Sistema completo de gestión de campañas de WhatsApp con interfaz web administrativa.

## 🚀 Características

- **Dashboard en tiempo real** con estadísticas de mensajes y conexión
- **Gestión de contactos** con importación desde Excel
- **Campañas de difusión masiva** con personalización de mensajes
- **Historial de mensajes** con seguimiento de estado
- **Configuración avanzada** de auto-respuestas y horarios
- **Flujos conversacionales** para automatización
- **Interfaz web moderna** con Angular y Material Design

## 📋 Requisitos

- Node.js 16.0 o superior
- npm 7.0 o superior
- Google Chrome (para WhatsApp Web)

## 🛠️ Instalación

### Opción 1: Inicio Rápido (Recomendado)

1. **Iniciar Backend:**
   ```bash
   # Ejecutar el archivo batch
   start-backend.bat
   ```

2. **Iniciar Frontend (en otra terminal):**
   ```bash
   # Ejecutar el archivo batch
   start-frontend.bat
   ```

### Opción 2: Instalación Manual

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd whatsapp-campaign-manager
   ```

2. **Instalar dependencias del backend:**
   ```bash
   cd whatsapp-backend
   npm install
   ```

3. **Instalar dependencias del frontend:**
   ```bash
   cd ../whatsapp-admin
   npm install
   ```

4. **Iniciar el backend:**
   ```bash
   cd ../whatsapp-backend
   npm start
   ```

5. **Iniciar el frontend (en otra terminal):**
   ```bash
   cd whatsapp-admin
   npm start
   ```

## 🔧 Configuración

### Primera Configuración

1. **Acceder a la aplicación:**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:3000

2. **Conectar WhatsApp:**
   - Ve al Dashboard
   - Escanea el código QR con tu teléfono
   - Espera a que aparezca "Conectado"

3. **Importar contactos:**
   - Ve a la sección "Contactos"
   - Sube un archivo Excel con columnas "nombre" y "teléfono"
   - Los contactos se procesarán automáticamente

### Formato de Excel para Contactos

El archivo Excel debe tener las siguientes columnas (flexibles):

| nombre | teléfono |
|--------|----------|
| Juan Pérez | 3001234567 |
| María García | 57 300 987 6543 |

**Columnas soportadas:**
- **Nombre:** nombre, name, cliente, contact, contacto, full name
- **Teléfono:** telefono, teléfono, phone, celular, movil, móvil, whatsapp, número, numero, number

## 📱 Uso

### Dashboard
- Monitorea el estado de conexión de WhatsApp
- Ve estadísticas en tiempo real de mensajes
- Controla campañas activas

### Gestión de Contactos
- Importa contactos desde Excel
- Busca y filtra contactos
- Ve el historial de mensajes por contacto

### Campañas de Difusión
- Crea campañas masivas
- Personaliza mensajes con variables como `{nombre}`
- Adjunta archivos multimedia
- Programa envíos para más tarde

### Mensajes
- Ve todos los mensajes enviados y recibidos
- Filtra por contacto o contenido
- Monitorea el estado de entrega

### Configuración
- Configura auto-respuestas
- Define horarios de atención
- Establece palabras clave automáticas
- Ajusta velocidad de envío

## 🔍 Solución de Problemas

### El código QR no aparece
1. Verifica que el backend esté ejecutándose en puerto 3000
2. Revisa la consola del backend para errores
3. Asegúrate de que no hay otra instancia de WhatsApp Web abierta

### Error de conexión entre frontend y backend
1. Verifica que ambos servidores estén ejecutándose
2. Comprueba que no hay firewall bloqueando los puertos
3. Revisa la configuración de proxy en `whatsapp-admin/proxy.conf.json`

### Los mensajes no se envían
1. Verifica que WhatsApp esté conectado (Dashboard)
2. Comprueba que los números estén registrados en WhatsApp
3. Revisa los logs del backend para errores específicos

### Problemas con archivos Excel
1. Asegúrate de que el archivo tenga las columnas correctas
2. Verifica que los números de teléfono estén en formato válido
3. Comprueba que el archivo no esté corrupto

## 📁 Estructura del Proyecto

```
whatsapp-campaign-manager/
├── whatsapp-backend/          # Servidor Node.js/Express
│   ├── controllers/           # Controladores de API
│   ├── routes/               # Rutas de API
│   ├── data/                 # Archivos de datos persistentes
│   ├── uploads/              # Archivos subidos
│   └── server-new.js         # Servidor principal mejorado
├── whatsapp-admin/           # Aplicación Angular
│   ├── src/app/features/     # Componentes principales
│   ├── src/app/core/         # Servicios y modelos
│   └── src/app/shared/       # Componentes compartidos
├── start-backend.bat         # Script de inicio del backend
├── start-frontend.bat        # Script de inicio del frontend
└── README.md                 # Este archivo
```

## 🔒 Seguridad

- Los archivos de sesión de WhatsApp se almacenan localmente
- Los datos se persisten en archivos JSON locales
- No se almacenan credenciales en el código
- Rate limiting implementado para prevenir spam

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ve el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Si encuentras problemas o tienes preguntas:

1. Revisa la sección de solución de problemas
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema
4. Incluye logs relevantes y pasos para reproducir

## 🔄 Actualizaciones

Para actualizar el proyecto:

1. Haz pull de los últimos cambios
2. Reinstala dependencias si es necesario:
   ```bash
   cd whatsapp-backend && npm install
   cd ../whatsapp-admin && npm install
   ```
3. Reinicia ambos servidores

---

**¡Disfruta usando WhatsApp Campaign Manager!** 🎉