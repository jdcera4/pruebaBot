# WhatsApp Broadcast - Configuración Local

## Pasos para funcionamiento correcto

1. **Arranca el backend:**
   - Ejecuta: `node whatsapp-backend/server.js`
   - El backend debe estar escuchando en `http://localhost:3000`

2. **Arranca el frontend con proxy:**
   - Ejecuta: `ng serve --proxy-config proxy.conf.json` dentro de la carpeta `whatsapp-admin`
   - Esto asegura que todas las peticiones a `/api` se redirigen correctamente al backend.

3. **Prueba el formulario de broadcast:**
   - Ingresa solo números válidos (10 o 12 dígitos, sin espacios ni símbolos)
   - Ejemplo: `3001234567,573001234567`

4. **Depuración avanzada:**
   - Si hay errores de endpoint o de formato, revisa la consola del backend para ver los logs de los teléfonos recibidos.
   - El backend ahora muestra en consola el valor y tipo de `phones` recibido.

5. **Producción:**
   - En producción, asegúrate de que el backend sirva el frontend y ambos estén bajo el mismo dominio.
   - El `apiUrl` en `environment.prod.ts` debe ser `/api`.

---

### Notas
- El botón de enviar está deshabilitado si hay números inválidos.
- El backend valida y limpia los teléfonos antes de enviar.
- Si ves `@c.us` en los resultados, es porque algún número llegó vacío o mal formateado.

---

**Checklist de funcionamiento:**
- [x] Proxy configurado
- [x] Validación de números en frontend
- [x] Backend recibe y procesa array de teléfonos correctamente
- [x] Logs de depuración activos en backend
- [x] Botón deshabilitado si hay error de validación

