const mongoose = require('mongoose');

const ventaSchema = new mongoose.Schema({
    nombre: { 
        type: String,
        required: true,
        trim: true
    },
    valor: { 
        type: Number,
        required: true,
        min: 0.01
    },
    fecha: { 
        type: Date,
        default: Date.now
    },
    estado: { 
        type: String,
        required: true,
        enum: ['Pagado', 'Pendiente', 'Cancelado']
    },
    descripcion: { 
        type: String,
        required: false,
        trim: true
    },
    producto: { 
        type: String,
        required: false,
        trim: true
    }
});

module.exports = mongoose.model('Venta', ventaSchema);
