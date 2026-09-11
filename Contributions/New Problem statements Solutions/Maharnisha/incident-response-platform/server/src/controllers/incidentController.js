import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/apiResponse.js';
import * as incidentService from '../services/incidentService.js';
import * as relatedService from '../services/relatedService.js';

export const createIncident = asyncHandler(async (req, res) => {
  const incident = await incidentService.createIncident(req.body);
  success(res, incident, 201);
});

export const listIncidents = asyncHandler(async (req, res) => {
  const incidents = await incidentService.listIncidents(req.query);
  success(res, incidents);
});

export const getIncident = asyncHandler(async (req, res) => {
  const incident = await incidentService.getIncident(req.params.incidentId);
  success(res, incident);
});

export const updateIncident = asyncHandler(async (req, res) => {
  const incident = await incidentService.updateIncident(req.params.incidentId, req.body);
  success(res, incident);
});

export const evaluateSla = asyncHandler(async (req, res) => {
  const result = await incidentService.evaluateSlaBreaches();
  success(res, result);
});

export const getRelatedIncidents = asyncHandler(async (req, res) => {
  const related = await relatedService.getRelatedIncidents(req.params.incidentId);
  success(res, related);
});

export const linkIncidents = asyncHandler(async (req, res) => {
  const result = await relatedService.linkIncidents(req.params.incidentId, req.params.relatedIncidentId);
  success(res, result, 201);
});
