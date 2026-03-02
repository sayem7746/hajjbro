import { Request, Response, NextFunction } from 'express';
import * as ritualService from '../services/ritualService.js';
import { AppError } from '../middleware/errorHandler.js';
import type { PublicRitualWithDuas } from '../services/ritualService.js';

// ─── Admin CRUD ─────────────────────────────────────────────────────────────

export async function listAdmin(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rituals = await ritualService.listRitualsAdmin();
    res.json({ success: true, data: rituals });
  } catch (e) {
    next(e);
  }
}

export async function getByIdAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const ritual = await ritualService.getRitualById(id);
    if (!ritual) {
      throw new AppError(404, 'Ritual not found');
    }
    res.json({ success: true, data: ritual });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as ritualService.RitualCreateInput;
    if (!body.slug || !body.nameEn) {
      throw new AppError(400, 'slug and nameEn are required');
    }
    const ritual = await ritualService.createRitual(body);
    res.status(201).json({ success: true, data: ritual });
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as ritualService.RitualUpdateInput;
    const ritual = await ritualService.updateRitual(id, body);
    res.json({ success: true, data: ritual });
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await ritualService.deleteRitual(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orderedIds } = req.body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new AppError(400, 'orderedIds array is required');
    }
    const rituals = await ritualService.reorderRituals(orderedIds);
    res.json({ success: true, data: rituals });
  } catch (e) {
    next(e);
  }
}

// ─── Public API (paginated, language filter) ─────────────────────────────────

function applyLanguageFilter<T extends PublicRitualWithDuas>(
  items: T[],
  lang: 'en' | 'ar' | undefined
): Array<Record<string, unknown>> {
  return items.map((ritual) => {
    const name = lang === 'ar' ? ritual.nameAr ?? ritual.nameEn : ritual.nameEn;
    const ritualOut: Record<string, unknown> = {
      id: ritual.id,
      slug: ritual.slug,
      name,
      ...(lang == null && { nameEn: ritual.nameEn, nameAr: ritual.nameAr }),
      description: ritual.description,
      order: ritual.order,
      dayOfHajj: ritual.dayOfHajj,
      isRequired: ritual.isRequired,
      duas: ritual.duas.map((d) => {
        const title = lang === 'ar' ? d.titleAr ?? d.titleEn : d.titleEn ?? d.titleAr;
        const text = lang === 'ar' ? d.textAr : d.textEn ?? d.textAr;
        const out: Record<string, unknown> = {
          id: d.id,
          slug: d.slug,
          ritualId: d.ritualId,
          title: title ?? undefined,
          text,
          order: d.order,
        };
        if (lang == null) {
          out.titleEn = d.titleEn;
          out.titleAr = d.titleAr;
          out.textAr = d.textAr;
          out.textEn = d.textEn;
        }
        out.transliteration = d.transliteration ?? undefined;
        out.source = d.source ?? undefined;
        return out;
      }),
    };
    return ritualOut;
  });
}

export async function listPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
    const lang = req.query.lang as 'en' | 'ar' | undefined;
    if (lang != null && lang !== 'en' && lang !== 'ar') {
      throw new AppError(400, 'lang must be "en" or "ar" when provided');
    }
    const result = await ritualService.listRitualsPublic({ page, limit, lang });
    const data = applyLanguageFilter(result.data, lang);
    res.json({
      success: true,
      data,
      pagination: result.pagination,
    });
  } catch (e) {
    next(e);
  }
}
