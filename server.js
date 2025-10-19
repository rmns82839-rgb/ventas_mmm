const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Cargar variables de entorno (solo para desarrollo local, Render usa las variables)
dotenv.config();

const app = express();

// --- CONFIGURACIÓN PRINCIPAL ---
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A MONGODB ---
// Utiliza la variable de entorno MONGO_URI configurada en Render
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Conectado a MongoDB Atlas'))
    .catch(err => {
        console.error('❌ Error al conectar a MongoDB:', err.message);
        process.exit(1);
    });

// --- MODELOS DE DATOS ---
const Venta = require('./models/Venta'); 
const Retiro = require('./models/Retiro'); 

// --- RUTAS DE API ---

// 1. GUARDAR VENTA (CREATE)
app.post('/api/ventas', async (req, res) => {
    try {
        const nuevaVenta = new Venta(req.body);
        await nuevaVenta.save();
        res.status(201).json({ message: 'Venta registrada con éxito', data: nuevaVenta });
    } catch (error) {
        res.status(400).json({ message: 'Error de validación al registrar la venta', error: error.message });
    }
});

// 2. OBTENER TODAS LAS VENTAS (READ)
app.get('/api/ventas', async (req, res) => {
    try {
        const ventas = await Venta.find().sort({ fecha: -1 });
        res.status(200).json(ventas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las ventas de la base de datos', error: error.message });
    }
});

// 3. GUARDAR RETIRO (CREATE)
app.post('/api/retiros', async (req, res) => {
    try {
        const { cantidad, descripcion } = req.body;

        if (!cantidad || !descripcion) {
            return res.status(400).json({ message: 'Faltan campos: cantidad y descripción son obligatorios.' });
        }
        
        const nuevoRetiro = new Retiro({ cantidad, descripcion });
        await nuevoRetiro.save();
        
        res.status(201).json({ message: 'Retiro registrado con éxito', data: nuevoRetiro });
    } catch (error) {
        res.status(400).json({ message: 'Error al registrar el retiro', error: error.message });
    }
});

// 4. OBTENER TODOS LOS RETIROS (READ)
app.get('/api/retiros', async (req, res) => {
    try {
        const retiros = await Retiro.find().sort({ fecha: -1 });
        res.status(200).json(retiros);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los retiros de la base de datos', error: error.message });
    }
});

// 5. RUTA PARA BORRAR TODOS LOS DATOS (DELETE) <--- ESTE ES EL ENDPOINT NUEVO
app.delete('/api/datos-completos', async (req, res) => {
    try {
        const ventasResult = await Venta.deleteMany({});
        const retirosResult = await Retiro.deleteMany({});
        
        res.status(200).json({ 
            message: 'Todos los datos de Ventas y Retiros han sido borrados con éxito.',
            ventasBorradas: ventasResult.deletedCount, 
            retirosBorrados: retirosResult.deletedCount 
        });

    } catch (error) {
        console.error('Error al borrar los datos completos:', error);
        res.status(500).json({ message: 'Error interno del servidor al intentar borrar los datos.', error: error.message });
    }
});


// 6. RUTA DE PRUEBA
app.get('/', (req, res) => {
    res.status(200).send('Servidor de Ventas CRUD está operativo.');
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
