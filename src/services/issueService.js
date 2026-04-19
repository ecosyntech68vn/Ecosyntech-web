const logger = require('../config/logger');
const { getAll, getOne, runQuery } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const ISSUE_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high', 
  MEDIUM: 'medium',
  LOW: 'low'
};

const ISSUE_STATUS = {
  NEW: 'new',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  DIAGNOSED: 'diagnosed',
  FIXED: 'fixed',
  VERIFIED: 'verified',
  CLOSED: 'closed',
  WONT_FIX: 'wont_fix'
};

const ISSUE_CATEGORY = {
  HARDWARE: 'hardware',
  SOFTWARE: 'software',
  NETWORK: 'network',
  SENSOR: 'sensor',
  CONFIGURATION: 'configuration',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  OTHER: 'other'
};

async function createIssue(data) {
  const {
    title,
    description,
    severity = 'medium',
    category = 'other',
    affectedFarm,
    affectedDevice,
    affectedSensor,
    stepsToReproduce,
    expectedBehavior,
    actualBehavior,
    reportedBy
  } = data;

  const id = uuidv4();
  const issue = {
    id,
    title,
    description,
    severity,
    category,
    status: ISSUE_STATUS.NEW,
    affected_farm: affectedFarm,
    affected_device: affectedDevice,
    affected_sensor: affectedSensor,
    steps_to_reproduce: stepsToReproduce,
    expected_behavior: expectedBehavior,
    actual_behavior: actualBehavior,
    root_cause: null,
    fix_applied: null,
    reported_by: reportedBy,
    assigned_to: null,
    acknowledged_at: null,
    diagnosed_at: null,
    fixed_at: null,
    verified_at: null,
    closed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await runQuery(
    `INSERT INTO service_issues 
     (id, title, description, severity, category, status, affected_farm, affected_device, affected_sensor, steps_to_reproduce, expected_behavior, actual_behavior, root_cause, fix_applied, reported_by, assigned_to, acknowledged_at, diagnosed_at, fixed_at, verified_at, closed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    Object.values(issue)
  );

  logger.warn(`[ISSUE] Created: ${id} - ${title}`);

  return issue;
}

async function acknowledgeIssue(id, assignedTo) {
  await runQuery(
    `UPDATE service_issues SET status = ?, assigned_to = ?, acknowledged_at = ?, updated_at = ? WHERE id = ?`,
    [ISSUE_STATUS.ACKNOWLEDGED, assignedTo, new Date().toISOString(), new Date().toISOString(), id]
  );
  
  return { success: true, status: ISSUE_STATUS.ACKNOWLEDGED };
}

async function diagnoseIssue(id, rootCause) {
  await runQuery(
    `UPDATE service_issues SET status = ?, root_cause = ?, diagnosed_at = ?, updated_at = ? WHERE id = ?`,
    [ISSUE_STATUS.DIAGNOSED, rootCause, new Date().toISOString(), new Date().toISOString(), id]
  );
  
  return { success: true, status: ISSUE_STATUS.DIAGNOSED };
}

async function applyFix(id, fixDescription) {
  await runQuery(
    `UPDATE service_issues SET status = ?, fix_applied = ?, fixed_at = ?, updated_at = ? WHERE id = ?`,
    [ISSUE_STATUS.FIXED, fixDescription, new Date().toISOString(), new Date().toISOString(), id]
  );
  
  return { success: true, status: ISSUE_STATUS.FIXED };
}

async function verifyFix(id) {
  await runQuery(
    `UPDATE service_issues SET status = ?, verified_at = ?, updated_at = ? WHERE id = ?`,
    [ISSUE_STATUS.VERIFIED, new Date().toISOString(), new Date().toISOString(), id]
  );
  
  return { success: true, status: ISSUE_STATUS.VERIFIED };
}

async function closeIssue(id, wontFix = false) {
  await runQuery(
    `UPDATE service_issues SET status = ?, closed_at = ?, updated_at = ? WHERE id = ?`,
    [wontFix ? ISSUE_STATUS.WONT_FIX : ISSUE_STATUS.CLOSED, new Date().toISOString(), new Date().toISOString(), id]
  );
  
  return { success: true };
}

async function getIssues(filters = {}) {
  let sql = 'SELECT * FROM service_issues WHERE 1=1';
  const params = [];

  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.severity) {
    sql += ' AND severity = ?';
    params.push(filters.severity);
  }

  if (filters.category) {
    sql += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters.assignedTo) {
    sql += ' AND assigned_to = ?';
    params.push(filters.assignedTo);
  }

  if (filters.fromDate) {
    sql += ' AND created_at >= ?';
    params.push(filters.fromDate);
  }

  if (filters.toDate) {
    sql += ' AND created_at <= ?';
    params.push(filters.toDate);
  }

  sql += ' ORDER BY CASE severity WHEN "critical" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 ELSE 4 END, created_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  return getAll(sql, params);
}

async function getIssueById(id) {
  return getOne('SELECT * FROM service_issues WHERE id = ?', [id]);
}

async function getIssueStats() {
  const byStatus = getAll(
    `SELECT status, COUNT(*) as count FROM service_issues GROUP BY status`
  );
  
  const bySeverity = getAll(
    `SELECT severity, COUNT(*) as count FROM service_issues GROUP BY severity`
  );
  
  const byCategory = getAll(
    `SELECT category, COUNT(*) as count FROM service_issues GROUP BY category`
  );
  
  const avgTimeToAck = getOne(
    `SELECT AVG((julianday(acknowledged_at) - julianday(created_at)) * 86400) as seconds FROM service_issues WHERE acknowledged_at IS NOT NULL`
  );
  
  const avgTimeToFix = getOne(
    `SELECT AVG((julianday(fixed_at) - julianday(created_at)) * 86400) as seconds FROM service_issues WHERE fixed_at IS NOT NULL`
  );

  return {
    byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s.count }), {}),
    bySeverity: bySeverity.reduce((acc, s) => ({ ...acc, [s.severity]: s.count }), {}),
    byCategory: byCategory.reduce((acc, s) => ({ ...acc, [s.category]: s.count }), {}),
    avgTimeToAck: avgTimeToAck?.seconds || 0,
    avgTimeToFix: avgTimeToFix?.seconds || 0
  };
}

async function getDiagnosticData(issueId) {
  const issue = await getIssueById(issueId);
  if (!issue) return null;

  const diagnostic = {
    issue,
    relatedDevices: [],
    relatedSensors: [],
    logs: [],
    timeline: []
  };

  if (issue.affected_device) {
    const logs = getAll(
      `SELECT * FROM audit_logs WHERE entity_id = ? ORDER BY timestamp DESC LIMIT 20`,
      [issue.affected_device]
    );
    diagnostic.relatedDevices = logs;
  }

  if (issue.affected_sensor) {
    const readings = getAll(
      `SELECT * FROM sensors WHERE sensor_id = ? ORDER BY timestamp DESC LIMIT 20`,
      [issue.affected_sensor]
    );
    diagnostic.relatedSensors = readings;
  }

  if (issue.acknowledged_at) {
    diagnostic.timeline.push({ time: issue.acknowledged_at, event: 'Issue acknowledged' });
  }
  if (issue.diagnosed_at) {
    diagnostic.timeline.push({ time: issue.diagnosed_at, event: `Root cause: ${issue.root_cause}` });
  }
  if (issue.fixed_at) {
    diagnostic.timeline.push({ time: issue.fixed_at, event: `Fix applied: ${issue.fix_applied}` });
  }
  if (issue.verified_at) {
    diagnostic.timeline.push({ time: issue.verified_at, event: 'Fix verified' });
  }
  if (issue.closed_at) {
    diagnostic.timeline.push({ time: issue.closed_at, event: 'Issue closed' });
  }

  return diagnostic;
}

module.exports = {
  createIssue,
  acknowledgeIssue,
  diagnoseIssue,
  applyFix,
  verifyFix,
  closeIssue,
  getIssues,
  getIssueById,
  getIssueStats,
  getDiagnosticData,
  ISSUE_SEVERITY,
  ISSUE_STATUS,
  ISSUE_CATEGORY
};