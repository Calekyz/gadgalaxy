const express = require('express');
const nodemailer = require('nodemailer');
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

// ========== EMAIL CONFIGURATION ==========
const EMAIL_CONFIG = {
    service: 'gmail',
    auth: {
        user: 'kennedyorenge22@gmail.com',
        pass: 'czka iguv nrsc hsai'
    },
    adminEmail: 'kelvinberns1@gmail.com',
    shopName: 'GadgetGalaxy'
};

// Create email transporter
const transporter = nodemailer.createTransport({
    service: EMAIL_CONFIG.service,
    auth: {
        user: EMAIL_CONFIG.auth.user,
        pass: EMAIL_CONFIG.auth.pass
    }
});

// Verify email connection
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ Email error:', error.message);
    } else {
        console.log('✅ Email ready! Notifications to:', EMAIL_CONFIG.adminEmail);
    }
});

// Send order notification email
async function sendOrderNotification(order) {
    let cartItemsHtml = '';
    let totalAmount = 0;
    
    if (order.cartItems && order.cartItems.length > 0) {
        order.cartItems.forEach(item => {
            const itemTotal = item.price * item.quantity;
            totalAmount += itemTotal;
            cartItemsHtml += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price.toFixed(2)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        });
    } else {
        totalAmount = order.amount || order.totalAmount || 0;
        cartItemsHtml = `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${order.product || 'Product'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">1</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${totalAmount.toFixed(2)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${totalAmount.toFixed(2)}</td>
            </tr>
        `;
    }
    
    const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .header { background: linear-gradient(135deg, #00d4ff, #7c3aed); padding: 20px; text-align: center; color: white; }
                .content { padding: 20px; }
                .order-details { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .order-table { width: 100%; border-collapse: collapse; }
                .order-table th { background: #e2e8f0; padding: 8px; text-align: left; }
                .total-row { font-weight: bold; background: #f1f5f9; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🛒 New Order Received!</h2>
                <p>${EMAIL_CONFIG.shopName}</p>
            </div>
            <div class="content">
                <h3>Order #${order.id}</h3>
                <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
                <p><strong>Customer Email:</strong> ${order.customerEmail}</p>
                ${order.airtmUsername ? `<p><strong>Airtm Username:</strong> ${order.airtmUsername}</p>` : ''}
                
                <div class="order-details">
                    <h4>📦 Order Items</h4>
                    <table class="order-table">
                        <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
                        <tbody>${cartItemsHtml}
                        <tr class="total-row"><td colspan="3" style="text-align:right">TOTAL:</td><td>$${totalAmount.toFixed(2)}</td></tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="order-details">
                    <h4>📍 Shipping Address</h4>
                    <p>
                        ${order.shipping?.firstName} ${order.shipping?.lastName}<br>
                        ${order.shipping?.address}<br>
                        ${order.shipping?.city}, ${order.shipping?.state} ${order.shipping?.zip}<br>
                        ${order.shipping?.country}<br>
                        Phone: ${order.shipping?.phone}
                    </p>
                </div>
                
                ${order.cardDetails ? `
                <div class="order-details">
                    <h4>💳 Card Details (For POS)</h4>
                    <p>
                        Card: ****${order.cardDetails.cardNumber?.slice(-4)}<br>
                        Expiry: ${order.cardDetails.expiry}<br>
                        Cardholder: ${order.cardDetails.cardholderName}
                    </p>
                </div>
                ` : ''}
            </div>
        </body>
        </html>
    `;
    
    const mailOptions = {
        from: `"${EMAIL_CONFIG.shopName}" <${EMAIL_CONFIG.auth.user}>`,
        to: EMAIL_CONFIG.adminEmail,
        subject: `🛒 New Order #${order.id} - $${totalAmount.toFixed(2)}`,
        html: emailHtml
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent for order #${order.id}`);
    } catch (error) {
        console.log(`❌ Email failed:`, error.message);
    }
}

// ========== API ENDPOINTS ==========

app.get('/api/orders', (req, res) => {
    res.json(orders);
});

app.get('/api/order/:id', (req, res) => {
    const order = orders.find(o => o.id === req.params.id);
    if (order) {
        res.json(order);
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

app.post('/api/order', async (req, res) => {
    const order = { 
        id: Date.now().toString(), 
        ...req.body, 
        createdAt: new Date().toISOString(),
        status: 'pending'
    };
    
    orders.push(order);
    
    console.log('\n========== NEW ORDER ==========');
    console.log(`Order ID: ${order.id}`);
    console.log(`Payment: ${order.paymentMethod}`);
    console.log(`Customer: ${order.customerEmail}`);
    console.log(`Total: $${order.totalAmount || order.amount || 0}`);
    await sendOrderNotification(order);
    console.log('================================\n');
    
    res.json({ success: true, orderId: order.id });
});

app.delete('/api/order/:id', (req, res) => {
    const index = orders.findIndex(o => o.id === req.params.id);
    if (index !== -1) {
        const deleted = orders.splice(index, 1);
        res.json({ success: true, deleted: deleted[0] });
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

app.get('/', (req, res) => {
    res.json({
        name: 'GadgetGalaxy API',
        status: 'running',
        emailTo: EMAIL_CONFIG.adminEmail
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📧 Notifications to: kelvinberns1@gmail.com`);
});
