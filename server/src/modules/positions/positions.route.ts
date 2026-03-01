import { Router } from 'express';
import PositionsController from './positions.controller.js';
import { verifyAuthToken, requireManagerOrAdmin } from '@/middlewares/auth.js';

const positions = Router();
const controller = new PositionsController();

positions.get('/', verifyAuthToken, controller.list);
positions.post('/', verifyAuthToken, requireManagerOrAdmin, controller.create);
positions.put('/:id', verifyAuthToken, requireManagerOrAdmin, controller.update);
positions.delete('/:id', verifyAuthToken, requireManagerOrAdmin, controller.delete);

export default positions;
