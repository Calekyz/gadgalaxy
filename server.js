const express = require('express');
const app = express();
app.use(express.json());

let orders = [];

// ========== GET all orders ==========
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// ========== GET single order by ID ==========
app.get('/api/order/:id', (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// ========== POST new order (supports ALL payment methods) ==========
app.post('/api/order', (req, res) => {
    const orderData = req.body;
    
    const order = { 
        id: Date.now().toString(), 
        ...orderData, 
        createdAt: new Date().toISOString(),
        status: 'pending'
    };
    
    orders.push(order);
    
    // Log based on payment method
    console.log('\n========== NEW ORDER ==========');
    console.log(`Order ID: ${order.id}`);
    console.log(`Product: ${order.product}`);
    console.log(`Amount: $${order.amount}`);
    console.log(`Payment Method: ${order.paymentMethod}`);
    console.log(`Customer Email: ${order.customerEmail}`);
    
    if (order.paymentMethod === 'airtm') {
        console.log(`Airtm Username: ${order.airtmUsername || 'Not provided'}`);
    }
    
    if (order.paymentMethod === 'card') {
        console.log(`Card Last 4: ${order.billing?.cardLast4 || 'N/A'}`);
        console.log(`Cardholder: ${order.billing?.cardholderName || 'N/A'}`);
    }
    
    if (order.paymentMethod === 'crypto') {
        console.log(`Crypto Type: USDT (TRC20)`);
    }
    
    console.log(`Shipping: ${order.shipping?.address}, ${order.shipping?.city}, ${order.shipping?.country}`);
    console.log('================================\n');
    
    res.json({ 
        success: true, 
        orderId: order.id,
        message: `Order ${order.id} received successfully`
    });
});

// ========== DELETE order (for testing) ==========
app.delete('/api/order/:id', (req, res) => {
    const index = orders.findIndex(o => o.id === req.params.id);
    if (index !== -1) {
        const deleted = orders.splice(index, 1);
        res.json({ success: true, deleted: deleted[0] });
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// ========== Root route ==========
app.get('/', (req, res) => {
    res.json({
        name: 'GadgetGalaxy API',
        status: 'running',
        endpoints: {
            'POST /api/order': 'Create new order',
            'GET /api/orders': 'View all orders',
            'GET /api/order/:id': 'View single order',
            'DELETE /api/order/:id': 'Delete order (testing)'
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 GadgetGalaxy backend running on port ${PORT}`);
    console.log(`📦 View orders: http://localhost:${PORT}/api/orders`);
});
