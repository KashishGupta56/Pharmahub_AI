const express = require('express');
const router = express.Router();
const Medicine = require('../models/medicineModel'); // Apne medicine model ka path check kar lena

// GET: Expiring soon medicines (Next 30 days)
router.get('/expiring-soon', async (req, res) => {
    try {
        const today = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);

        // Find medicines whose expiryDate is between today and next 30 days
        const expiringMeds = await Medicine.find({
            expiryDate: {
                $gte: today,
                $lte: thirtyDaysLater
            }
        }).sort({ expiryDate: 1 }); // Jo pehle expire hogi wo pehle dikhegi

        res.status(200).json({
            success: true,
            count: expiringMeds.length,
            data: expiringMeds
        });
    } catch (error) {
        console.error("Error fetching expiring medicines:", error);
        res.status(500).json({
            success: false,
            message: "Server Error while fetching expiry data"
        });
    }
});

module.exports = router;