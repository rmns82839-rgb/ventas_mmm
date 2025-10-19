// --- BUSCA Y MODIFICA LA LÓGICA DE CREAR VENTA (POST /api/ventas) ---
// Asegúrate de que tu lógica POST ahora calcule el montoPagado inicial:

/*
app.post('/api/ventas', async (req, res) => {
    try {
        const { nombre, cliente, valor, estado, descripcion, producto } = req.body;
        
        let montoPagado = 0;
        // Si el estado inicial es 'Pagado', el monto pagado es igual al valor total.
        if (estado === 'Pagado') {
            montoPagado = valor;
        }

        const newVenta = new Venta({
            nombre,
            cliente,
            valor,
            estado,
            descripcion,
            producto,
            fecha: new Date(),
            montoPagado // <--- Asegúrate de que esta línea esté presente
        });

        await newVenta.save();
        res.status(201).json(newVenta);
    } catch (error) {
        res.status(500).json({ message: 'Error al crear la venta', error: error.message });
    }
});
*/

// --- AÑADE ESTA NUEVA LÓGICA DE RUTA (PUT /api/ventas/pago/:id) ---
// Colócala junto a tus otras rutas de API, por ejemplo, después del POST de Ventas.

app.put('/api/ventas/pago/:id', async (req, res) => {
    const { id } = req.params;
    const { monto } = req.body; // Monto a pagar en esta transacción

    if (typeof monto !== 'number' || monto <= 0) {
        return res.status(400).json({ message: 'El monto de pago debe ser un número positivo.' });
    }

    try {
        const venta = await Venta.findById(id);

        if (!venta) {
            return res.status(404).json({ message: 'Venta no encontrada.' });
        }
        
        // No permitir pagos a ventas canceladas
        if (venta.estado === 'Cancelado') {
             return res.status(400).json({ message: 'No se puede registrar pagos en ventas Canceladas.' });
        }

        // Calcular la deuda restante
        const deudaRestante = venta.valor - venta.montoPagado;
        
        if (deudaRestante <= 0.01) { // Pequeño margen para coma flotante
            return res.status(400).json({ message: 'Esta venta ya está totalmente pagada.' });
        }

        let montoAplicado = monto;
        
        if (monto > deudaRestante) {
            // Si el pago es mayor a la deuda, ajustamos el monto aplicado.
            montoAplicado = deudaRestante;
            console.log(`Pago ajustado: se recibió $${monto.toFixed(2)}, pero solo se aplicó el restante de $${deudaRestante.toFixed(2)}.`);
        }

        // Aplicar el pago
        venta.montoPagado += montoAplicado;

        // Verificar si se completó el pago
        if (venta.montoPagado >= venta.valor - 0.01) { 
            venta.estado = 'Pagado';
            venta.montoPagado = venta.valor; // Asegura el valor exacto
        } else {
             // Si aún queda deuda, el estado debe ser 'Pendiente'
             venta.estado = 'Pendiente'; 
        }
        
        await venta.save();

        res.status(200).json(venta); // Devolver el objeto de venta actualizado
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar el pago', error: error.message });
    }
});
