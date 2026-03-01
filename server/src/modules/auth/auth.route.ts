import { Router } from 'express';
import AuthController from './auth.controller.js';

const auth = Router();
const controller = new AuthController();

auth.post('/register', controller.register);
auth.post('/login', controller.login);
auth.post('/token', controller.iikoToken);

export default auth;
