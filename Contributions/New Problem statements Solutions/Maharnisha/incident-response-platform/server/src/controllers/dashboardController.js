import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import { getDashboardMetrics } from '../services/dashboardService.js';

export const getMetrics = asyncHandler(async (req, res) => {
  const metrics = await getDashboardMetrics();
  success(res, metrics);
});
