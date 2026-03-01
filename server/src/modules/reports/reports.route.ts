import { Router } from 'express';
import ReportsController from './reports.controller.js';
import { verifyAuthToken } from '@/middlewares/auth.js';

const reports = Router();
const controller = new ReportsController();

reports.post('/olap', verifyAuthToken, controller.olap);

export default reports;
