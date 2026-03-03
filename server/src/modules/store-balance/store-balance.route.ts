import { Router } from 'express';
import StoreBalanceController from './store-balance.controller.js';
import { verifyAuthToken } from '@/middlewares/auth.js';

const storeBalance = Router();
const controller = new StoreBalanceController();

storeBalance.get('/', verifyAuthToken, controller.getReport);

export default storeBalance;

