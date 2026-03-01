import { Router } from 'express';
import ProductCostController from './product-cost.controller.js';
import { verifyAuthToken } from '@/middlewares/auth.js';

const productCost = Router();
const controller = new ProductCostController();

productCost.get('/', verifyAuthToken, controller.getReport);
productCost.post('/', verifyAuthToken, controller.getReport);

export default productCost;
