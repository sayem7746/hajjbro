import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import * as admin from '../controllers/adminController.js';

const router = Router();

router.use(authMiddleware, requireRole('admin'));

// Analytics
router.get('/analytics', admin.getAnalytics);

// Users
router.get('/users', admin.listUsers);
router.get('/users/:id', admin.getUserById);
router.patch('/users/:id', admin.updateUser);
router.delete('/users/:id', admin.deleteUser);

// Rituals
router.get('/rituals', admin.listRituals);
router.get('/rituals/:id', admin.getRitualById);
router.post('/rituals', admin.createRitual);
router.patch('/rituals/:id', admin.updateRitual);
router.delete('/rituals/:id', admin.deleteRitual);

// Duas
router.get('/duas', admin.listDuas);
router.get('/duas/:id', admin.getDuaById);
router.post('/duas', admin.createDua);
router.patch('/duas/:id', admin.updateDua);
router.delete('/duas/:id', admin.deleteDua);

// Locations
router.get('/locations', admin.listLocations);
router.get('/locations/:id', admin.getLocationById);
router.post('/locations', admin.createLocation);
router.patch('/locations/:id', admin.updateLocation);
router.delete('/locations/:id', admin.deleteLocation);

// Contacts
router.get('/contacts', admin.listContacts);
router.get('/contacts/:id', admin.getContactById);
router.patch('/contacts/:id', admin.updateContact);
router.delete('/contacts/:id', admin.deleteContact);

export default router;
