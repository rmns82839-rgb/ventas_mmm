const mongoose = require('mongoose');

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
