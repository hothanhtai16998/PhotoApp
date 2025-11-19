import mongoose from 'mongoose';
import { env } from '../libs/env.js';
import User from '../models/User.js';
import { CONNECT_DB } from '../configs/db.js';
import { logger } from './logger.js';
import 'dotenv/config';

/**
 * Script to make a user an admin
 * Usage: node src/utils/makeAdmin.js <username>
 * 
 * Example:
 * node src/utils/makeAdmin.js adminuser
 */

const makeAdmin = async (username) => {
    try {
        if (!username) {
            logger.error('❌ Username is required');
            logger.info('Usage: node src/utils/makeAdmin.js <username>');
            process.exit(1);
        }

        await CONNECT_DB();
        logger.info(`🌱 Making user "${username}" an admin...`);

        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) {
            logger.error(`❌ User "${username}" not found`);
            await mongoose.connection.close();
            process.exit(1);
        }

        if (user.isAdmin) {
            logger.info(`✅ User "${username}" is already an admin`);
            await mongoose.connection.close();
            process.exit(0);
        }

        user.isAdmin = true;
        await user.save();

        logger.info(`✅ User "${username}" is now an admin!`);
        logger.info(`   Email: ${user.email}`);
        logger.info(`   Display Name: ${user.displayName}`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        logger.error('❌ Error making user admin:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Get username from command line arguments
const username = process.argv[2];
makeAdmin(username);

