import express from 'express';
import {signUp, signIn, signOut, refreshToken} from '../controllers/authController.js';

const router = express.Router();

// Route to get all users

//Route for signup
router.post('/signup', signUp)

//Route for signin
router.post('/signin', signIn)

//
router.post('/signout', signOut)

router.post('/refresh', refreshToken)

export default router;