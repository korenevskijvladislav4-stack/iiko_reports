import { Router } from 'express';
import ProductGroupsController from './product-groups.controller.js';
import { verifyAuthToken, requireRole } from '@/middlewares/auth.js';

const productGroups = Router();
const controller = new ProductGroupsController();

productGroups.get('/', verifyAuthToken, controller.list);
productGroups.post('/sync', verifyAuthToken, requireRole(['owner', 'admin']), controller.sync);
productGroups.delete('/', verifyAuthToken, requireRole(['owner', 'admin']), controller.delete);

export default productGroups;
