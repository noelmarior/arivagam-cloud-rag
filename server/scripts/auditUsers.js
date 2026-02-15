const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const User = require('../models/User');

// 1. Connection: Load .env and connect
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
        runAudit();
    } catch (err) {
        console.error('❌ DB Connection Error:', err);
        process.exit(1);
    }
};

const runAudit = async () => {
    try {
        // 2. Query: Fetch all users
        const users = await User.find({});

        if (users.length === 0) {
            console.log('No users found.');
            mongoose.connection.close();
            return;
        }

        // 3. Logic Check: Check for duplicate IDs across different emails
        const idMap = new Map();
        let duplicateFound = false;

        users.forEach(user => {
            const idStr = user._id.toString();
            if (idMap.has(idStr)) {
                const existingEmail = idMap.get(idStr);
                if (existingEmail !== user.email) {
                    console.warn(`⚠️ WARNING: Duplicate ID ${idStr} found for emails: ${existingEmail} and ${user.email}`);
                    duplicateFound = true;
                }
            } else {
                idMap.set(idStr, user.email);
            }
        });

        if (!duplicateFound) {
            console.log('✅ No duplicate IDs found across different emails.');
        }

        // 4. Output: Console table
        const tableData = users.map(u => ({
            _id: u._id.toString(),
            name: u.name,
            email: u.email,
            createdAt: u.createdAt ? u.createdAt.toISOString() : 'N/A'
        }));

        console.table(tableData);

    } catch (err) {
        console.error('❌ Audit Error:', err);
    } finally {
        // 5. Clean Exit
        mongoose.connection.close();
        console.log('Connection closed.');
    }
};

connectDB();
