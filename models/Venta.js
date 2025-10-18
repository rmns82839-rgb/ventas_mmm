const mongoose = require('mongoose');

// Esquema de la Venta (estructura de datos requerida por el frontend)
const ventaSchema = new mongoose.Schema({
    nombre: { // Nombre del integrante (ej: Ivan)
        type: String,
        required: true,
        trim: true
    },
    valor: { // Cantidad monetaria
        type: Number,
        required: true,
        min: 0.01
    },
    fecha: { // Fecha de la venta
        type: Date,
        default: Date.now
    },
    estado: { // Ej: Pagado, Pendiente, Cancelado
        type: String,
        required: true,
        enum: ['Pagado', 'Pendiente', 'Cancelado']
    },
    descripcion: { // Ej: Venta de 2 x Producto A
        type: String,
        required: false,
        trim: true
    },
    producto: { // El producto vendido (Ej: Producto A ($10.50))
        type: String,
        required: false,
        trim: true
    }
});

module.exports = mongoose.model('Venta', ventaSchema);
