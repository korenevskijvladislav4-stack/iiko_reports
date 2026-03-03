import { Router } from 'express';
import ProductsController from './products.controller.js';
import { verifyAuthToken, requireRole } from '@/middlewares/auth.js';

const products = Router();
const controller = new ProductsController();

products.get('/', verifyAuthToken, controller.list);
products.post('/sync', verifyAuthToken, requireRole(['owner', 'admin']), controller.sync);
products.delete('/', verifyAuthToken, requireRole(['owner', 'admin']), controller.delete);

export default products;

