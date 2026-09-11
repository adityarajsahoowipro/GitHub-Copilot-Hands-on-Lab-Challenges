import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import * as rcaService from '../services/rcaService.js';

export const generateRca = asyncHandler(async (req, res) => {
  const rca = await rcaService.generateRca(req.params.incidentId);
  success(res, rca, 201);
});

export const getRca = asyncHandler(async (req, res) => {
  const rca = await rcaService.getRca(req.params.incidentId);
  success(res, rca);
});

export const updateRca = asyncHandler(async (req, res) => {
  const rca = await rcaService.updateRca(req.params.incidentId, req.body);
  success(res, rca);
});
