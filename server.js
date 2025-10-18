// server.js

// 1. Cargar variables de entorno desde el archivo .env
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Define el puerto y la URI de conexión
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// --- Middlewares ---
app.use(express.json());
app.use(cors()); 

// 2. Conexión a MongoDB
if (!MONGO_URI) {
    console.error('❌ Error: La variable de entorno MONGO_URI no está definida.');
} else {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ Conexión a MongoDB Atlas establecida con éxito.'))
        .catch(err => {
            console.error('❌ Error de conexión a MongoDB. Verifica MONGO_URI y la configuración de Atlas.', err);
        });
}

// --- 3. Definición del Esquema (Modelo de Transacción UNIFICADO) ---
const TransaccionSchema = new mongoose.Schema({
    // Tipo: Define si es VENTA o RETIRO
    tipo: { 
        type: String, 
        enum: ['VENTA', 'RETIRO'], 
        required: true 
    },
    // Descripción/Concepto (Usado para ambos tipos)
    descripcion: { 
        type: String, 
        required: true, 
        trim: true 
    },
    // Valor (Positivo para VENTA, Negativo para RETIRO)
    valor: { 
        type: Number, 
        required: true, 
        min: 0 // Se valida que el valor ingresado sea positivo; el signo se maneja con 'tipo'
    },
    // --- Campos Específicos de VENTA ---
    estado: { 
        type: String, 
        enum: ['Pagado', 'Fiado'], 
        default: 'Pagado' // Ahora Pagado por defecto
    },
    cliente: { 
        type: String, 
        default: 'Anónimo' 
    },
    // --- Nuevos Campos Solicitados ---
    grupo: {
        type: String,
        default: 'General'
    },
    integrantes: {
        type: String,
        default: 'N/A'
    }
}, { 
    timestamps: true 
});

const Transaccion = mongoose.model('Transaccion', TransaccionSchema);

// --- 4. Rutas de API (CRUD - Mapeadas a /api/transacciones) ---

// CREATE: Crear una nueva transacción (Venta o Retiro)
app.post('/api/transacciones', async (req, res) => {
    try {
        const nuevaTransaccion = new Transaccion(req.body);
        await nuevaTransaccion.save();
        res.status(201).json(nuevaTransaccion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// READ ALL: Obtener todas las transacciones
app.get('/api/transacciones', async (req, res) => {
    try {
        const transacciones = await Transaccion.find().sort({ createdAt: -1 }); 
        res.json(transacciones);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE: Actualizar una transacción por ID (Usado para cambiar estado/abonar)
app.put('/api/transacciones/:id', async (req, res) => {
    try {
        const transaccionActualizada = await Transaccion.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!transaccionActualizada) return res.status(404).json({ message: 'Transacción no encontrada' });
        res.json(transaccionActualizada);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE: Eliminar una transacción por ID
app.delete('/api/transacciones/:id', async (req, res) => {
    try {
        const transaccionEliminada = await Transaccion.findByIdAndDelete(req.params.id);
        if (!transaccionEliminada) return res.status(404).json({ message: 'Transacción no encontrada' });
        res.json({ message: 'Transacción eliminada con éxito' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 5. Inicia el servidor
app.listen(PORT, () => {
  console.log(`El servidor está corriendo en el puerto ${PORT}`);
});