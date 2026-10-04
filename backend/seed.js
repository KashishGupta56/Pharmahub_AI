const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Database connected for seeding..."))
    .catch(err => console.log("Connection Error: ", err));

// Ek flexible schema taki bina structure tode data chala jaye
const medicineSchema = new mongoose.Schema({
    name: String,
    batchNumber: String,
    stock: Number,
    expiryDate: Date,
    price: Number,
    category: String
}, { strict: false });

// Nayi collection banayega 'medicines' naam se
const Medicine = mongoose.models.Medicine || mongoose.model('Medicine', medicineSchema);

const seedDB = async () => {
    try {
        await Medicine.deleteMany({}); // Purana kachra saaf karega
        
        const dummyData = [];
        const categories = ['Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment'];
        
        for (let i = 1; i <= 500; i++) {
            // Random dates generate karega: kuch pichle mahine ki, kuch agle 2 saal ki
            const randomDays = Math.floor(Math.random() * 800) - 30; 
            const expDate = new Date();
            expDate.setDate(expDate.getDate() + randomDays);

            dummyData.push({
                name: `PharmaX_${i}`,
                batchNumber: `BATCH-${1000 + i}`,
                stock: Math.floor(Math.random() * 300) + 5, // 5 se 305 ke beech stock
                expiryDate: expDate,
                price: Math.floor(Math.random() * 450) + 10,
                category: categories[Math.floor(Math.random() * categories.length)]
            });
        }

        await Medicine.insertMany(dummyData);
        console.log("✅ 500 Medicines Data Successfully Inserted!");
        process.exit();
    } catch (error) {
        console.log("Error inserting data: ", error);
        process.exit(1);
    }
};

seedDB();