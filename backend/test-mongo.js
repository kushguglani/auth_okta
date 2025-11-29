const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Testing MongoDB Connection...\n');
console.log('Connection String:', process.env.MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ SUCCESS! MongoDB connected successfully!');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    process.exit(0);
  })
  .catch((error) => {
    console.log('❌ FAILED! MongoDB connection error:');
    console.log('Error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n💡 Authentication Failed - Possible Issues:');
      console.log('1. Wrong username or password');
      console.log('2. Special characters in password not URL-encoded');
      console.log('3. Database user not created in MongoDB Atlas');
      console.log('4. Wrong database permissions');
      console.log('\n🔧 Next Steps:');
      console.log('1. Check your MongoDB Atlas Database Access');
      console.log('2. Verify username: kushguglani5_db_user');
      console.log('3. Verify password is correct');
      console.log('4. Make sure user has read/write permissions');
    }
    
    process.exit(1);
  });

