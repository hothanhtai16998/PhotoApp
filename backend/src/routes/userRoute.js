import express from 'express';
import { authMe, updateUser, deleteUser} from '../controllers/userController.js';

const router = express.Router();

router.get('/me', authMe)

router.put('/me', updateUser)

router.delete('/me', deleteUser)

export default router;