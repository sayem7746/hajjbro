import { Router } from 'express';
import * as weatherController from '../controllers/weatherController.js';

const router = Router();

router.get('/forecast', weatherController.getForecast);
router.get('/forecast-range', weatherController.getForecastRange);
router.get('/historical-hajj', weatherController.getHistoricalHajj);

export default router;
