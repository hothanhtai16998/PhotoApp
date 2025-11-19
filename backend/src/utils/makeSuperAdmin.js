import mongoose from 'mongoose';
import { env } from '../libs/env.js';
import User from '../models/User.js';
import { CONNECT_DB } from '../configs/db.js';
import { logger } from './logger.js';
import 'dotenv/config';

/**
 * Script to make a user a super admin
 * Usage: node src/utils/makeSuperAdmin.js <username>
 * 
 * Example:
 * node src/utils/makeSuperAdmin.js adminuser
 */

const makeSuperAdmin = async (username) => {
    try {
        if (!username) {
            logger.error('❌ Username is required');
            logger.info('Usage: node src/utils/makeSuperAdmin.js <username>');
            process.exit(1);
        }

        await CONNECT_DB();
        logger.info(`🌱 Making user "${username}" a super admin...`);

        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) {
            logger.error(`❌ User "${username}" not found`);
            await mongoose.connection.close();
            process.exit(1);
        }

        if (user.isSuperAdmin) {
            logger.info(`✅ User "${username}" is already a super admin`);
            await mongoose.connection.close();
            process.exit(0);
        }

        user.isSuperAdmin = true;
        user.isAdmin = true; // Also set as admin for backward compatibility
        await user.save();

        logger.info(`✅ User "${username}" is now a super admin!`);
        logger.info(`   Email: ${user.email}`);
        logger.info(`   Display Name: ${user.displayName}`);
        logger.info(`   Super Admin: Can delegate admin roles and has all permissions`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        logger.error('❌ Error making user super admin:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Get username from command line arguments
const username = process.argv[2];
makeSuperAdmin(username);

