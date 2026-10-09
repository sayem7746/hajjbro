import { Request, Response, NextFunction } from 'express';
import type { BroadcastPriority, KafelaMemberRole } from '@prisma/client';
import * as kafelaService from '../services/kafelaService.js';
import { subscribeKafela } from '../services/kafelaLive.js';
import { AppError } from '../middleware/errorHandler.js';

function requireUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId) throw new AppError(401, 'Authentication required');
  return userId;
}

function kafelaIdParam(req: Request): string {
  const id = req.params.kafelaId || req.params.id;
  if (!id) throw new AppError(400, 'Kafela ID is required');
  return id;
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.createKafela(requireUserId(req), req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function join(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.joinKafela(requireUserId(req), req.body ?? {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.getMyKafela(requireUserId(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function getSnapshot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.getKafelaSnapshot(requireUserId(req), kafelaIdParam(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function streamEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = requireUserId(req);
    const kafelaId = kafelaIdParam(req);
    await kafelaService.requireActiveMember(userId, kafelaId);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const send = (payload: Record<string, string>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    send({ type: 'connected' });

    const unsubscribe = subscribeKafela(kafelaId, () => {
      send({ type: 'changed' });
    });

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 20_000);

    const cleanup = () => {
      clearInterval(heartbeat);
      unsubscribe();
    };

    req.on('close', cleanup);
    res.on('close', cleanup);
  } catch (e) {
    next(e);
  }
}

export async function leave(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.leaveKafela(requireUserId(req), kafelaIdParam(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function rotateCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.rotateJoinCode(requireUserId(req), kafelaIdParam(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const data = await kafelaService.listMembers(requireUserId(req), kafelaIdParam(req), q);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function updateMemberRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const role = req.body?.role as KafelaMemberRole;
    const data = await kafelaService.updateMemberRole(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.memberId,
      role
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.removeMember(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.memberId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.updateMyProfile(
      requireUserId(req),
      kafelaIdParam(req),
      req.body ?? {}
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.listGroups(requireUserId(req), kafelaIdParam(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.createGroup(
      requireUserId(req),
      kafelaIdParam(req),
      req.body ?? {}
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function updateGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.updateGroup(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.groupId,
      req.body ?? {}
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function deleteGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.deleteGroup(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.groupId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function assignMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { memberIds, groupId } = req.body ?? {};
    const data = await kafelaService.assignMembersToGroup(
      requireUserId(req),
      kafelaIdParam(req),
      groupId ?? null,
      memberIds
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function upsertLocation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await kafelaService.upsertMyLocation(
      requireUserId(req),
      kafelaIdParam(req),
      req.body ?? {}
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listLocations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await kafelaService.getVisibleLocations(
      requireUserId(req),
      kafelaIdParam(req)
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function createBroadcast(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body ?? {};
    const data = await kafelaService.createBroadcast(requireUserId(req), kafelaIdParam(req), {
      title: body.title,
      body: body.body,
      groupId: body.groupId,
      priority: body.priority as BroadcastPriority | undefined,
      rallyLat: body.rallyLat,
      rallyLng: body.rallyLng,
    });
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listBroadcasts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await kafelaService.listBroadcasts(requireUserId(req), kafelaIdParam(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function ackBroadcast(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await kafelaService.ackBroadcast(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.broadcastId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function updateBroadcast(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body ?? {};
    const data = await kafelaService.updateBroadcast(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.broadcastId,
      {
        title: body.title,
        body: body.body,
        priority: body.priority as BroadcastPriority | undefined,
      }
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function deleteBroadcast(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await kafelaService.deleteBroadcast(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.broadcastId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function deleteAllBroadcasts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await kafelaService.deleteAllBroadcasts(requireUserId(req), kafelaIdParam(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function broadcastAcks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await kafelaService.getBroadcastAckStatus(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.broadcastId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function createSos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.createSos(
      requireUserId(req),
      kafelaIdParam(req),
      req.body ?? {}
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listSos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const openOnly = req.query.open !== 'false';
    const data = await kafelaService.listSos(
      requireUserId(req),
      kafelaIdParam(req),
      openOnly
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function resolveSos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kafelaService.resolveSos(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.sosId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function createRollCall(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await kafelaService.createRollCall(
      requireUserId(req),
      kafelaIdParam(req),
      req.body ?? {}
    );
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function listRollCalls(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await kafelaService.listRollCalls(requireUserId(req), kafelaIdParam(req));
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function respondRollCall(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const present = req.body?.present !== false;
    const data = await kafelaService.respondRollCall(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.rollCallId,
      present
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function rollCallStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await kafelaService.getRollCallStatus(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.rollCallId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function closeRollCall(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = await kafelaService.closeRollCall(
      requireUserId(req),
      kafelaIdParam(req),
      req.params.rollCallId
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}
