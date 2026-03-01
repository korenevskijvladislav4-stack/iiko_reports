import { Router } from 'express';
import SettingsController from './settings.controller.js';
import { verifyAuthToken } from '@/middlewares/auth.js';

const settings = Router();
const controller = new SettingsController();

settings.get('/', verifyAuthToken, controller.getFilters);
settings.post('/', verifyAuthToken, controller.setFilters);

export default settings;
