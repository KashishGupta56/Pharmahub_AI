const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

// Load .env explicitly from directory path
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();

// ============ 1. MIDDLEWARE ============
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../frontend')));

// ============ 2. MONGODB CONNECTION ============
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://2433361:24116002405@cluster0.cbhkwju.mongodb.net/ecommerce_AI?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
    .then(() => console.log(`✅ MongoDB Atlas Connected Successfully to: ${mongoose.connection.name}`))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1); 
    });

// ============ 3. SCHEMAS & MODELS ============
const userSchema = new mongoose.Schema({
    fullName: String,
    username: { type: String, unique: true },
    email: { type: String, unique: true },
    password: { type: String },
    role: { type: String, default: 'staff' },
    resetOtp: { type: String },
    otpExpiry: { type: Date }
});
const User = mongoose.model('User', userSchema);

const billSchema = new mongoose.Schema({
    customer: { name: { type: String, default: 'Walk-in Customer' }, phone: { type: String, default: '' } },
    items: [{ name: String, price: Number, quantity: Number, total: Number }],
    subtotal: Number, tax: Number, discount: Number, total: Number,
    date: { type: Date, default: Date.now }, 
    billNumber: String,
    issuedBy: { type: String, default: 'Unknown' }
});
const Bill = mongoose.model('Bill', billSchema);

const medicineSchema = new mongoose.Schema({
    name: { type: String, required: true },
    company: String,
    price: Number,
    stock: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    expiryDate: Date
}, { strict: false });

const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);

// ============ 4. API ROUTES ============

app.get('/', (req, res) => {
    res.status(200).send('<h1>Pharmacy API Live 🚀</h1><p>Health check at: /api/health</p>');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', time: new Date().toISOString() });
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ $or: [{ username }, { email: username }] });
        
        if (user && user.password === password) {
            res.json({ success: true, message: 'Login successful!', token: 'auth-token-' + user._id, user: { id: user._id, username: user.username, fullName: user.fullName, role: user.role } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

app.post('/api/signup', async (req, res) => {
    try {
        const { fullName, username, email, password } = req.body;
        const userCount = await User.countDocuments();
        const assignedRole = (userCount === 0) ? 'admin' : 'staff';
        
        const newUser = new User({ fullName, username, email, password, role: assignedRole });
        await newUser.save();
        res.json({ success: true, message: `User created successfully as ${assignedRole.toUpperCase()}!` });
    } catch (error) { 
        res.status(400).json({ success: false, message: 'User already exists or data invalid' }); 
    }
});

app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email });
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Is email se koi account nahi mila.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = otp;
        user.otpExpiry = Date.now() + 15 * 60 * 1000;
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'PharmaCare - Password Reset OTP',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #4864e4;">PharmaCare Security</h2>
                    <p>Hello <strong>${user.fullName}</strong>,</p>
                    <p>Aapne password reset karne ki request ki hai. Ye raha aapka 6-digit OTP (Ye 15 minute ke liye valid hai):</p>
                    <div style="background: #f4f4f4; padding: 15px; font-size: 28px; text-align: center; letter-spacing: 5px; font-weight: bold; color: #4864e4; border-radius: 5px;">
                        ${otp}
                    </div>
                    <p style="margin-top: 20px;">Agar ye request aapne nahi ki thi, toh is email ko ignore karein.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'OTP aapke email par bhej diya gaya hai!' });
    } catch (error) {
        console.error('OTP sending error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP.' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email: email, resetOtp: otp, otpExpiry: { $gt: Date.now() } });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid ya Expired OTP!' });
        }

        user.password = newPassword;
        user.resetOtp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.json({ success: true, message: 'Aapka password successfully badal diya gaya hai! Ab login karein.' });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ success: false, message: 'Server error while resetting password.' });
    }
});

app.get('/api/bills', async (req, res) => {
    try { 
        const { username, role } = req.query;
        let filter = {};
        if (role !== 'admin' && username) {
            filter.issuedBy = username;
        }
        const bills = await Bill.find(filter).sort({ date: -1 }); 
        res.json(bills); 
    } catch (error) { 
        res.status(500).json({ success: false, message: 'Failed to fetch bills' }); 
    }
});

app.post('/api/bills', async (req, res) => {
    try { 
        const newBill = new Bill(req.body); 
        await newBill.save(); 
        res.status(201).json({ success: true, bill: newBill }); 
    } catch (error) { 
        res.status(500).json({ success: false, message: 'Failed to save bill' }); 
    }
});

// ============ EXTERNAL EXPIRY ROUTES MOUNTED HERE ============
try {
    const expiryRoutes = require('./routes/expiryRoutes');
    app.use('/api/medicines', expiryRoutes);
} catch (e) {
    console.warn("⚠️ expiryRoutes module not found or failed to load, using inline fallback.");
    app.get('/api/medicines/expiring-soon', async (req, res) => {
        try {
            const today = new Date();
            const thirtyDaysLater = new Date();
            thirtyDaysLater.setDate(today.getDate() + 30);

            const expiringMedicines = await Medicine.find({
                expiryDate: { $gte: today, $lte: thirtyDaysLater }
            }).sort({ expiryDate: 1 });

            res.status(200).json({
                success: true,
                count: expiringMedicines.length,
                data: expiringMedicines
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
}

app.get('/api/medicines', async (req, res) => { 
    try {
        const meds = await Medicine.find({});
        res.status(200).json(meds); 
    } catch (err) {
        console.error("Fetch medicines error:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch medicines' }); 
    }
});

app.post('/api/medicines', async (req, res) => {
    try {
        const newMed = new Medicine(req.body);
        await newMed.save();
        res.status(201).json({ success: true, message: 'Medicine added successfully', data: newMed });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Failed to add medicine' });
    }
});

app.put('/api/medicines/:id', async (req, res) => {
    try {
        const updated = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Update failed' });
    }
});

app.delete('/api/medicines/:id', async (req, res) => {
    try {
        await Medicine.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Delete failed' });
    }
});

// ============ PHASE 1: SMART INVENTORY ENGINE ============
app.get('/api/ai/smart-inventory', async (req, res) => {
    try {
        const medicines = await Medicine.find({});
        const bills = await Bill.find({});

        // Pichle 30 dino ka sales data aggregate karein
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const salesCountMap = {};
        bills.forEach(bill => {
            const billDate = new Date(bill.date);
            if (billDate >= thirtyDaysAgo && bill.items) {
                bill.items.forEach(item => {
                    const key = item.name.toLowerCase().trim();
                    salesCountMap[key] = (salesCountMap[key] || 0) + (parseInt(item.quantity) || 0);
                });
            }
        });

        const inventoryReport = medicines.map(med => {
            const nameKey = med.name.toLowerCase().trim();
            const totalSold30d = salesCountMap[nameKey] || 0;
            const currentStock = parseInt(med.stock !== undefined ? med.stock : (med.quantity || 0)) || 0;
            
            // Daily Sales Velocity
            const dailyVelocity = totalSold30d > 0 ? (totalSold30d / 30) : 0;

            // Days left before run-out
            let daysUntilStockout = 999;
            if (dailyVelocity > 0) {
                daysUntilStockout = Math.floor(currentStock / dailyVelocity);
            }

            // Inventory Health Categorization
            let healthStatus = 'Healthy';
            let badgeColor = '#28a745';

            if (currentStock === 0) {
                healthStatus = 'Out of Stock';
                badgeColor = '#dc3545';
            } else if (daysUntilStockout <= 5) {
                healthStatus = 'Critical Fast-Depleting';
                badgeColor = '#e67e22';
            } else if (dailyVelocity === 0 && currentStock > 0) {
                healthStatus = 'Dead Stock (Zero Sales)';
                badgeColor = '#6c757d';
            }

            return {
                id: med._id,
                name: med.name,
                stock: currentStock,
                price: med.price,
                totalSold30d,
                dailyVelocity: Number(dailyVelocity.toFixed(2)),
                daysUntilStockout,
                healthStatus,
                badgeColor
            };
        });

        res.status(200).json({ success: true, data: inventoryReport });
    } catch (err) {
        console.error("Phase 1 Error:", err);
        res.status(500).json({ success: false, message: "Inventory Engine Failed" });
    }
});

// ============ PHASE 2: AI SMART REORDER ENGINE ============
app.get('/api/ai/reorder-recommendations', async (req, res) => {
    try {
        const medicines = await Medicine.find({});
        const bills = await Bill.find({});

        // 30 dino ka sales map
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const salesMap = {};
        bills.forEach(bill => {
            const bDate = new Date(bill.date);
            if (bDate >= thirtyDaysAgo && bill.items) {
                bill.items.forEach(item => {
                    const k = item.name.toLowerCase().trim();
                    salesMap[k] = (salesMap[k] || 0) + (parseInt(item.quantity) || 0);
                });
            }
        });

        const supplierLeadTimeDays = 3; // Supplier delivery window (3 days)
        const targetCoverageDays = 15;   // 15 days coverage target

        const reorderList = [];

        medicines.forEach(med => {
            const k = med.name.toLowerCase().trim();
            const unitsSold = salesMap[k] || 0;
            const currentStock = parseInt(med.stock !== undefined ? med.stock : (med.quantity || 0)) || 0;
            
            // Daily Consumption Rate (Velocity)
            const dailyVelocity = unitsSold > 0 ? (unitsSold / 30) : 0.2;

            // Reorder Point Formula: (Lead Time * Velocity) + Safety Buffer (5 units)
            const safetyBuffer = 5;
            const reorderPoint = Math.ceil((dailyVelocity * supplierLeadTimeDays) + safetyBuffer);

            // Check if stock is at or below threshold
            if (currentStock <= reorderPoint || currentStock <= 5) {
                const idealStock = Math.ceil(dailyVelocity * targetCoverageDays) + safetyBuffer;
                const recommendedUnits = Math.max(10, idealStock - currentStock);

                reorderList.push({
                    id: med._id,
                    name: med.name,
                    company: med.company || 'Generic',
                    currentStock: currentStock,
                    reorderPoint: reorderPoint,
                    recommendedUnits: recommendedUnits,
                    urgency: currentStock === 0 ? 'CRITICAL' : 'HIGH'
                });
            }
        });

        res.status(200).json({ success: true, count: reorderList.length, data: reorderList });
    } catch (err) {
        console.error("Phase 2 Error:", err);
        res.status(500).json({ success: false, message: "Reorder Engine Failed" });
    }
});

// ============ PHASE 3: MEDICINE EXPIRY FINANCIAL RISK ENGINE ============
app.get('/api/ai/expiry-risk', async (req, res) => {
    try {
        const medicines = await Medicine.find({});
        const bills = await Bill.find({});

        // Pichle 30 dino ki sales velocity map
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const salesMap = {};
        bills.forEach(bill => {
            const bDate = new Date(bill.date);
            if (bDate >= thirtyDaysAgo && bill.items) {
                bill.items.forEach(item => {
                    const k = item.name.toLowerCase().trim();
                    salesMap[k] = (salesMap[k] || 0) + (parseInt(item.quantity) || 0);
                });
            }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const riskReport = [];

        medicines.forEach(med => {
            const currentStock = parseInt(med.stock !== undefined ? med.stock : (med.quantity || 0)) || 0;
            const price = parseFloat(med.price) || 0;

            if (med.expiryDate && currentStock > 0) {
                const expDate = new Date(med.expiryDate);
                expDate.setHours(0, 0, 0, 0);

                const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

                // Agle 90 dino ke andar expire hone wali ya expired dawaiyan
                if (diffDays <= 90) {
                    const k = med.name.toLowerCase().trim();
                    const unitsSold = salesMap[k] || 0;
                    const dailyVelocity = unitsSold > 0 ? (unitsSold / 30) : 0.05;

                    let unitsAtRisk = 0;
                    let riskScore = 0;
                    let status = "LOW_RISK";

                    if (diffDays <= 0) {
                        unitsAtRisk = currentStock;
                        riskScore = 100;
                        status = "EXPIRED";
                    } else {
                        const expectedUnitsSold = Math.floor(diffDays * dailyVelocity);
                        unitsAtRisk = Math.max(0, currentStock - expectedUnitsSold);
                        riskScore = Math.min(100, Math.round((unitsAtRisk / currentStock) * 100));
                        
                        if (riskScore >= 70) status = "CRITICAL_LOSS_RISK";
                        else if (riskScore >= 40) status = "MODERATE_RISK";
                    }

                    const potentialFinancialLoss = Number((unitsAtRisk * price).toFixed(2));

                    riskReport.push({
                        id: med._id,
                        name: med.name,
                        company: med.company || 'Generic',
                        currentStock,
                        price,
                        daysToExpiry: diffDays,
                        unitsAtRisk,
                        potentialFinancialLoss,
                        riskScore,
                        status
                    });
                }
            }
        });

        // Highest risk items ko pehle sort karein
        riskReport.sort((a, b) => b.riskScore - a.riskScore);

        res.status(200).json({ success: true, count: riskReport.length, data: riskReport });
    } catch (err) {
        console.error("Phase 3 Error:", err);
        res.status(500).json({ success: false, message: "Expiry Risk Engine Failed" });
    }
});

// ============ PHASE 4: PYTHON ML DEMAND FORECASTING BRIDGE ============
app.get('/api/ai/ml-forecast', async (req, res) => {
    try {
        const medicines = await Medicine.find({});
        const bills = await Bill.find({});

        const flatSales = [];
        bills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    flatSales.push({
                        name: item.name,
                        quantity: parseInt(item.quantity) || 1,
                        date: bill.date ? new Date(bill.date).toISOString() : new Date().toISOString()
                    });
                });
            }
        });

        const formattedMeds = medicines.map(m => ({
            id: m._id.toString(),
            name: m.name,
            company: m.company || 'Generic',
            price: parseFloat(m.price) || 0,
            stock: parseInt(m.stock !== undefined ? m.stock : (m.quantity || 0)) || 0
        }));

        // Send payload to FastAPI Python Engine (Port 8000)
        const response = await fetch('http://127.0.0.1:8000/predict-demand', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sales: flatSales, medicines: formattedMeds })
        });

        if (!response.ok) {
            throw new Error(`Python service responded with status ${response.status}`);
        }

        const mlData = await response.json();
        res.status(200).json(mlData);
    } catch (err) {
        console.error("Python ML Bridge Error:", err.message);
        res.status(503).json({ 
            success: false, 
            message: "Python ML service is offline. Start it on port 8000." 
        });
    }
});

// ============ PHASE 5: PYTHON NLP CHATBOT BRIDGE ============
app.post('/api/ai/nlp-chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ reply: "Please provide a query message." });

        const medicines = await Medicine.find({});
        const formattedMeds = medicines.map(m => ({
            id: m._id.toString(),
            name: m.name,
            company: m.company || 'Generic',
            price: parseFloat(m.price) || 0,
            stock: parseInt(m.stock !== undefined ? m.stock : (m.quantity || 0)) || 0
        }));

        // Call FastAPI Python NLP endpoint
        const response = await fetch('http://127.0.0.1:8000/nlp-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, medicines: formattedMeds })
        });

        if (!response.ok) {
            throw new Error(`Python NLP service responded with status ${response.status}`);
        }

        const result = await response.json();
        res.status(200).json(result);
    } catch (err) {
        console.error("NLP Bridge Error:", err.message);
        res.status(503).json({ 
            reply: "AI NLP Assistant engine is offline. Ensure Python service is running on port 8000." 
        });
    }
});

app.use((req, res) => { res.status(404).json({ success: false, message: 'Route not found' }); });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { console.log(`\n🚀 Server is blasting off on port ${PORT}`); });