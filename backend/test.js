require('dotenv').config();

console.log('Testing .env file...');
console.log('MONGODB_URI exists?', !!process.env.MONGODB_URI);
console.log('MONGODB_URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 'undefined');
console.log('PORT:', process.env.PORT);