import { Router } from 'express';
import * as locationController from '../controllers/locationController.js';

const router = Router();

// Public: find locations near a point (Haversine)
router.get('/nearby', locationController.getNearby);

// Public: list all locations
router.get('/', locationController.list);

// Public: get by slug (before :id so "slug" is not captured as id)
router.get('/slug/:slug', locationController.getBySlug);
router.get('/:id', locationController.getById);

export default router;
