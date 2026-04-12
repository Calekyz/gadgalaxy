const express = require('express');
const app = express();
app.use(express.json());

let orders = [];

app.post('/api/order', (req, res) => {
    const order = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() };
    orders.push(order);
    console.log('New order:', order);
    res.json({ success: true, orderId: order.id });
});

app.get('/api/orders', (req, res) => res.json(orders));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
