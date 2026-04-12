const express = require('express');
const app = express();
app.use(express.json());

let orders = [];

// IMPORTANT: This is the endpoint your HTML is calling
app.post('/api/order', (req, res) => {
    const order = { 
        id: Date.now().toString(), 
        ...req.body, 
        createdAt: new Date().toISOString() 
    };
    orders.push(order);
    console.log('New order:', order);
    res.json({ success: true, orderId: order.id });
});

// View all orders
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// Root route
app.get('/', (req, res) => {
    res.send('GadgetGalaxy API is running. Use POST /api/order to create orders.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
