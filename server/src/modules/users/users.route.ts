import { Router } from 'express';
import UsersController from './users.controller.js';
import { verifyAuthToken, requireManagerOrAdmin } from '@/middlewares/auth.js';

const users = Router();
const controller = new UsersController();

users.get('/', verifyAuthToken, controller.list);
users.post('/', verifyAuthToken, requireManagerOrAdmin, controller.create);
users.put('/:id', verifyAuthToken, requireManagerOrAdmin, controller.update);
users.delete('/:id', verifyAuthToken, requireManagerOrAdmin, controller.delete);

export default users;
