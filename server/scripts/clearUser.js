const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: __dirname + '/../.env' }); // load from server dir

const clearUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        const emailToDelete = 'noelmarioroche@gmail.com';

        const result = await User.deleteOne({ email: emailToDelete });

        if (result.deletedCount > 0) {
            console.log(`Successfully deleted user with email: ${emailToDelete}`);
        } else {
            console.log(`User with email ${emailToDelete} not found.`);
        }

    } catch (error) {
        console.error('Error clearing user:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
        process.exit(0);
    }
};

clearUser();
