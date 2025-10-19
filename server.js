require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Importar 'path' para servir archivos estáticos

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors()); 
app.use(express.json()); 

// =======================================================
// === SERVIDOR ESTATICO (CRÍTICO PARA RENDER)
// =======================================================

// Define la carpeta 'frontend' como la raíz de los archivos estáticos
const frontendPath = path.join(__dirname, 'frontend'); 
app.use(express.static(frontendPath));

// Ruta principal que sirve index.html
app.get('/', (req, res) => {
    // Asume que el index.html está en la carpeta 'frontend'
    res.sendFile(path.join(frontendPath, 'index.html'));
});


// Conexión a MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('Conectado a MongoDB Atlas'))
    .catch(err => console.error('Error de conexión a MongoDB:', err));

// =======================================================
// === 1. ESQUEMAS: Venta, Retiro, Grupo, Integrante     ===
// =======================================================

const VentaSchema = new mongoose.Schema({
    nombre: { type: String, required: true }, // Vendedor/Integrante
    cliente: { type: String, default: 'Anónimo' }, 
    valor: { type: Number, required: true }, // Valor total original de la venta
    fecha: { type: Date, default: Date.now },
    estado: { type: String, enum: ['Pagado', 'Pendiente', 'Cancelado'], default: 'Pagado' },
    descripcion: { type: String },
    producto: { type: String },
    
    // CAMPOS NUEVOS PARA GESTION DE PAGO PARCIAL
    saldoPendiente: { type: Number, required: true, default: 0 }, 
    pagos: [{
        monto: { type: Number, required: true },
        fecha: { type: Date, default: Date.now }
    }]
});

const RetiroSchema = new mongoose.Schema({
    cantidad: { type: Number, required: true },
    descripcion: { type: String, required: true },
    fecha: { type: Date, default: Date.now }
});

const GrupoSchema = new mongoose.Schema({
    nombreGrupo: { type: String, required: true, unique: true },
    fechaCreacion: { type: Date, default: Date.now }
});

const IntegranteSchema = new mongoose.Schema({
    nombre: { type: String, required: true }, 
    grupoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grupo', required: true },
    activo: { type: Boolean, default: true }
});


const Venta = mongoose.model('Venta', VentaSchema);
const Retiro = mongoose.model('Retiro', RetiroSchema);
const Grupo = mongoose.model('Grupo', GrupoSchema); 
const Integrante = mongoose.model('Integrante', IntegranteSchema); 


// ===================================
// === 2. RUTAS DE VENTA Y RETIRO    ===
// ===================================

// GET /api/ventas (Obtener todo)
app.get('/api/ventas', async (req, res) => {
    try {
        // Se asegura de traer los campos nuevos.
        const ventas = await Venta.find().sort({ fecha: -1 }); 
        res.status(200).json(ventas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
    }
});

// POST /api/ventas (Registrar nueva venta) - AHORA MANEJA saldoPendiente
app.post('/api/ventas', async (req, res) => {
    try {
        const { nombre, cliente, valor, estado, descripcion, producto } = req.body;
        
        if (!nombre || !valor) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: nombre (vendedor) o valor.' });
        }
        
        // Lógica: Si el estado es 'Pendiente', el saldo pendiente es el valor total.
        const saldoPendiente = estado === 'Pendiente' ? valor : 0;
        
        const nuevaVenta = new Venta({ 
            nombre, 
            cliente, 
            valor, 
            estado, 
            descripcion, 
            producto,
            saldoPendiente // Asignación del nuevo campo
        });
        
        await nuevaVenta.save();
        res.status(201).json(nuevaVenta);
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar la venta', error: error.message });
    }
});

// ========================================================
// === NUEVO: RUTA PARA REGISTRAR PAGO PARCIAL O TOTAL    ===
// ========================================================
app.put('/api/ventas/:id/pago', async (req, res) => {
    try {
        const ventaId = req.params.id;
        const { montoPagado } = req.body;

        if (!montoPagado || isNaN(montoPagado) || montoPagado <= 0) {
            return res.status(400).json({ message: 'El montoPagado debe ser un número positivo.' });
        }

        const venta = await Venta.findById(ventaId);

        if (!venta) {
            return res.status(404).json({ message: 'Venta no encontrada.' });
        }

        if (venta.estado !== 'Pendiente' || venta.saldoPendiente <= 0) {
            return res.status(400).json({ message: 'Esta venta no tiene un saldo pendiente para pagar.' });
        }
        
        if (montoPagado > venta.saldoPendiente) {
            return res.status(400).json({ message: `El monto excede el saldo pendiente. Saldo: ${venta.saldoPendiente}` });
        }

        // 1. Actualizar Saldo Pendiente
        const nuevoSaldo = venta.saldoPendiente - montoPagado;
        
        // 2. Determinar nuevo estado
        const nuevoEstado = nuevoSaldo <= 0.01 ? 'Pagado' : 'Pendiente'; // Usamos 0.01 por seguridad de punto flotante.

        // 3. Actualizar la Venta
        const ventaActualizada = await Venta.findByIdAndUpdate(ventaId, 
            {
                $set: { 
                    saldoPendiente: nuevoSaldo,
                    estado: nuevoEstado
                },
                $push: { // Agrega el pago al historial
                    pagos: { monto: montoPagado, fecha: new Date() }
                }
            },
            { new: true } // Retorna el documento actualizado
        );

        res.status(200).json(ventaActualizada);

    } catch (error) {
        res.status(500).json({ message: 'Error al registrar el pago', error: error.message });
    }
});
// ========================================================


// [Otras rutas de Retiro, Grupos e Integrantes quedan sin cambios...]

// POST /api/retiros (Registrar nuevo retiro)
app.post('/api/retiros', async (req, res) => { /* ... (código anterior) ... */ });
app.get('/api/retiros', async (req, res) => { /* ... (código anterior) ... */ });
app.delete('/api/datos-completos', async (req, res) => { /* ... (código anterior) ... */ });
app.get('/api/grupos', async (req, res) => { /* ... (código anterior) ... */ });
app.post('/api/grupos', async (req, res) => { /* ... (código anterior) ... */ });
app.get('/api/integrantes', async (req, res) => { /* ... (código anterior) ... */ });
app.post('/api/integrantes', async (req, res) => { /* ... (código anterior) ... */ });


// Manejador de error 404 para rutas de API no manejadas
app.use((req, res, next) => {
    // Si no es una ruta de API, deja que Express intente servir un archivo estático
    if (req.path.startsWith('/api')) {
        res.status(404).send('Error 404: Ruta de API no encontrada.');
    } else {
        next(); // Continúa buscando archivos estáticos
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en el puerto ${PORT}`);
});
