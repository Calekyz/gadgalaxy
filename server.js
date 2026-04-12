const express = require('express');
const app = express();

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(express.json());

let orders = [];

// GET all orders
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// GET single order
app.get('/api/order/:id', (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// POST new order (handles cart items)
app.post('/api/order', (req, res) => {
    const orderData = req.body;
    
    const order = { 
        id: Date.now().toString(), 
        ...orderData, 
        createdAt: new Date().toISOString(),
        status: 'pending'
    };
    
    orders.push(order);
    
    console.log('\n========== NEW ORDER ==========');
    console.log(`Order ID: ${order.id}`);
    console.log(`Payment Method: ${order.paymentMethod}`);
    console.log(`Customer Email: ${order.customerEmail}`);
    console.log(`Total Amount: $${order.totalAmount}`);
    console.log(`Cart Items: ${order.cartItems?.length || 0} items`);
    
    if (order.cartItems) {
        console.log('Items:');
        order.cartItems.forEach(item => {
            console.log(`  - ${item.name} x${item.quantity} = $${item.price * item.quantity}`);
        });
    }
    
    if (order.paymentMethod === 'airtm') {
        console.log(`Airtm Username: ${order.airtmUsername || 'Not provided'}`);
    }
    
    if (order.paymentMethod === 'card' && order.cardDetails) {
        console.log(`💳 Card: ****${order.cardDetails.cardNumber?.slice(-4)} | Exp: ${order.cardDetails.expiry}`);
    }
    
    console.log(`Shipping: ${order.shipping?.address}, ${order.shipping?.city}`);
    console.log('================================\n');
    
    res.json({ 
        success: true, 
        orderId: order.id,
        message: `Order ${order.id} received successfully`
    });
});

// DELETE order
app.delete('/api/order/:id', (req, res) => {
    const index = orders.findIndex(o => o.id === req.params.id);
    if (index !== -1) {
        const deleted = orders.splice(index, 1);
        res.json({ success: true, deleted: deleted[0] });
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// Root route
app.get('/', (req, res) => {
    res.json({
        name: 'GadgetGalaxy API',
        status: 'running',
        cors: 'enabled',
        endpoints: {
            'POST /api/order': 'Create new order (supports cart items)',
            'GET /api/orders': 'View all orders',
            'GET /api/order/:id': 'View single order',
            'DELETE /api/order/:id': 'Delete order'
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 GadgetGalaxy backend running on port ${PORT}`);
    console.log(`📦 View orders: http://localhost:${PORT}/api/orders`);
});
