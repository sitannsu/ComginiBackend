const crypto = require('crypto');
const pool = require('../config/database');

let Razorpay;
try {
    Razorpay = require('razorpay');
} catch {
    Razorpay = null;
}

const PLANS = [
    {
        id: 'plan_pro',
        name: 'Pro Plan',
        price: 1199,
        duration: 'monthly',
        features: [
            'Manage up to 50 Clients',
            'Advanced Compliance Tracking',
            'MCA Filing Automation',
            'Smart Alerts & Reminders'
        ]
    }
];

function getPlanById(planId) {
    return PLANS.find((p) => p.id === planId) || null;
}

const getPlans = async (req, res) => {
    res.json({ success: true, data: PLANS });
};

const getCurrentSubscription = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT plan_id, status, expiry_date FROM user_subscriptions WHERE user_id = ? LIMIT 1',
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.json({
                success: true,
                data: {
                    planId: null,
                    status: 'none',
                    expiryDate: null
                }
            });
        }
        const r = rows[0];
        res.json({
            success: true,
            data: {
                planId: r.plan_id,
                status: r.status,
                expiryDate: r.expiry_date ? r.expiry_date.toISOString().slice(0, 10) : null
            }
        });
    } catch (error) {
        console.error('getCurrentSubscription error:', error);
        res.status(500).json({ success: false, message: 'Failed to load subscription' });
    }
};

function getRazorpayInstance() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret || !Razorpay) {
        return null;
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

const createOrder = async (req, res) => {
    try {
        const { planId, amount } = req.body;
        const plan = getPlanById(planId);
        if (!plan) {
            return res.status(400).json({ success: false, message: 'Invalid planId' });
        }
        if (Number(amount) !== plan.price) {
            return res.status(400).json({ success: false, message: 'Amount does not match selected plan' });
        }
        const rzp = getRazorpayInstance();
        if (!rzp) {
            return res.status(503).json({
                success: false,
                message: 'Payment gateway is not configured (set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET and install razorpay)'
            });
        }
        const amountPaise = Math.round(plan.price * 100);
        const order = await rzp.orders.create({
            amount: amountPaise,
            currency: 'INR',
            receipt: `sub_${req.user.id}_${Date.now()}`
        });
        await pool.query(
            `INSERT INTO subscription_payment_orders (user_id, plan_id, razorpay_order_id, amount_paise, currency, status)
       VALUES (?, ?, ?, ?, 'INR', 'created')`,
            [req.user.id, planId, order.id, amountPaise]
        );
        res.json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        console.error('createOrder error:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }
};

const verifyPayment = async (req, res) => {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
        return res.status(503).json({ success: false, message: 'Payment gateway is not configured' });
    }
    const sigBody = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', secret).update(sigBody).digest('hex');
    if (expected !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [orders] = await conn.query(
            'SELECT * FROM subscription_payment_orders WHERE razorpay_order_id = ? AND user_id = ? FOR UPDATE',
            [orderId, req.user.id]
        );
        if (orders.length === 0) {
            await conn.rollback();
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const ord = orders[0];
        if (ord.status === 'paid') {
            await conn.commit();
            return res.json({ success: true, message: 'Payment verified & subscription activated' });
        }
        await conn.query(
            `UPDATE subscription_payment_orders SET status = 'paid', razorpay_payment_id = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [paymentId, ord.id]
        );
        const plan = getPlanById(ord.plan_id);
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + (plan && plan.duration === 'monthly' ? 1 : 12));
        const expiryStr = expiry.toISOString().slice(0, 10);
        await conn.query(
            `INSERT INTO user_subscriptions (user_id, plan_id, status, expiry_date)
       VALUES (?, ?, 'active', ?)
       ON DUPLICATE KEY UPDATE plan_id = VALUES(plan_id), status = 'active', expiry_date = VALUES(expiry_date), updated_at = CURRENT_TIMESTAMP`,
            [req.user.id, ord.plan_id, expiryStr]
        );
        await conn.commit();
        res.json({ success: true, message: 'Payment verified & subscription activated' });
    } catch (error) {
        await conn.rollback();
        console.error('verifyPayment error:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    } finally {
        conn.release();
    }
};

const getPaymentHistory = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT razorpay_payment_id, razorpay_order_id, amount_paise, verified_at
       FROM subscription_payment_orders WHERE user_id = ? AND status = 'paid' ORDER BY verified_at DESC`,
            [req.user.id]
        );
        const data = rows.map((r) => ({
            paymentId: r.razorpay_payment_id || r.razorpay_order_id,
            amount: Math.round(r.amount_paise / 100),
            status: 'success',
            date: r.verified_at ? r.verified_at.toISOString().slice(0, 10) : null
        }));
        res.json({ success: true, data });
    } catch (error) {
        console.error('getPaymentHistory error:', error);
        res.status(500).json({ success: false, message: 'Failed to load payment history' });
    }
};

module.exports = {
    PLANS,
    getPlanById,
    getPlans,
    getCurrentSubscription,
    createOrder,
    verifyPayment,
    getPaymentHistory
};
