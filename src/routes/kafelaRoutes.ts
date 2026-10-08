import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { kafelaLiveRateLimiter } from '../middleware/rateLimit.js';
import * as kafela from '../controllers/kafelaController.js';

const router = Router();

router.use(authMiddleware);

// Phase 1 — roster
router.post('/', kafela.create);
router.post('/join', kafela.join);
router.get('/mine', kafela.getMine);

router.get('/:kafelaId/snapshot', kafelaLiveRateLimiter, kafela.getSnapshot);
router.get('/:kafelaId/events', kafelaLiveRateLimiter, kafela.streamEvents);

router.post('/:kafelaId/leave', kafela.leave);
router.post('/:kafelaId/rotate-code', kafela.rotateCode);
router.get('/:kafelaId/members', kafela.listMembers);
router.patch('/:kafelaId/members/:memberId/role', kafela.updateMemberRole);
router.delete('/:kafelaId/members/:memberId', kafela.removeMember);
router.patch('/:kafelaId/me', kafela.updateMe);

// Phase 2 — groups
router.get('/:kafelaId/groups', kafela.listGroups);
router.post('/:kafelaId/groups', kafela.createGroup);
router.patch('/:kafelaId/groups/:groupId', kafela.updateGroup);
router.delete('/:kafelaId/groups/:groupId', kafela.deleteGroup);
router.post('/:kafelaId/assign', kafela.assignMembers);

// Phase 3 — location
router.put('/:kafelaId/me/location', kafela.upsertLocation);
router.get('/:kafelaId/locations', kafela.listLocations);

// Phase 4 — broadcasts
router.get('/:kafelaId/broadcasts', kafela.listBroadcasts);
router.post('/:kafelaId/broadcasts', kafela.createBroadcast);
router.post('/:kafelaId/broadcasts/:broadcastId/ack', kafela.ackBroadcast);
router.get('/:kafelaId/broadcasts/:broadcastId/acks', kafela.broadcastAcks);

// Phase 5 — SOS + roll call
router.get('/:kafelaId/sos', kafela.listSos);
router.post('/:kafelaId/sos', kafela.createSos);
router.post('/:kafelaId/sos/:sosId/resolve', kafela.resolveSos);

router.get('/:kafelaId/roll-calls', kafela.listRollCalls);
router.post('/:kafelaId/roll-calls', kafela.createRollCall);
router.get('/:kafelaId/roll-calls/:rollCallId', kafela.rollCallStatus);
router.post('/:kafelaId/roll-calls/:rollCallId/respond', kafela.respondRollCall);
router.post('/:kafelaId/roll-calls/:rollCallId/close', kafela.closeRollCall);

export default router;
