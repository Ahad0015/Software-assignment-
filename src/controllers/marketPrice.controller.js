// =============================================================================
//  AMDAN ORGANICS – Market Price Controller
// =============================================================================

const MarketPriceModel = require('../models/marketPrice.model');

const MarketPriceController = {

  // ── Get all prices ──────────────────────────────────────────────────────────
  async getAll(req, res) {
    try {
      const { cropName, marketLocation } = req.query;
      const prices = await MarketPriceModel.getAll({ cropName, marketLocation });
      const latest = await MarketPriceModel.getLatestPerCrop();
      return res.status(200).json({ count: prices.length, latestPerCrop: latest, prices });
    } catch (err) {
      console.error('Get prices error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get price trend ─────────────────────────────────────────────────────────
  async getTrend(req, res) {
    try {
      const { cropName } = req.params;
      const { from, to } = req.query;

      if (!from || !to) {
        return res.status(400).json({ message: 'from and to date query params are required.' });
      }

      const trend = await MarketPriceModel.getTrend(cropName, from, to);
      return res.status(200).json({ cropName, count: trend.length, trend });
    } catch (err) {
      console.error('Get trend error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Add price entry ─────────────────────────────────────────────────────────
  async create(req, res) {
    try {
      const { cropName, pricePerUnit, unitType, marketLocation, dateRecorded } = req.body;

      if (!cropName || !pricePerUnit || !unitType || !marketLocation || !dateRecorded) {
        return res.status(400).json({
          message: 'cropName, pricePerUnit, unitType, marketLocation and dateRecorded are required.'
        });
      }

      if (parseFloat(pricePerUnit) <= 0) {
        return res.status(400).json({ message: 'pricePerUnit must be greater than 0.' });
      }

      const price = await MarketPriceModel.create({
        cropName, pricePerUnit: parseFloat(pricePerUnit),
        unitType, marketLocation, dateRecorded,
        adminID: req.user.userID
      });

      return res.status(201).json({ message: 'Market price added.', price });
    } catch (err) {
      console.error('Create price error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Update price entry ──────────────────────────────────────────────────────
  async update(req, res) {
    try {
      const { priceID } = req.params;
      const existing = await MarketPriceModel.getByID(priceID);
      if (!existing) return res.status(404).json({ message: 'Price entry not found.' });

      const updated = await MarketPriceModel.update(priceID, req.body);
      return res.status(200).json({ message: 'Price updated.', price: updated });
    } catch (err) {
      console.error('Update price error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Delete price entry ──────────────────────────────────────────────────────
  async delete(req, res) {
    try {
      const { priceID } = req.params;
      const existing = await MarketPriceModel.getByID(priceID);
      if (!existing) return res.status(404).json({ message: 'Price entry not found.' });

      await MarketPriceModel.delete(priceID);
      return res.status(200).json({ message: 'Price entry deleted.' });
    } catch (err) {
      console.error('Delete price error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },
};

module.exports = MarketPriceController;
