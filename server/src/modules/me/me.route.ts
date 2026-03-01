import { Router } from 'express';
import MeController from './me.controller.js';
import { verifyAuthToken } from '@/middlewares/auth.js';

const me = Router();
const controller = new MeController();

me.get('/', verifyAuthToken, controller.get);

export default me;
