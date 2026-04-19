const express = require('express');
const router = express.Router();
const { auth: authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const {
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
} = require('../services/issueService');

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const issue = await createIssue({
    ...req.body,
    reportedBy: req.user.email
  });
  res.json({ success: true, issue });
}));

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status, severity, category, limit = 50 } = req.query;
  const issues = await getIssues({ status, severity, category, limit: parseInt(limit) });
  res.json({ success: true, issues });
}));

router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const stats = await getIssueStats();
  res.json({ success: true, stats });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const issue = await getIssueById(req.params.id);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }
  res.json({ success: true, issue });
}));

router.get('/:id/diagnostic', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Admin or Manager role required' });
  }
  
  const diagnostic = await getDiagnosticData(req.params.id);
  if (!diagnostic) {
    return res.status(404).json({ error: 'Issue not found' });
  }
  res.json({ success: true, diagnostic });
}));

router.patch('/:id/acknowledge', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Admin or Manager role required' });
  }
  
  const result = await acknowledgeIssue(req.params.id, req.user.email);
  res.json(result);
}));

router.patch('/:id/diagnose', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Admin or Manager role required' });
  }
  
  const { rootCause } = req.body;
  if (!rootCause) {
    return res.status(400).json({ error: 'rootCause required' });
  }
  
  const result = await diagnoseIssue(req.params.id, rootCause);
  res.json(result);
}));

router.patch('/:id/fix', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Admin or Manager role required' });
  }
  
  const { fixDescription } = req.body;
  if (!fixDescription) {
    return res.status(400).json({ error: 'fixDescription required' });
  }
  
  const result = await applyFix(req.params.id, fixDescription);
  res.json(result);
}));

router.patch('/:id/verify', authenticate, asyncHandler(async (req, res) => {
  const result = await verifyFix(req.params.id);
  res.json(result);
}));

router.patch('/:id/close', authenticate, asyncHandler(async (req, res) => {
  const { wontFix = false } = req.body;
  const result = await closeIssue(req.params.id, wontFix);
  res.json(result);
}));

router.get('/severity/list', (req, res) => {
  res.json({ success: true, severity: ISSUE_SEVERITY });
});

router.get('/status/list', (req, res) => {
  res.json({ success: true, status: ISSUE_STATUS });
});

router.get('/category/list', (req, res) => {
  res.json({ success: true, category: ISSUE_CATEGORY });
});

module.exports = router;