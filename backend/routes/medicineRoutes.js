const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');

// GET all medicines
router.get('/', async (req, res) => {
    try {
        const medicines = await Medicine.find().sort({ createdAt: -1 });
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET single medicine by ID
router.get('/:id', async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }
        res.json(medicine);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST create new medicine
router.post('/', async (req, res) => {
    try {
        const medicine = new Medicine({
            name: req.body.name,
            company: req.body.company,
            price: req.body.price,
            quantity: req.body.quantity,
            expiryDate: req.body.expiryDate
        });
        
        const newMedicine = await medicine.save();
        res.status(201).json(newMedicine);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT update medicine
router.put('/:id', async (req, res) => {
    try {
        const updatedMedicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedMedicine);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE medicine
router.delete('/:id', async (req, res) => {
    try {
        await Medicine.findByIdAndDelete(req.params.id);
        res.json({ message: 'Medicine deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST process bill
router.post('/bill/process', async (req, res) => {
    try {
        const { items } = req.body; // items: [{id, quantity}]
        
        let total = 0;
        const billItems = [];
        const failedItems = [];
        
        for (const item of items) {
            try {
                const medicine = await Medicine.findById(item.id);
                
                if (!medicine) {
                    failedItems.push({
                        id: item.id,
                        reason: 'Medicine not found'
                    });
                    continue;
                }
                
                if (medicine.quantity < item.quantity) {
                    failedItems.push({
                        id: item.id,
                        name: medicine.name,
                        reason: `Insufficient stock. Available: ${medicine.quantity}`
                    });
                    continue;
                }
                
                // Update stock
                medicine.quantity -= item.quantity;
                await medicine.save();
                
                // Add to bill
                const itemTotal = medicine.price * item.quantity;
                total += itemTotal;
                
                billItems.push({
                    id: medicine._id,
                    name: medicine.name,
                    quantity: item.quantity,
                    price: medicine.price,
                    total: itemTotal
                });
                
            } catch (itemError) {
                failedItems.push({
                    id: item.id,
                    reason: itemError.message
                });
            }
        }
        
        res.json({
            success: true,
            message: 'Bill processed successfully',
            billItems,
            failedItems,
            total: total.toFixed(2),
            date: new Date().toISOString(),
            billNumber: 'BILL-' + Date.now()
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

module.exports = router;