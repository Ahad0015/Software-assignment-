// =============================================================================
//  AMDAN ORGANICS – Report Controller
// =============================================================================

const ReportModel = require('../models/report.model');
const { Parser }  = require('json2csv');

const ReportController = {

  // ── Generate Sales & Revenue Report ────────────────────────────────────────
  async generateSalesReport(req, res) {
    try {
      const { dateFrom, dateTo, productName, status } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ message: 'dateFrom and dateTo are required.' });
      }
      if (new Date(dateTo) < new Date(dateFrom)) {
        return res.status(400).json({ message: 'dateTo must be after dateFrom.' });
      }

      const data = await ReportModel.getSalesData(
        dateFrom, dateTo, { productName, status }
      );

      // Save report to DB
      const saved = await ReportModel.save({
        reportType : 'Sales & Revenue',
        userID     : req.user.userID,
        dateFrom, dateTo,
        filters    : { productName, status },
        content    : data
      });

      return res.status(200).json({
        reportID  : saved.report_id,
        reportType: 'Sales & Revenue',
        dateFrom, dateTo,
        summary   : data.summary,
        rows      : data.rows
      });
    } catch (err) {
      console.error('Sales report error:', err.message);
      return res.status(500).json({ message: 'Server error generating report.' });
    }
  },

  // ── Generate Inventory Report ───────────────────────────────────────────────
  async generateInventoryReport(req, res) {
    try {
      const { category, stockStatus } = req.query;

      const data = await ReportModel.getInventoryData({ category, stockStatus });

      const saved = await ReportModel.save({
        reportType : 'Inventory',
        userID     : req.user.userID,
        dateFrom   : new Date().toISOString().split('T')[0],
        dateTo     : new Date().toISOString().split('T')[0],
        filters    : { category, stockStatus },
        content    : data
      });

      return res.status(200).json({
        reportID  : saved.report_id,
        reportType: 'Inventory',
        summary   : data.summary,
        rows      : data.rows
      });
    } catch (err) {
      console.error('Inventory report error:', err.message);
      return res.status(500).json({ message: 'Server error generating report.' });
    }
  },

  // ── Generate Crop Performance Report ───────────────────────────────────────
  async generateCropReport(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      if (!dateFrom || !dateTo) {
        return res.status(400).json({ message: 'dateFrom and dateTo are required.' });
      }

      const data = await ReportModel.getCropData(dateFrom, dateTo);

      const saved = await ReportModel.save({
        reportType : 'Crop Performance',
        userID     : req.user.userID,
        dateFrom, dateTo,
        filters    : {},
        content    : data
      });

      return res.status(200).json({
        reportID  : saved.report_id,
        reportType: 'Crop Performance',
        dateFrom, dateTo,
        summary   : data.summary,
        rows      : data.rows
      });
    } catch (err) {
      console.error('Crop report error:', err.message);
      return res.status(500).json({ message: 'Server error generating report.' });
    }
  },

  // ── Generate User Activity Report (Admin only) ──────────────────────────────
  async generateUserReport(req, res) {
    try {
      const data = await ReportModel.getUserActivityData();

      const saved = await ReportModel.save({
        reportType : 'User Activity',
        userID     : req.user.userID,
        dateFrom   : new Date().toISOString().split('T')[0],
        dateTo     : new Date().toISOString().split('T')[0],
        filters    : {},
        content    : data
      });

      return res.status(200).json({
        reportID  : saved.report_id,
        reportType: 'User Activity',
        summary   : data.summary,
        rows      : data.rows
      });
    } catch (err) {
      console.error('User report error:', err.message);
      return res.status(500).json({ message: 'Server error generating report.' });
    }
  },

  // ── Export report as CSV ────────────────────────────────────────────────────
  async exportCSV(req, res) {
    try {
      const { reportID } = req.params;
      const report = await ReportModel.getByID(reportID);

      if (!report) {
        return res.status(404).json({ message: 'Report not found.' });
      }

      // Make sure requesting user owns this report or is admin
      if (report.generated_by_user_id !== req.user.userID &&
          req.user.role !== 'SystemAdmin') {
        return res.status(403).json({ message: 'Access denied.' });
      }

      const content = report.report_content;
      const rows    = content.rows || [];

      if (rows.length === 0) {
        return res.status(200).json({ message: 'No data to export.' });
      }

      const parser = new Parser({ fields: Object.keys(rows[0]) });
      const csv    = parser.parse(rows);

      res.header('Content-Type', 'text/csv');
      res.attachment(`report_${report.report_type}_${report.report_id}.csv`);
      return res.send(csv);

    } catch (err) {
      console.error('Export CSV error:', err.message);
      return res.status(500).json({ message: 'Server error exporting report.' });
    }
  },

  // ── Get my saved reports ────────────────────────────────────────────────────
  async getMyReports(req, res) {
    try {
      const reports = await ReportModel.getByUser(req.user.userID);
      return res.status(200).json({ count: reports.length, reports });
    } catch (err) {
      console.error('Get reports error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get single report ───────────────────────────────────────────────────────
  async getByID(req, res) {
    try {
      const { reportID } = req.params;
      const report = await ReportModel.getByID(reportID);

      if (!report) {
        return res.status(404).json({ message: 'Report not found.' });
      }
      if (report.generated_by_user_id !== req.user.userID &&
          req.user.role !== 'SystemAdmin') {
        return res.status(403).json({ message: 'Access denied.' });
      }

      return res.status(200).json({ report });
    } catch (err) {
      console.error('Get report error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },
};

module.exports = ReportController;
