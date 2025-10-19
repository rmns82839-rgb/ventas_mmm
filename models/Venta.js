const mongoose = require('mongoose');

const VentaSchema = new mongoose.Schema({
    nombre: { type: String, required: true }, // Vendedor/Integrante
    cliente: { type: String, default: 'Anónimo' }, // Cliente/Comprador
    valor: { type: Number, required: true },
    estado: { 
        type: String, 
        enum: ['Pagado', 'Pendiente', 'Cancelado'], 
        default: 'Pagado' 
    },
    // NUEVO CAMPO CLAVE: Rastrea cuánto se ha pagado. Inicialmente 0.
    montoPagado: { type: Number, default: 0 }, 
    descripcion: { type: String },
    producto: { type: String, default: 'Venta Manual' },
    fecha: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Venta', VentaSchema);
