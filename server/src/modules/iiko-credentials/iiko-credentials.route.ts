import { Router } from 'express';
import IikoCredentialsController from './iiko-credentials.controller.js';
import { verifyAuthToken, requireRole } from '@/middlewares/auth.js';

const iikoCredentials = Router();
const controller = new IikoCredentialsController();

iikoCredentials.get('/', verifyAuthToken, controller.get);
iikoCredentials.put('/', verifyAuthToken, requireRole(['owner']), controller.put);

export default iikoCredentials;
