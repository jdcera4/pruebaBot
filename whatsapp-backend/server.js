// server.js - WhatsApp API Backend con gestión de campañas
const express = require('express');
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🚀 Iniciando WhatsApp Campaign Manager...');

// Configuración de rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    message: { success: false, error: 'Demasiadas peticiones, intente más tarde' }
});

// Configuración de CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de multer para diferentes tipos de archivos
const createMulterConfig = (destination, allowedTypes) => {
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = destination;
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });

    return multer({
        storage: storage,
        limits: { fileSize: 16 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
const mimetype = (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.mimetype === 'text/csv'
);
if (extname || mimetype) {
    return cb(null, true);
} else {
    cb(new Error(`Tipo de archivo no permitido: ${file.originalname} (${file.mimetype})`));
}
        }
    });
};

// Configuraciones de multer específicas
const uploadExcel = createMulterConfig('./uploads/excel/', /\.(xlsx|xls|csv)$/i);
const uploadMedia = createMulterConfig('./uploads/media/', /\.(jpe?g|png|gif|pdf|docx?|txt|mp[34]|wav|ogg|web[pm]|mov|avi|mkv)$/i);

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// --- USO DE RUTAS MODULARES ---
app.use('/api/flows', require('./routes/flows'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/settings', require('./routes/settings'));

// Inicializar cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "whatsapp-campaign-manager",
        dataPath: './session'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Variables para gestión de estado
let campaigns = [];
let contacts = [];
let messages = [];
let isClientReady = false;
let qrCodeData = null;
let clientInfo = null;

// Configuraciones por defecto
let settings = {
    welcomeMessage: "¡Hola! Bienvenido a nuestro servicio de WhatsApp.",
    autoReply: false,
    workingHours: { start: '08:00', end: '18:00' },
    autoReplyMessage: "Gracias por tu mensaje. Te responderemos a la brevedad.",
    keywords: {},
    timezone: 'America/Bogota',
    messageDelay: 2000, // 2 segundos entre mensajes
    batchSize: 50 // Máximo 50 mensajes por lote
};

// Archivos de persistencia
const SETTINGS_FILE = './data/settings.json';
const CAMPAIGNS_FILE = './data/campaigns.json';
const CONTACTS_FILE = './data/contacts.json';
const MESSAGES_FILE = './data/messages.json';
const FLOWS_FILE = './data/flows.json';

// Conversational Flows (in-memory)
let flows = [];

function loadFlows() {
    if (fs.existsSync(FLOWS_FILE)) {
        try {
            flows = JSON.parse(fs.readFileSync(FLOWS_FILE, 'utf8'));
        } catch (e) {
            flows = [];
        }
    } else {
        flows = [];
    }
}

function saveFlows() {
    fs.writeFileSync(FLOWS_FILE, JSON.stringify(flows, null, 2), 'utf8');
}

// Cargar flujos al iniciar
loadFlows();

// Crear directorio de datos si no existe
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
}

// Cargar datos persistentes
function loadData() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const savedSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            settings = { ...settings, ...savedSettings };
        }

        if (fs.existsSync(CAMPAIGNS_FILE)) {
            campaigns = JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, 'utf8'));
        }

        if (fs.existsSync(CONTACTS_FILE)) {
            contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
        }

        if (fs.existsSync(MESSAGES_FILE)) {
            messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
        } else {
            // Crear archivo de mensajes vacío
            messages = [];
            saveMessages();
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        // Asegurarse de que hay mensajes de ejemplo incluso si hay un error
        if (messages.length === 0) {
            messages = [];
            saveMessages();
        }
    }
}

// Función para generar mensajes de ejemplo eliminada

// --- Conversational Flows API ---

// Estructura esperada:
// Flow: { id, name, description, isActive, steps: [step, ...] }
// Step: { id, message, isFinal, options: [option, ...] }
// Option: { id, label, nextStepId, responseMessage }

const { v4: uuidv4 } = require('uuid');

// GET all flows
app.get('/api/flows', (req, res) => {
    res.json(flows);
});

// GET single flow
app.get('/api/flows/:id', (req, res) => {
    const flow = flows.find(f => f.id === req.params.id);
    if (!flow) return res.status(404).json({ error: 'Flujo no encontrado' });
    res.json(flow);
});

// CREATE flow
app.post('/api/flows', (req, res) => {
    const { name, description, isActive, steps = [] } = req.body;
    const newFlow = { id: uuidv4(), name, description, isActive: !!isActive, steps };
    flows.push(newFlow);
    saveFlows();
    res.status(201).json(newFlow);
});

// UPDATE flow
app.put('/api/flows/:id', (req, res) => {
    const flow = flows.find(f => f.id === req.params.id);
    if (!flow) return res.status(404).json({ error: 'Flujo no encontrado' });
    flow.name = req.body.name || flow.name;
    flow.description = req.body.description || flow.description;
    flow.isActive = req.body.isActive !== undefined ? !!req.body.isActive : flow.isActive;
    saveFlows();
    res.json(flow);
});

// DELETE flow
app.delete('/api/flows/:id', (req, res) => {
    const idx = flows.findIndex(f => f.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Flujo no encontrado' });
    flows.splice(idx, 1);
    saveFlows();
    res.json({ success: true });
});

// --- Steps ---
// GET steps of a flow
app.get('/api/flows/:id/steps', (req, res) => {
    const flow = flows.find(f => f.id === req.params.id);
    if (!flow) return res.status(404).json({ error: 'Flujo no encontrado' });
    res.json(flow.steps || []);
});

// ADD step to flow
app.post('/api/flows/:id/steps', (req, res) => {
    const flow = flows.find(f => f.id === req.params.id);
    if (!flow) return res.status(404).json({ error: 'Flujo no encontrado' });
    const { message, isFinal } = req.body;
    const newStep = { id: uuidv4(), message, isFinal: !!isFinal, options: [] };
    flow.steps.push(newStep);
    saveFlows();
    res.status(201).json(newStep);
});

// UPDATE step
app.put('/api/flows/:flowId/steps/:stepId', (req, res) => {
    const flow = flows.find(f => f.id === req.params.flowId);
    if (!flow) return res.status(404).json({ error: 'Flujo no encontrado' });
    const step = flow.steps.find(s => s.id === req.params.stepId);
    if (!step) return res.status(404).json({ error: 'Paso no encontrado' });
    step.message = req.body.message || step.message;
    step.isFinal = req.body.isFinal !== undefined ? !!req.body.isFinal : step.isFinal;
    saveFlows();
    res.json(step);
});

// DELETE step
app.delete('/api/flows/:flowId/steps/:stepId', (req, res) => {
    const flow = flows.find(f => f.id === req.params.flowId);
    if (!flow) return res.status(404).json({ error: 'Flujo no encontrado' });
    const idx = flow.steps.findIndex(s => s.id === req.params.stepId);
    if (idx === -1) return res.status(404).json({ error: 'Paso no encontrado' });
    flow.steps.splice(idx, 1);
    saveFlows();
    res.json({ success: true });
});

// --- Options ---
// GET options of a step
app.get('/api/flows/:flowId/steps/:stepId/options', (req, res) => {
    const flow = flows.find(f => f.id === req.params.flowId);
    if (!flow) return res.status(404).json({ error: 'Flujo no encontrado' });
    const step = flow.steps.find(s => s.id === req.params.stepId);
    if (!step) return res.status(404).json({ error: 'Paso no encontrado' });
    res.json(step.options || []);
});

// ADD option to step
app.post('/api/flows/:flowId/steps/:stepId/options', (req, res) => {
    const flow = flows.find(f => f.id === req.params.flowId);
    if (!flow) return res.status(404).json({ error: 'Flujo no encontrado' });
    const step = flow.steps.find(s => s.id === req.params.stepId);
    if (!step) return res.status(404).json({ error: 'Paso no encontrado' });
    const { label, nextStepId, responseMessage } = req.body;
    const newOption = { id: uuidv4(), label, nextStepId: nextStepId || null, responseMessage: responseMessage || '' };
    step.options.push(newOption);
    saveFlows();
    res.status(201).json(newOption);
});

// UPDATE option
app.put('/api/flows/:flowId/steps/:stepId/options/:optionId', (req, res) => {
    const flow = flows.find(f => f.id === req.params.flowId);
    if (!flow) return res.status(404).json({ error: 'Flujo no encontrado' });
    const step = flow.steps.find(s => s.id === req.params.stepId);
    if (!step) return res.status(404).json({ error: 'Paso no encontrado' });
    const option = step.options.find(o => o.id === req.params.optionId);
    if (!option) return res.status(404).json({ error: 'Opción no encontrada' });
    option.label = req.body.label || option.label;
    option.nextStepId = req.body.nextStepId !== undefined ? req.body.nextStepId : option.nextStepId;
    option.responseMessage = req.body.responseMessage !== undefined ? req.body.responseMessage : option.responseMessage;
    saveFlows();
    res.json(option);
});

// DELETE option
app.delete('/api/flows/:flowId/steps/:stepId/options/:optionId', (req, res) => {
    const flow = flows.find(f => f.id === req.params.flowId);
    if (!flow) return res.status(404).json({ error: 'Flujo no encontrado' });
    const step = flow.steps.find(s => s.id === req.params.stepId);
    if (!step) return res.status(404).json({ error: 'Paso no encontrado' });
    const idx = step.options.findIndex(o => o.id === req.params.optionId);
    if (idx === -1) return res.status(404).json({ error: 'Opción no encontrada' });
    step.options.splice(idx, 1);
    saveFlows();
    res.json({ success: true });
});

// --- Avanzar en el flujo según respuesta del usuario ---
app.post('/api/conversation/next', (req, res) => {
    // body: { flowId, currentStepId, optionId }
    const { flowId, currentStepId, optionId } = req.body;
    const flow = flows.find(f => f.id === flowId);
    if (!flow) return res.status(404).json({ error: 'Flujo no encontrado' });
    const step = flow.steps.find(s => s.id === currentStepId);
    if (!step) return res.status(404).json({ error: 'Paso no encontrado' });
    const option = step.options.find(o => o.id === optionId);
    if (!option) return res.status(404).json({ error: 'Opción no encontrada' });
    let nextStep = null;
    if (option.nextStepId) {
        nextStep = flow.steps.find(s => s.id === option.nextStepId);
    }
    res.json({
        responseMessage: option.responseMessage || '',
        nextStep: nextStep ? {
            id: nextStep.id,
            message: nextStep.message,
            isFinal: nextStep.isFinal,
            options: nextStep.options
        } : null
    });
});

// Guardar mensajes en el archivo
function saveMessages() {
    try {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    } catch (error) {
        console.error('Error al guardar mensajes:', error);
    }
}

// Guardar datos
function saveData() {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2));
        fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
        saveMessages();
    } catch (error) {
        console.error('Error al guardar datos:', error);
    }
}

// Cargar datos al iniciar
loadData();

// Función para limpiar número de teléfono
function cleanPhoneNumber(phone) {
    if (!phone) return null;

    let cleaned = phone.toString().replace(/[^\d]/g, '');

    if (cleaned.length === 10 && !cleaned.startsWith('57')) {
        cleaned = '57' + cleaned;
    }

    return cleaned.endsWith('@c.us') ? cleaned : `${cleaned}@c.us`;
}

// Función para procesar archivo Excel
function processExcelFile(filePath) {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const processedContacts = [];
        const errors = [];

        data.forEach((row, index) => {
            try {
                // Buscar columnas de nombre y teléfono (flexible)
                // Encabezados soportados para nombre: nombre, name, cliente, contact, contacto, full name, nombre completo
                // Encabezados soportados para teléfono: telefono, teléfono, phone, celular, movil, móvil, whatsapp, número, numero, número de celular, mobile number
                const nameFields = [
                    'nombre', 'name', 'cliente', 'contact', 'contacto', 'full name', 'nombre completo'
                ];
                const phoneFields = [
                    'telefono', 'teléfono', 'phone', 'celular', 'movil', 'móvil', 'whatsapp', 'número', 'numero', 'number', 'número de celular', 'mobile number'
                ];

                let name = null;
                let phone = null;

                // Buscar nombre (tolerante a espacios, tildes y mayúsculas)
                for (const field of nameFields) {
                    const key = Object.keys(row).find(k => k.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '')
                        .includes(field.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '')));
                    if (key && row[key]) {
                        name = row[key].toString().trim();
                        break;
                    }
                }

                // Buscar teléfono (tolerante a espacios, tildes y mayúsculas)
                for (const field of phoneFields) {
                    const key = Object.keys(row).find(k => k.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '')
                        .includes(field.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '')));
                    if (key && row[key]) {
                        phone = row[key].toString().trim();
                        break;
                    }
                }

                // Si no hay nombre pero sí teléfono, usa el teléfono como nombre
                if (!name && phone) {
                    name = phone;
                }

                if (!phone) {
                    errors.push(`Fila ${index + 2}: Teléfono faltante`);
                    return;
                }

                const cleanedPhone = cleanPhoneNumber(phone);
                if (!cleanedPhone) {
                    errors.push(`Fila ${index + 2}: Teléfono inválido (${phone})`);
                    return;
                }

                processedContacts.push({
                    id: Date.now().toString() + '-' + index,
                    name: name,
                    phone: cleanedPhone,
                    rawPhone: phone,
                    source: 'excel_import',
                    importedAt: new Date().toISOString()
                });

            } catch (error) {
                errors.push(`Fila ${index + 2}: Error al procesar - ${error.message}`);
            }
        });

        return { contacts: processedContacts, errors };

    } catch (error) {
        throw new Error(`Error al procesar Excel: ${error.message}`);
    }
}

// Función para crear campaña
function createCampaign(data) {
    const campaign = {
        id: Date.now().toString(),
        name: data.name,
        message: data.message,
        mediaPath: data.mediaPath || null,
        mediaType: data.mediaType || null,
        contacts: data.contacts || [],
        status: 'created',
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        scheduledFor: data.scheduledFor || null,
        progress: {
            total: data.contacts?.length || 0,
            sent: 0,
            failed: 0,
            pending: data.contacts?.length || 0
        },
        results: []
    };

    campaigns.push(campaign);
    saveData();
    return campaign;
}

// Función para enviar campaña
async function executeCampaign(campaignId) {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) throw new Error('Campaña no encontrada');

    if (campaign.status !== 'created' && campaign.status !== 'paused') {
        throw new Error('La campaña no puede ser ejecutada en su estado actual');
    }

    campaign.status = 'running';
    campaign.startedAt = new Date().toISOString();
    saveData();

    console.log(`🚀 Iniciando campaña: ${campaign.name}`);

    // Procesar contactos
    for (let i = 0; i < campaign.contacts.length; i++) {
        const contact = campaign.contacts[i];

        // Verificar si ya fue enviado
        const existingResult = campaign.results.find(r => r.contactId === contact.id);
        if (existingResult && existingResult.status === 'sent') {
            continue;
        }

        try {
            // Verificar si el número está registrado
            const isRegistered = await client.isRegisteredUser(contact.phone);
            if (!isRegistered) {
                campaign.results.push({
                    contactId: contact.id,
                    name: contact.name,
                    phone: contact.phone,
                    status: 'failed',
                    error: 'Número no registrado en WhatsApp',
                    timestamp: new Date().toISOString()
                });
                campaign.progress.failed++;
                campaign.progress.pending--;
                continue;
            }

            // Enviar mensaje
            if (campaign.mediaPath) {
                const media = MessageMedia.fromFilePath(campaign.mediaPath);
                await client.sendMessage(contact.phone, media, {
                    caption: campaign.message.replace('{nombre}', contact.name)
                });
            } else {
                await client.sendMessage(contact.phone, campaign.message.replace('{nombre}', contact.name));
            }

            campaign.results.push({
                contactId: contact.id,
                name: contact.name,
                phone: contact.phone,
                status: 'sent',
                timestamp: new Date().toISOString()
            });

            campaign.progress.sent++;
            campaign.progress.pending--;

            console.log(`✅ Mensaje enviado a ${contact.name} (${contact.phone})`);

        } catch (error) {
            console.error(`❌ Error enviando a ${contact.name}:`, error.message);

            campaign.results.push({
                contactId: contact.id,
                name: contact.name,
                phone: contact.phone,
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            });

            campaign.progress.failed++;
            campaign.progress.pending--;
        }

        // Guardar progreso cada 10 mensajes
        if (i % 10 === 0) {
            saveData();
        }

        // Pausa entre mensajes
        if (i < campaign.contacts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, settings.messageDelay));
        }
    }

    campaign.status = 'completed';
    campaign.completedAt = new Date().toISOString();
    saveData();

    console.log(`🎉 Campaña completada: ${campaign.name}`);
    console.log(`📊 Enviados: ${campaign.progress.sent}, Fallidos: ${campaign.progress.failed}`);

    return campaign;
}

// Asegurarse de que el directorio de datos existe
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
}

// Inicializar archivo de configuración si no existe
if (!fs.existsSync('./data/settings.json')) {
    const defaultSettings = {
        welcomeMessage: 'Hola, ¿en qué puedo ayudarte?',
        autoReply: false,
        workingHours: {
            start: '08:00',
            end: '18:00'
        },
        autoReplyMessage: 'Estamos fuera de horario de atención. Por favor, envíanos un mensaje y te responderemos lo antes posible.',
        keywords: {},
        timezone: 'America/Bogota',
        messageDelay: 2000,
        batchSize: 50,
        conversationFlow: {
            enabled: false,
            initialMessage: '¿En qué puedo ayudarte hoy?',
            options: []
        }
    };
    fs.writeFileSync('./data/settings.json', JSON.stringify(defaultSettings, null, 2), 'utf8');
}

// Inicializar WhatsApp
client.initialize();

// Eventos de WhatsApp

// Track message status updates
client.on('message_ack', (msg, ack) => {
    try {
        const messageIndex = messages.findIndex(m => m.id === msg.id.id);
        if (messageIndex !== -1) {
            messages[messageIndex].status = ack === 3 ? 'delivered' : 'sent';
            messages[messageIndex].updatedAt = new Date().toISOString();
            
            if (ack === 3) { // 3 = delivered
                messages[messageIndex].deliveredAt = new Date().toISOString();
            }
            
            saveMessages();
        }
    } catch (error) {
        console.error('Error updating message status:', error);
    }
});

// Track when messages are read
client.on('message_reaction', (reaction) => {
    try {
        if (reaction.reaction === '👍') { // Example: Mark as read when user reacts with thumbs up
            const messageIndex = messages.findIndex(m => m.id === reaction.id.id);
            if (messageIndex !== -1) {
                messages[messageIndex].status = 'read';
                messages[messageIndex].readAt = new Date().toISOString();
                messages[messageIndex].updatedAt = new Date().toISOString();
                saveMessages();
            }
        }
    } catch (error) {
        console.error('Error updating message reaction:', error);
    }
});

// Lógica de auto-respuesta
client.on('message', async msg => {
    try {
        if (!settings.autoReply) return;
        const now = new Date();
        // Comprobar horario laboral
        if (settings.workingHours && settings.workingHours.start && settings.workingHours.end) {
            const [startHour, startMin] = settings.workingHours.start.split(':').map(Number);
            const [endHour, endMin] = settings.workingHours.end.split(':').map(Number);
            const start = new Date(now);
            start.setHours(startHour, startMin, 0, 0);
            const end = new Date(now);
            end.setHours(endHour, endMin, 59, 999);
            if (now < start || now > end) return; // Fuera de horario
        }
        // Evitar responder a mensajes propios
        if (msg.fromMe) return;
        // Verificar palabras clave
        let matchedKeyword = false;
        if (settings.keywords && typeof settings.keywords === 'object') {
            for (const [keyword, reply] of Object.entries(settings.keywords)) {
                if (msg.body && msg.body.toLowerCase().includes(keyword.toLowerCase())) {
                    await msg.reply(reply);
                    matchedKeyword = true;
                    break;
                }
            }
        }
        // Si no coincidió palabra clave y hay autoReplyMessage, responder con mensaje general
        if (!matchedKeyword && settings.autoReplyMessage) {
            await msg.reply(settings.autoReplyMessage);
        }
    } catch (err) {
        console.error('Error en auto-respuesta:', err);
    }
});

client.on('qr', (qr) => {
    qrCodeData = qr;
    console.log('📱 Código QR generado. Escanea con tu teléfono:');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('✅ Cliente autenticado correctamente');
    qrCodeData = null;
});

client.on('ready', async () => {
    isClientReady = true;
    clientInfo = client.info;
    console.log('🎉 WhatsApp Bot conectado y listo');
    console.log(`📞 Conectado como: ${clientInfo.pushname} (${clientInfo.wid.user})`);
});

client.on('disconnected', (reason) => {
    console.error('🔌 Cliente desconectado:', reason);
    isClientReady = false;
    clientInfo = null;
});

// Middleware
const checkClientReady = (req, res, next) => {
    if (!isClientReady) {
        return res.status(503).json({
            success: false,
            error: 'WhatsApp no está conectado',
            needsQR: qrCodeData !== null
        });
    }
    next();
};

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Datos de entrada inválidos',
            details: errors.array()
        });
    }
    next();
};

// Get dashboard statistics
app.get('/api/dashboard/stats', (req, res) => {
    try {
        // Calculate message statistics
        const totalMessages = messages.length;
        const sentMessages = messages.filter(m => m.status === 'sent').length;
        const deliveredMessages = messages.filter(m => m.status === 'delivered').length;
        const readMessages = messages.filter(m => m.status === 'read').length;
        const failedMessages = messages.filter(m => m.status === 'failed').length;
        
        // Calculate delivery rate (excluding failed messages)
        const successfulMessages = totalMessages - failedMessages;
        const deliveryRate = totalMessages > 0 ? (successfulMessages / totalMessages) * 100 : 0;
        
        // Calculate messages by day for the last 7 days
        const messagesByDay = {};
        const now = new Date();
        
        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            messagesByDay[dateStr] = 0;
        }
        
        // Count messages by day
        messages.forEach(message => {
            if (message.sentAt) {
                const messageDate = new Date(message.sentAt).toISOString().split('T')[0];
                if (messagesByDay[messageDate] !== undefined) {
                    messagesByDay[messageDate]++;
                }
            }
        });
        
        // Format messages by day for the response
        const messagesTrend = Object.entries(messagesByDay).map(([date, count]) => ({
            date,
            count
        }));
        
        // Get active campaigns
        const activeCampaigns = campaigns.filter(campaign => 
            campaign.status === 'active' || campaign.status === 'paused'
        ).length;
        
        // Get total contacts
        const totalContacts = contacts.length;
        
        // Get recent messages (last 5)
        const recentMessages = [...messages]
            .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
            .slice(0, 5)
            .map(msg => ({
                id: msg.id,
                to: msg.toName || msg.to,
                message: msg.message.length > 50 ? msg.message.substring(0, 47) + '...' : msg.message,
                status: msg.status,
                sentAt: msg.sentAt
            }));
        
        res.json({
            success: true,
            stats: {
                totalMessages,
                sentMessages,
                deliveredMessages,
                readMessages,
                failedMessages,
                deliveryRate: Math.round(deliveryRate * 100) / 100, // Round to 2 decimal places
                activeCampaigns,
                totalContacts,
                messagesTrend,
                recentMessages
            }
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas del dashboard',
            details: error.message
        });
    }
});

// Get contacts with pagination and search
app.get('/api/contacts/paginated', (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const searchTerm = search.toString().toLowerCase();

        // Filter contacts by search term if provided
        let filteredContacts = contacts;
        if (searchTerm) {
            filteredContacts = contacts.filter(contact => 
                contact.name.toLowerCase().includes(searchTerm) ||
                contact.phone.includes(searchTerm) ||
                (contact.email && contact.email.toLowerCase().includes(searchTerm))
            );
        }

        // Calculate pagination
        const total = filteredContacts.length;
        const pages = Math.ceil(total / limitNum);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = Math.min(startIndex + limitNum, total);
        
        // Get paginated results
        const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

        res.json({
            success: true,
            data: {
                data: paginatedContacts,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages
                }
            }
        });
    } catch (error) {
        console.error('Error fetching paginated contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener la lista de contactos',
            details: error.message
        });
    }
});

// Get messages with pagination and filtering
app.get('/api/messages', (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '',
            status,
            startDate,
            endDate
        } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        // Filter messages
        let filteredMessages = [...messages];
        
        // Filter by search term (searches in message content and recipient name/phone)
        if (search) {
            const searchLower = search.toLowerCase();
            filteredMessages = filteredMessages.filter(msg => 
                (msg.message && msg.message.toLowerCase().includes(searchLower)) ||
                (msg.toName && msg.toName.toLowerCase().includes(searchLower)) ||
                (msg.to && msg.to.includes(search))
            );
        }
        
        // Filter by status
        if (status) {
            filteredMessages = filteredMessages.filter(msg => msg.status === status);
        }
        
        // Filter by date range
        if (startDate) {
            const start = new Date(startDate);
            filteredMessages = filteredMessages.filter(msg => new Date(msg.sentAt) >= start);
        }
        
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // End of the day
            filteredMessages = filteredMessages.filter(msg => new Date(msg.sentAt) <= end);
        }
        
        // Sort by most recent first
        filteredMessages.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
        
        // Calculate pagination
        const total = filteredMessages.length;
        const pages = Math.ceil(total / limitNum);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = pageNum * limitNum;
        
        // Get paginated results
        const paginatedMessages = filteredMessages.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            data: paginatedMessages,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages
            }
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los mensajes',
            details: error.message
        });
    }
});

// Send a message
app.post('/api/messages', [
    body('to').isString().notEmpty(),
    body('message').isString().notEmpty(),
    body('mediaUrl').optional().isString(),
    handleValidationErrors
], checkClientReady, async (req, res) => {
    try {
        const { to, message, mediaUrl } = req.body;
        
        // In a real implementation, send the message via WhatsApp Web
        const messageId = 'msg_' + Date.now();
        const newMessage = {
            id: messageId,
            to,
            from: client.info.wid.user, // Sender's WhatsApp ID
            message,
            mediaUrl,
            status: 'sent',
            sentAt: new Date(),
            deliveredAt: new Date(),
            readAt: null
        };
        
        // Save the message to your database here
        
        res.json({
            success: true,
            data: newMessage
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            error: 'Error sending message',
            details: error.message
        });
    }
});

// Get paginated contacts
app.get('/api/contacts/paginated', (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        // Filter contacts by search term if provided
        let filteredContacts = contacts;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredContacts = contacts.filter(contact => 
                (contact.name && contact.name.toLowerCase().includes(searchLower)) || 
                contact.phone.includes(search) ||
                (contact.email && contact.email.toLowerCase().includes(searchLower))
            );
        }
        
        // Calculate pagination
        const total = filteredContacts.length;
        const pages = Math.ceil(total / limitNum);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = Math.min(startIndex + limitNum, total);
        
        // Get paginated results
        const paginatedContacts = filteredContacts.slice(startIndex, endIndex);
        
        res.json({
            success: true,
            data: {
                data: paginatedContacts,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages
                }
            }
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching contacts',
            details: error.message
        });
    }
});

// Get dashboard statistics
app.get('/api/dashboard/stats', (req, res) => {
    try {
        // Calculate statistics
        const totalContacts = contacts.length;
        const totalMessages = messages.length;
        const sentMessages = messages.filter(m => m.status === 'sent').length;
        const deliveredMessages = messages.filter(m => m.status === 'delivered').length;
        const readMessages = messages.filter(m => m.status === 'read').length;
        const failedMessages = messages.filter(m => m.status === 'failed').length;
        
        const campaignStats = campaigns.reduce((acc, campaign) => {
            if (campaign.status === 'completed') acc.completed++;
            if (campaign.status === 'sending') acc.inProgress++;
            return acc;
        }, { total: campaigns.length, completed: 0, inProgress: 0 });
        
        // Calculate message trends for the last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Get last 7 days including today
        
        const messageTrends = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(sevenDaysAgo);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayMessages = messages.filter(msg => {
                const msgDate = new Date(msg.sentAt || msg.createdAt);
                return msgDate.toISOString().split('T')[0] === dateStr;
            });
            
            messageTrends.push({
                date: dateStr,
                count: dayMessages.length
            });
        }
        
        // Get active campaigns (not completed or failed)
        const activeCampaigns = campaigns.filter(c => 
            c.status !== 'completed' && c.status !== 'failed'
        ).length;
        
        // Get recent messages (last 5)
        const recentMessages = [...messages]
            .sort((a, b) => new Date(b.sentAt || b.createdAt) - new Date(a.sentAt || a.createdAt))
            .slice(0, 5);
        
        // Calculate delivery rate
        const deliveredOrRead = messages.filter(m => m.status === 'delivered' || m.status === 'read').length;
        const deliveryRate = totalMessages > 0 ? Math.round((deliveredOrRead / totalMessages) * 100) : 0;
        
        res.json({
            success: true,
            data: {
                totalContacts,
                totalMessages,
                campaigns: campaignStats,
                unreadMessages
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching dashboard statistics',
            details: error.message
        });
    }
});

// Configuración
app.get('/api/settings', (req, res) => {
    try {
        // Leer el archivo de configuración
        const settings = JSON.parse(fs.readFileSync('./data/settings.json', 'utf8'));
        
        // Asegurarse de que conversationFlow siempre tenga una estructura válida
        if (!settings.conversationFlow) {
            settings.conversationFlow = {
                enabled: false,
                initialMessage: '¿En qué puedo ayudarte hoy?',
                options: []
            };
        }
        
        res.json({
            success: true,
            ...settings
        });
    } catch (error) {
        console.error('Error al leer la configuración:', error);
        res.status(500).json({
            success: false,
            error: 'Error al leer la configuración',
            details: error.message
        });
    }
});

app.put('/api/settings', [
    body('businessName').optional().isString(),
    body('businessHours').optional().isObject(),
    body('autoReply').optional().isObject(),
    body('messageDelay').optional().isInt({ min: 0 }),
    body('maxRetries').optional().isInt({ min: 0 }),
    body('webhookUrl').optional().isString(),
    body('webhookEvents').optional().isArray(),
    body('conversationFlow').optional().isObject(),
    body('conversationFlow.enabled').optional().isBoolean(),
    body('conversationFlow.initialMessage').optional().isString(),
    body('conversationFlow.options').optional().isArray(),
    handleValidationErrors
], (req, res) => {
    try {
        // Create settings file if it doesn't exist
        if (!fs.existsSync('./data/settings.json')) {
            const defaultSettings = {
                businessName: '',
                businessHours: {
                    enabled: false,
                    startTime: '09:00',
                    endTime: '18:00',
                    timeZone: 'America/Mexico_City',
                    awayMessage: 'We are currently out of office. Please contact us during business hours.'
                },
                autoReply: {
                    enabled: false,
                    message: 'Thank you for your message. We will get back to you soon.'
                },
                messageDelay: 2000,
                maxRetries: 3,
                webhookUrl: '',
                webhookEvents: [],
                conversationFlow: {
                    enabled: false,
                    initialMessage: 'Please select an option:',
                    options: []
                }
            };
            fs.writeFileSync('./data/settings.json', JSON.stringify(defaultSettings, null, 2), 'utf8');
        }

        // Load current settings
        const settings = JSON.parse(fs.readFileSync('./data/settings.json', 'utf8') || '{}');
        const updates = req.body;
        
        // Merge updates with existing settings
        const updatedSettings = {
            ...settings,
            ...updates,
            // Handle nested objects
            businessHours: updates.businessHours ? { 
                ...(settings.businessHours || {}), 
                ...updates.businessHours 
            } : settings.businessHours,
            autoReply: updates.autoReply ? { 
                ...(settings.autoReply || {}), 
                ...updates.autoReply 
            } : settings.autoReply,
            // Ensure webhookEvents is an array
            webhookEvents: Array.isArray(updates.webhookEvents) 
                ? updates.webhookEvents.filter(Boolean) 
                : (settings.webhookEvents || []),
            // Handle conversation flow
            conversationFlow: updates.conversationFlow !== undefined
                ? updates.conversationFlow === null
                    ? null
                    : {
                        ...(settings.conversationFlow || {
                            enabled: false,
                            initialMessage: 'Please select an option:',
                            options: []
                        }),
                        ...updates.conversationFlow,
                        options: Array.isArray(updates.conversationFlow.options)
                            ? updates.conversationFlow.options
                            : (settings.conversationFlow?.options || [])
                    }
                : settings.conversationFlow
        };
        
        // Ensure required fields have default values
        if (!updatedSettings.businessName) updatedSettings.businessName = '';
        if (!updatedSettings.businessHours) {
            updatedSettings.businessHours = {
                enabled: false,
                startTime: '09:00',
                endTime: '18:00',
                timeZone: 'America/Mexico_City',
                awayMessage: 'We are currently out of office. Please contact us during business hours.'
            };
        }
        if (!updatedSettings.autoReply) {
            updatedSettings.autoReply = {
                enabled: false,
                message: 'Thank you for your message. We will get back to you soon.'
            };
        }
        if (updatedSettings.messageDelay === undefined) updatedSettings.messageDelay = 2000;
        if (updatedSettings.maxRetries === undefined) updatedSettings.maxRetries = 3;
        if (!updatedSettings.webhookUrl) updatedSettings.webhookUrl = '';
        if (!Array.isArray(updatedSettings.webhookEvents)) updatedSettings.webhookEvents = [];
        
        // Save the updated settings
        fs.writeFileSync('./data/settings.json', JSON.stringify(updatedSettings, null, 2), 'utf8');
        
        res.json({
            success: true,
            message: 'Configuración actualizada correctamente',
            settings: updatedSettings
        });
    } catch (error) {
        console.error('Error al actualizar la configuración:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar la configuración',
            details: error.message
        });
    }
});

// Get current settings
app.get('/api/settings', (req, res) => {
    try {
        if (!fs.existsSync('./data/settings.json')) {
            // Return default settings if file doesn't exist
            const defaultSettings = {
                businessName: '',
                businessHours: {
                    enabled: false,
                    startTime: '09:00',
                    endTime: '18:00',
                    timeZone: 'America/Mexico_City',
                    awayMessage: 'We are currently out of office. Please contact us during business hours.'
                },
                autoReply: {
                    enabled: false,
                    message: 'Thank you for your message. We will get back to you soon.'
                },
                messageDelay: 2000,
                maxRetries: 3,
                webhookUrl: '',
                webhookEvents: [],
                conversationFlow: {
                    enabled: false,
                    initialMessage: 'Please select an option:',
                    options: []
                }
            };
            return res.json({
                success: true,
                data: defaultSettings
            });
        }
        
        const settings = JSON.parse(fs.readFileSync('./data/settings.json', 'utf8'));
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error al obtener la configuración:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener la configuración',
            details: error.message
        });
    }
});

// Información general
app.get('/api', (req, res) => {
    res.json({
        name: 'WhatsApp Campaign Manager',
        version: '3.0.0',
        status: 'active',
        endpoints: {
            status: 'GET /api/status',
            qr: 'GET /api/qr',

            // Contactos
            contacts: 'GET /api/contacts',
            importContacts: 'POST /api/contacts/import',

            // Campañas
            campaigns: 'GET /api/campaigns',
            createCampaign: 'POST /api/campaigns',
            executeCampaign: 'POST /api/campaigns/:id/execute',
            campaignStatus: 'GET /api/campaigns/:id',

            // Mensajes individuales
            sendMessage: 'POST /api/send-message',

            // Configuración
            settings: 'GET /api/settings'
        }
    });
});

// Estado del sistema
app.get('/api/status', (req, res) => {
    res.json({
        connected: isClientReady,
        clientInfo: clientInfo,
        needsQR: qrCodeData !== null,
        stats: {
            contacts: contacts.length,
            campaigns: campaigns.length,
            activeCampaigns: campaigns.filter(c => c.status === 'running').length,
            completedCampaigns: campaigns.filter(c => c.status === 'completed').length
        },
        uptime: process.uptime()
    });
});

// Código QR
app.get('/api/qr', (req, res) => {
    if (qrCodeData) {
        res.json({
            success: true,
            qr: qrCodeData,
            message: 'Escanea este código QR con tu teléfono'
        });
    } else if (isClientReady) {
        res.json({
            success: true,
            qr: null,
            message: 'Ya está autenticado y conectado'
        });
    } else {
        res.json({
            success: false,
            qr: null,
            message: 'QR no disponible en este momento'
        });
    }
});

// Importar contactos desde Excel
app.post('/api/contacts/import', uploadExcel.single('excel'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Archivo Excel requerido'
            });
        }

        const result = processExcelFile(req.file.path);

        // Agregar contactos únicos
        const newContacts = result.contacts.filter(newContact =>
            !contacts.some(existingContact => existingContact.phone === newContact.phone)
        );

        contacts.push(...newContacts);
        saveData();

        // Limpiar archivo temporal
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: `${newContacts.length} contactos importados correctamente`,
            imported: newContacts.length,
            duplicates: result.contacts.length - newContacts.length,
            errors: result.errors,
            totalContacts: contacts.length
        });

    } catch (error) {
        console.error('Error al importar contactos:', error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener contactos
app.get('/api/contacts', (req, res) => {
    const { page = 1, limit = 50, search = '' } = req.query;

    let filteredContacts = contacts;

    if (search) {
        filteredContacts = contacts.filter(contact =>
            contact.name.toLowerCase().includes(search.toLowerCase()) ||
            contact.phone.includes(search)
        );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

    res.json({
        success: true,
        contacts: paginatedContacts,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filteredContacts.length,
            pages: Math.ceil(filteredContacts.length / limit)
        }
    });
});

// Crear campaña
app.post('/api/campaigns', uploadMedia.single('media'), [
    body('name').notEmpty().withMessage('El nombre de la campaña es requerido'),
    body('message').notEmpty().withMessage('El mensaje es requerido'),
    body('contactIds').isArray().withMessage('Los contactos deben ser un array')
], handleValidationErrors, (req, res) => {
    try {
        const { name, message, contactIds, scheduledFor } = req.body;

        // Validar contactos
        const campaignContacts = contacts.filter(contact =>
            contactIds.includes(contact.id) && contact.source === 'excel_import'
        );

        if (campaignContacts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No se encontraron contactos válidos'
            });
        }

        // Procesar archivo multimedia si existe
        let mediaPath = null;
        let mediaType = null;

        if (req.file) {
            mediaPath = req.file.path;
            mediaType = req.file.mimetype;
        }

        // Procesar flujo de respuestas automáticas si existe
        let responseFlow = [];
        if (req.body.responseFlow) {
            try {
                responseFlow = JSON.parse(req.body.responseFlow);
            } catch (e) {
                responseFlow = [];
            }
        }

        const campaign = createCampaign({
            name,
            message,
            mediaPath,
            mediaType,
            contacts: campaignContacts,
            scheduledFor,
            responseFlow
        });

        res.status(201).json({
            success: true,
            message: 'Campaña creada correctamente',
            campaign: {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                contactsCount: campaign.contacts.length,
                createdAt: campaign.createdAt
            }
        });

    } catch (error) {
        console.error('Error al crear campaña:', error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: 'Error al crear la campaña'
        });
    }
});

// Obtener campañas
app.get('/api/campaigns', (req, res) => {
    const { status } = req.query;

    let filteredCampaigns = campaigns;

    if (status) {
        filteredCampaigns = campaigns.filter(c => c.status === status);
    }

    res.json({
        success: true,
        campaigns: filteredCampaigns.map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            progress: c.progress,
            createdAt: c.createdAt,
            startedAt: c.startedAt,
            completedAt: c.completedAt
        }))
    });
});

// Obtener detalles de campaña
app.get('/api/campaigns/:id', (req, res) => {
    const { id } = req.params;
    const campaign = campaigns.find(c => c.id === id);

    if (!campaign) {
        return res.status(404).json({
            success: false,
            error: 'Campaña no encontrada'
        });
    }

    res.json({
        success: true,
        campaign: campaign
    });
});

// Ejecutar campaña
app.post('/api/campaigns/:id/execute', checkClientReady, async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que la campaña existe
        const campaign = campaigns.find(c => c.id === id);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                error: 'Campaña no encontrada'
            });
        }

        // Ejecutar campaña en segundo plano
        res.json({
            success: true,
            message: 'Campaña iniciada correctamente',
            campaignId: id
        });

        // Ejecutar asíncronamente
        executeCampaign(id).catch(error => {
            console.error('Error ejecutando campaña:', error);
            campaign.status = 'failed';
            campaign.error = error.message;
            saveData();
        });

    } catch (error) {
        console.error('Error al iniciar campaña:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// [ELIMINADO] Endpoint de difusión masiva directa (broadcast) para forzar uso exclusivo de campañas con contactos importados por Excel.
// app.post('/api/broadcast', ...) [REMOVED]

app.post('/api/broadcast', uploadMedia.single('media'), async (req, res) => {
    try {
        const { phones, message } = req.body;
        console.log('Valor recibido en phones:', phones);
        console.log('Tipo de phones:', typeof phones);
        let phonesArray = phones;
        if (typeof phones === 'string') {
            try {
                phonesArray = JSON.parse(phones);
            } catch (e) {
                return res.status(400).json({ success: false, error: 'Formato de teléfonos inválido' });
            }
        }
        const results = [];
        let media = null;

        // Procesar archivo multimedia si existe
        if (req.file) {
            media = MessageMedia.fromFilePath(req.file.path);
        }

        for (const phoneRaw of phonesArray) {
            const phone = cleanPhoneNumber(phoneRaw);
            if (!phone) {
                results.push({ phone: phoneRaw, status: 'failed', error: 'Número inválido' });
                continue;
            }
            try {
                const isRegistered = await client.isRegisteredUser(phone);
                if (!isRegistered) {
                    results.push({ phone, status: 'failed', error: 'No registrado en WhatsApp' });
                    continue;
                }
                let sentMessage;
                if (media) {
                    sentMessage = await client.sendMessage(phone, media, { caption: message });
                } else {
                    sentMessage = await client.sendMessage(phone, message);
                }
                results.push({ phone, status: 'sent', messageId: sentMessage.id.id, timestamp: sentMessage.timestamp });
            } catch (err) {
                results.push({ phone, status: 'failed', error: err.message });
            }
        }

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Error en broadcast:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Enviar mensaje masivo con Excel
app.post('/api/send-excel-broadcast', uploadMedia.fields([
    { name: 'excel', maxCount: 1 },
    { name: 'media', maxCount: 1 }
]), [
    body('message').isString().notEmpty().withMessage('El mensaje es requerido')
], handleValidationErrors, checkClientReady, async (req, res) => {
    try {
        // Verificar que se haya subido un archivo Excel
        if (!req.files || !req.files.excel) {
            return res.status(400).json({
                success: false,
                error: 'Debe subir un archivo Excel con los contactos'
            });
        }

        // Procesar archivo Excel
        const excelFile = req.files.excel[0];
        const { contacts, errors } = processExcelFile(excelFile.path);

        if (contacts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No se encontraron contactos válidos en el archivo Excel',
                details: errors
            });
        }

        const { message } = req.body;
        const results = [];
        let media = null;

        // Procesar archivo multimedia si existe
        if (req.files.media && req.files.media[0]) {
            media = MessageMedia.fromFilePath(req.files.media[0].path);
        }

        // Enviar mensajes a cada contacto
        for (const contact of contacts) {
            try {
                // Verificar si el número está registrado
                const isRegistered = await client.isRegisteredUser(contact.phone);
                if (!isRegistered) {
                    results.push({
                        phone: contact.phone,
                        name: contact.name,
                        status: 'failed',
                        error: 'Número no registrado en WhatsApp'
                    });
                    continue;
                }

                // Crear objeto de mensaje
                const messageObj = {
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    to: contact.phone,
                    toName: contact.name,
                    message: message.replace('{nombre}', contact.name || 'Cliente'),
                    status: 'sending',
                    sentAt: new Date().toISOString(),
                    from: 'excel_broadcast',
                    type: media ? 'media' : 'text'
                };

                // Enviar mensaje
                let sentMessage;
                if (media) {
                    sentMessage = await client.sendMessage(contact.phone, media, {
                        caption: message.replace('{nombre}', contact.name || 'Cliente')
                    });
                } else {
                    sentMessage = await client.sendMessage(
                        contact.phone,
                        message.replace('{nombre}', contact.name || 'Cliente')
                    );
                }

                // Actualizar estado del mensaje
                messageObj.id = sentMessage.id.id;
                messageObj.status = 'sent';
                messageObj.messageId = sentMessage.id.id;
                messageObj.timestamp = sentMessage.timestamp;

                // Guardar mensaje
                messages.push(messageObj);
                saveMessages();

                results.push({
                    phone: contact.phone,
                    name: contact.name,
                    status: 'sent',
                    messageId: sentMessage.id.id,
                    timestamp: sentMessage.timestamp
                });

            } catch (error) {
                console.error(`Error enviando a ${contact.phone}:`, error);
                results.push({
                    phone: contact.phone,
                    name: contact.name,
                    status: 'failed',
                    error: error.message
                });
            }

            // Pequeña pausa entre mensajes para evitar bloqueos
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Limpiar archivos temporales
        if (req.files.media && req.files.media[0] && fs.existsSync(req.files.media[0].path)) {
            fs.unlinkSync(req.files.media[0].path);
        }
        if (fs.existsSync(excelFile.path)) {
            fs.unlinkSync(excelFile.path);
        }

        res.json({
            success: true,
            message: 'Mensajes enviados correctamente',
            total: contacts.length,
            sent: results.filter(r => r.status === 'sent').length,
            failed: results.filter(r => r.status === 'failed').length,
            results
        });

    } catch (error) {
        console.error('Error en envío masivo con Excel:', error);
        
        // Limpiar archivos temporales en caso de error
        if (req.files) {
            if (req.files.media && req.files.media[0] && fs.existsSync(req.files.media[0].path)) {
                fs.unlinkSync(req.files.media[0].path);
            }
            if (req.files.excel && req.files.excel[0] && fs.existsSync(req.files.excel[0].path)) {
                fs.unlinkSync(req.files.excel[0].path);
            }
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Enviar mensaje de difusión directa
app.post('/api/broadcast', uploadMedia.single('media'), [
    body('phones').isString().notEmpty().withMessage('Los números de teléfono son requeridos (separados por comas)'),
    body('message').isString().notEmpty().withMessage('El mensaje es requerido')
], handleValidationErrors, checkClientReady, async (req, res) => {
    try {
        const { phones, message } = req.body;
        const phonesArray = phones.split(',').map(p => p.trim());
        
        if (phonesArray.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Debe proporcionar al menos un número de teléfono'
            });
        }

        const results = [];
        let media = null;

        // Procesar archivo multimedia si existe
        if (req.file) {
            media = MessageMedia.fromFilePath(req.file.path);
        }

        for (const phoneRaw of phonesArray) {
            const phone = cleanPhoneNumber(phoneRaw);
            if (!phone) {
                results.push({ phone: phoneRaw, status: 'failed', error: 'Número inválido' });
                continue;
            }

            try {
                // Verificar si el número está registrado
                const isRegistered = await client.isRegisteredUser(phone);
                if (!isRegistered) {
                    results.push({ phone, status: 'failed', error: 'Número no registrado en WhatsApp' });
                    continue;
                }

                // Crear objeto de mensaje
                const messageObj = {
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    to: phone,
                    message: message,
                    status: 'sending',
                    sentAt: new Date().toISOString(),
                    from: 'broadcast',
                    type: media ? 'media' : 'text'
                };

                // Enviar mensaje
                let sentMessage;
                if (media) {
                    sentMessage = await client.sendMessage(phone, media, { caption: message });
                } else {
                    sentMessage = await client.sendMessage(phone, message);
                }

                // Actualizar estado del mensaje
                messageObj.id = sentMessage.id.id;
                messageObj.status = 'sent';
                messageObj.messageId = sentMessage.id.id;
                messageObj.timestamp = sentMessage.timestamp;

                // Guardar mensaje
                messages.push(messageObj);
                saveMessages();

                results.push({
                    phone,
                    status: 'sent',
                    messageId: sentMessage.id.id,
                    timestamp: sentMessage.timestamp
                });

            } catch (error) {
                console.error(`Error enviando a ${phone}:`, error);
                results.push({
                    phone,
                    status: 'failed',
                    error: error.message
                });
            }

            // Pequeña pausa entre mensajes
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Limpiar archivo temporal si existe
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json({
            success: true,
            message: 'Mensaje de difusión enviado',
            results
        });

    } catch (error) {
        console.error('Error en difusión:', error);
        
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Enviar mensaje individual
app.post('/api/send-message', uploadMedia.single('media'), [
    body('phone').notEmpty().withMessage('El número de teléfono es requerido'),
    body('message').notEmpty().withMessage('El mensaje es requerido')
], handleValidationErrors, checkClientReady, async (req, res) => {
    try {
        const { phone, message } = req.body;

        const formattedPhone = cleanPhoneNumber(phone);
        if (!formattedPhone) {
            return res.status(400).json({
                success: false,
                error: 'Número de teléfono inválido'
            });
        }

        // Verificar si el número existe
        const isRegistered = await client.isRegisteredUser(formattedPhone);
        if (!isRegistered) {
            return res.status(400).json({
                success: false,
                error: 'El número no está registrado en WhatsApp'
            });
        }

        // Crear objeto de mensaje
        const messageObj = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            to: formattedPhone,
            message: message,
            status: 'sending',
            sentAt: new Date().toISOString(),
            from: 'direct',
            type: req.file ? 'media' : 'text'
        };

        // Enviar mensaje
        let sentMessage;
        if (req.file) {
            const media = MessageMedia.fromFilePath(req.file.path);
            sentMessage = await client.sendMessage(formattedPhone, media, {
                caption: message
            });
            // Limpiar archivo temporal
            fs.unlinkSync(req.file.path);
        } else {
            sentMessage = await client.sendMessage(formattedPhone, message);
        }

        // Actualizar estado del mensaje
        messageObj.id = sentMessage.id.id;
        messageObj.status = 'sent';
        messageObj.messageId = sentMessage.id.id;
        messageObj.timestamp = sentMessage.timestamp;

        // Guardar mensaje
        messages.push(messageObj);
        saveMessages();

        res.json({
            success: true,
            message: 'Mensaje enviado correctamente',
            messageId: sentMessage.id.id,
            timestamp: sentMessage.timestamp
        });

    } catch (error) {
        console.error('Error al enviar mensaje:', error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Obtener configuración
app.get('/api/settings', (req, res) => {
    res.json({
        success: true,
        settings: settings
    });
});

// Actualizar configuración
app.put('/api/settings', (req, res) => {
    try {
        const updates = req.body;
        settings = { ...settings, ...updates };
        saveData();

        res.json({
            success: true,
            message: 'Configuración actualizada correctamente',
            settings: settings
        });

    } catch (error) {
        console.error('Error al actualizar configuración:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar la configuración'
        });
    }
});

// Exportar reporte de campaña
app.get('/api/campaigns/:id/report', (req, res) => {
    try {
        const { id } = req.params;
        const campaign = campaigns.find(c => c.id === id);

        if (!campaign) {
            return res.status(404).json({
                success: false,
                error: 'Campaña no encontrada'
            });
        }

        // Crear reporte CSV
        let csvContent = 'Nombre,Telefono,Estado,Error,Fecha\n';

        campaign.results.forEach(result => {
            const row = [
                `"${result.name}"`,
                result.phone.replace('@c.us', ''),
                result.status,
                result.error || '',
                result.timestamp
            ].join(',');
            csvContent += row + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=reporte-${campaign.name}-${Date.now()}.csv`);
        res.send(csvContent);

    } catch (error) {
        console.error('Error al generar reporte:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar el reporte'
        });
    }
});

// Manejo de errores
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado'
    });
});

app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'El archivo es demasiado grande'
            });
        }
    }

    res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
    });
});

// Iniciar servidor
const server = app.listen(PORT, HOST, () => {
    console.log(`🌐 Servidor ejecutándose en http://${HOST}:${PORT}`);
    console.log(`📚 Documentación disponible en http://${HOST}:${PORT}/api`);
});

// Manejo de cierre limpio
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando servidor...');

    // Pausar campañas activas
    campaigns.forEach(campaign => {
        if (campaign.status === 'running') {
            campaign.status = 'paused';
        }
    });
    saveData();

    server.close(() => {
        console.log('🌐 Servidor HTTP cerrado');
    });

    if (isClientReady) {
        try {
            await client.destroy();
            console.log('📱 Cliente WhatsApp cerrado');
        } catch (error) {
            console.error('Error al cerrar cliente:', error);
        }
    }

    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Excepción no capturada:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada:', reason);
    process.exit(1);
});