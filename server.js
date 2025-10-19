require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
// CRÍTICO: Asegúrate de tener la variable MONGO_URI definida en tu .env
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors()); 
app.use(express.json()); 

// Conexión a MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('Conectado a MongoDB Atlas'))
    .catch(err => console.error('Error de conexión a MongoDB:', err));

// =======================================================
// === 1. ESQUEMAS: Venta, Retiro, Grupo, Integrante     ===
// =======================================================

const VentaSchema = new mongoose.Schema({
    nombre: { type: String, required: true }, // Vendedor/Integrante
    cliente: { type: String, default: 'Anónimo' }, // NUEVO: Cliente/Comprador
    valor: { type: Number, required: true },
    fecha: { type: Date, default: Date.now },
    estado: { type: String, enum: ['Pagado', 'Pendiente', 'Cancelado'], default: 'Pagado' },
    descripcion: { type: String },
    producto: { type: String }
});

const RetiroSchema = new mongoose.Schema({
    cantidad: { type: Number, required: true },
    descripcion: { type: String, required: true },
    fecha: { type: Date, default: Date.now }
});

// ESQUEMAS DE GESTIÓN DE GRUPOS E INTEGRANTES
const GrupoSchema = new mongoose.Schema({
    nombreGrupo: { type: String, required: true, unique: true },
    fechaCreacion: { type: Date, default: Date.now }
});

const IntegranteSchema = new mongoose.Schema({
    nombre: { type: String, required: true }, // Nombre del vendedor
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
        const ventas = await Venta.find().sort({ fecha: -1 });
        res.status(200).json(ventas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener ventas', error: error.message });
    }
});

// GET /api/retiros (Obtener todo)
app.get('/api/retiros', async (req, res) => {
    try {
        const retiros = await Retiro.find().sort({ fecha: -1 });
        res.status(200).json(retiros);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener retiros', error: error.message });
    }
});


// POST /api/ventas (Registrar nueva venta) - AHORA CAPTURA 'cliente'
app.post('/api/ventas', async (req, res) => {
    try {
        // nombre es el VENDEDOR/Integrante
        const { nombre, cliente, valor, estado, descripcion, producto } = req.body;
        
        if (!nombre || !valor) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: nombre (vendedor) o valor.' });
        }
        
        const nuevaVenta = new Venta({ nombre, cliente, valor, estado, descripcion, producto });
        await nuevaVenta.save();
        res.status(201).json(nuevaVenta);
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar la venta', error: error.message });
    }
});

// POST /api/retiros (Registrar nuevo retiro)
app.post('/api/retiros', async (req, res) => {
    try {
        const { cantidad, descripcion } = req.body;
        
        if (!cantidad || !descripcion) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: cantidad o descripción.' });
        }

        const nuevoRetiro = new Retiro({ cantidad, descripcion });
        await nuevoRetiro.save();
        res.status(201).json(nuevoRetiro);
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar el retiro', error: error.message });
    }
});

// DELETE /api/datos-completos (Borrar todos los datos) - BORRA TODO, incluyendo GRUPOS/INTEGRANTES
app.delete('/api/datos-completos', async (req, res) => {
    try {
        await Venta.deleteMany({});
        await Retiro.deleteMany({});
        await Grupo.deleteMany({});
        await Integrante.deleteMany({});
        res.status(204).send(); // 204 No Content para borrado exitoso
    } catch (error) {
        res.status(500).json({ message: 'Error al borrar todos los datos', error: error.message });
    }
});


// ==========================================
// === 3. RUTAS DE GRUPOS E INTEGRANTES     ===
// ==========================================

// GET /api/grupos - Obtiene todos los grupos
app.get('/api/grupos', async (req, res) => {
    try {
        const grupos = await Grupo.find({});
        res.status(200).json(grupos);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener grupos', error: error.message });
    }
});

// POST /api/grupos - Crea un nuevo grupo
app.post('/api/grupos', async (req, res) => {
    try {
        const { nombreGrupo } = req.body;
        if (!nombreGrupo) {
            return res.status(400).json({ message: 'Falta el nombre del grupo.' });
        }
        const nuevoGrupo = new Grupo({ nombreGrupo });
        await nuevoGrupo.save();
        res.status(201).json(nuevoGrupo);
    } catch (error) {
        if (error.code === 11000) { // Error de clave duplicada (nombreGrupo debe ser único)
             return res.status(409).json({ message: 'El nombre del grupo ya existe.' });
        }
        res.status(500).json({ message: 'Error al crear el grupo', error: error.message });
    }
});

// GET /api/integrantes - Obtiene todos los integrantes (vendedores)
app.get('/api/integrantes', async (req, res) => {
    try {
        const integrantes = await Integrante.find({});
        res.status(200).json(integrantes);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener integrantes', error: error.message });
    }
});

// POST /api/integrantes - Agrega un nuevo integrante a un grupo
app.post('/api/integrantes', async (req, res) => {
    try {
        const { nombre, grupoId } = req.body;
        if (!nombre || !grupoId) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: nombre del vendedor o ID del grupo.' });
        }
        
        // Verifica que el grupoId sea válido antes de crear el integrante
        const grupoExiste = await Grupo.findById(grupoId);
        if (!grupoExiste) {
             return res.status(404).json({ message: 'Grupo no encontrado. Verifica el grupoId.' });
        }

        const nuevoIntegrante = new Integrante({ nombre, grupoId });
        await nuevoIntegrante.save();
        res.status(201).json(nuevoIntegrante);
    } catch (error) {
        res.status(500).json({ message: 'Error al agregar el integrante', error: error.message });
    }
});


// Ruta por defecto
app.get('/', (req, res) => {
    res.send('Control de Ventas API está activo.');
});

// Manejador de error 404
app.use((req, res) => {
    res.status(404).send('Error 404: Ruta de API no encontrada.');
});


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor Express escuchando en el puerto ${PORT}`);
});
