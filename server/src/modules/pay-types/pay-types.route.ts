import { Router } from 'express';
import PayTypesController from './pay-types.controller.js';
import { verifyAuthToken, requireRole } from '@/middlewares/auth.js';

const payTypes = Router();
const controller = new PayTypesController();

payTypes.get('/', verifyAuthToken, controller.list);
payTypes.post('/sync', verifyAuthToken, requireRole(['owner', 'admin']), controller.sync);
payTypes.delete('/', verifyAuthToken, requireRole(['owner', 'admin']), controller.delete);

export default payTypes;
