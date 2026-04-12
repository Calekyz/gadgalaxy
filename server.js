const express = require('express');
const app = express();
app.use(express.json());

let orders = [];

// GET all orders (view orders)
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

// POST new order
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

// Root route
app.get('/', (req, res) => {
    res.send('GadgetGalaxy API is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
