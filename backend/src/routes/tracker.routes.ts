import { Router } from 'express';
import { trackerController } from '../controllers/tracker.controller.js';

const router = Router();

router.get('/status', (req, res) => trackerController.getStatus(req, res));
router.get('/devices', (req, res) => trackerController.getDevices(req, res));
router.patch('/devices/:id/alias', (req, res) => trackerController.updateAlias(req, res));
router.get('/logs', (req, res) => trackerController.getLogs(req, res));
router.post('/sync', (req, res) => trackerController.triggerSync(req, res));

export default router;
