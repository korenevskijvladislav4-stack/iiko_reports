import { Router } from 'express';
import PointsController from './points.controller.js';
import { verifyAuthToken, requireRole } from '@/middlewares/auth.js';

const points = Router();
const controller = new PointsController();

points.get('/', verifyAuthToken, controller.listPoints);
points.post('/sync', verifyAuthToken, requireRole(['owner', 'admin']), controller.syncPoints);
points.delete('/', verifyAuthToken, requireRole(['owner', 'admin']), controller.deletePoint);
points.get('/links', verifyAuthToken, controller.listPointDepartmentLinks);
points.put('/links', verifyAuthToken, requireRole(['owner', 'admin']), controller.setPointDepartment);
points.delete('/links', verifyAuthToken, requireRole(['owner', 'admin']), controller.unsetPointDepartment);

export default points;
