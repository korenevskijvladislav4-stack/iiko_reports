import { Router } from 'express';
import DepartmentSalaryController from './department-salary.controller.js';
import { verifyAuthToken } from '@/middlewares/auth.js';

const departmentSalary = Router();
const controller = new DepartmentSalaryController();

departmentSalary.get('/', verifyAuthToken, controller.getReport);

export default departmentSalary;

