import { Router } from 'express';
import auth from './auth/auth.route.js';
import me from './me/me.route.js';
import iikoCredentials from './iiko-credentials/iiko-credentials.route.js';
import reports from './reports/reports.route.js';
import productCost from './product-cost/product-cost.route.js';
import settings from './settings/settings.route.js';
import payTypes from './pay-types/pay-types.route.js';
import deliveryFlags from './delivery-flags/delivery-flags.route.js';
import productGroups from './product-groups/product-groups.route.js';
import points from './points/points.route.js';
import departments from './departments/departments.route.js';
import positions from './positions/positions.route.js';
import users from './users/users.route.js';
import schedules from './schedules/schedules.route.js';

const router = Router();

router.use('/auth', auth);
router.use('/me', me);
router.use('/iiko-credentials', iikoCredentials);
router.use('/reports', reports);
router.use('/product-cost', productCost);
router.use('/settings', settings);
router.use('/pay-types', payTypes);
router.use('/delivery-flags', deliveryFlags);
router.use('/product-groups', productGroups);
router.use('/points', points);
router.use('/departments', departments);
router.use('/positions', positions);
router.use('/users', users);
router.use('/schedules', schedules);

export default router;
