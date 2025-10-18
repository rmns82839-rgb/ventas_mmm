const mongoose = require('mongoose');

// Define el esquema para los Retiros de Caja
const retiroSchema = new mongoose.Schema({
    cantidad: {
        type: Number,
        required: true,
        min: 0.01
    },
    descripcion: {
        type: String,
        required: true,
        trim: true
    },
    fecha: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Retiro', retiroSchema);
