import { Router } from 'express';
import DepartmentsController from './departments.controller.js';
import { verifyAuthToken, requireManagerOrAdmin } from '@/middlewares/auth.js';

const departments = Router();
const controller = new DepartmentsController();

departments.get('/', verifyAuthToken, controller.list);
departments.post('/', verifyAuthToken, requireManagerOrAdmin, controller.create);
departments.put('/:id', verifyAuthToken, requireManagerOrAdmin, controller.update);
departments.delete('/:id', verifyAuthToken, requireManagerOrAdmin, controller.delete);

export default departments;
