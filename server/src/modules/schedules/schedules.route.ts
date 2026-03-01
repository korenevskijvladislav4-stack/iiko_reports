import { Router } from 'express';
import SchedulesController from './schedules.controller.js';
import { verifyAuthToken, requireScheduleEdit } from '@/middlewares/auth.js';

const schedules = Router();
const controller = new SchedulesController();

schedules.get('/', verifyAuthToken, controller.list);
schedules.post('/', verifyAuthToken, requireScheduleEdit, controller.create);
schedules.put('/:id', verifyAuthToken, requireScheduleEdit, controller.update);
schedules.delete('/:id', verifyAuthToken, requireScheduleEdit, controller.delete);

export default schedules;
