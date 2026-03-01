import { Router } from 'express';
import DeliveryFlagsController from './delivery-flags.controller.js';
import { verifyAuthToken, requireRole } from '@/middlewares/auth.js';

const deliveryFlags = Router();
const controller = new DeliveryFlagsController();

deliveryFlags.get('/', verifyAuthToken, controller.list);
deliveryFlags.post('/sync', verifyAuthToken, requireRole(['owner', 'admin']), controller.sync);
deliveryFlags.delete('/', verifyAuthToken, requireRole(['owner', 'admin']), controller.delete);

export default deliveryFlags;
