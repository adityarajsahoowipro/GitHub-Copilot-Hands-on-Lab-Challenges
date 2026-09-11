import { getAllIncidents } from '../repositories/incidentRepository.js';
import { getAllLinks, saveLink } from '../repositories/linkRepository.js';
import { getRawIncidentOrThrow } from './incidentService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'was', 'were', 'has', 'have']);
const ERROR_CODE_PATTERN = /\b[A-Za-z]{2,}[-_]\d{2,}\b/g;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

function extractKeywords(text) {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3 && !STOPWORDS.has(word))
  );
}

function extractErrorCodes(text) {
  if (!text) return new Set();
  return new Set((text.match(ERROR_CODE_PATTERN) || []).map((code) => code.toUpperCase()));
}

function sharedItems(setA, setB) {
  return [...setA].filter((item) => setB.has(item));
}

// Suggests possibly-related incidents using simple heuristics; never asserts certainty.
export async function getRelatedIncidents(incidentId) {
  const target = await getRawIncidentOrThrow(incidentId);
  const allIncidents = await getAllIncidents();
  const links = await getAllLinks();

  const linkedIds = new Set(
    links
      .filter((link) => link.a === incidentId || link.b === incidentId)
      .map((link) => (link.a === incidentId ? link.b : link.a))
  );

  const targetTitleKeywords = extractKeywords(target.title);
  const targetDescriptionKeywords = extractKeywords(target.description);
  const targetErrorCodes = extractErrorCodes(`${target.title} ${target.description}`);
  const targetCreatedAt = new Date(target.createdAt).getTime();

  const suggestions = [];

  for (const candidate of allIncidents) {
    if (candidate.incidentId === incidentId) continue;

    const reasons = [];

    if (candidate.impactedService === target.impactedService) {
      reasons.push('Same impacted service.');
    }

    const titleOverlap = sharedItems(targetTitleKeywords, extractKeywords(candidate.title));
    if (titleOverlap.length > 0) {
      reasons.push(`Shared title keywords: ${titleOverlap.join(', ')}.`);
    }

    const descriptionOverlap = sharedItems(targetDescriptionKeywords, extractKeywords(candidate.description));
    if (descriptionOverlap.length > 0) {
      reasons.push(`Shared description keywords: ${descriptionOverlap.join(', ')}.`);
    }

    const errorCodeOverlap = sharedItems(
      targetErrorCodes,
      extractErrorCodes(`${candidate.title} ${candidate.description}`)
    );
    if (errorCodeOverlap.length > 0) {
      reasons.push(`Shared error code pattern: ${errorCodeOverlap.join(', ')}.`);
    }

    const candidateCreatedAt = new Date(candidate.createdAt).getTime();
    if (
      !Number.isNaN(targetCreatedAt) &&
      !Number.isNaN(candidateCreatedAt) &&
      Math.abs(candidateCreatedAt - targetCreatedAt) <= THIRTY_MINUTES_MS
    ) {
      reasons.push('Created within 30 minutes of this incident.');
    }

    if (reasons.length > 0) {
      suggestions.push({
        incidentId: candidate.incidentId,
        title: candidate.title,
        status: candidate.status,
        severity: candidate.severity,
        reasons,
        linked: linkedIds.has(candidate.incidentId)
      });
    }
  }

  return suggestions;
}

// Confirms a link between two incidents. Links are stored once and treated as symmetric.
export async function linkIncidents(incidentId, relatedIncidentId) {
  if (incidentId === relatedIncidentId) {
    throw new ValidationError('An incident cannot be linked to itself.');
  }

  await getRawIncidentOrThrow(incidentId);
  const related = await getRawIncidentOrThrow(relatedIncidentId).catch(() => null);
  if (!related) {
    throw new NotFoundError(`Incident ${relatedIncidentId} was not found.`);
  }

  const links = await getAllLinks();
  const alreadyLinked = links.some(
    (link) =>
      (link.a === incidentId && link.b === relatedIncidentId) ||
      (link.a === relatedIncidentId && link.b === incidentId)
  );
  if (alreadyLinked) {
    return { incidentId, relatedIncidentId, alreadyLinked: true };
  }

  const link = { a: incidentId, b: relatedIncidentId, linkedAt: new Date().toISOString() };
  await saveLink(link);
  return { incidentId, relatedIncidentId, alreadyLinked: false };
}
