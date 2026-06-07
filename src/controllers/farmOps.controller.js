// =============================================================================
//  AMDAN ORGANICS – Farm Operations Controller
//  Handles: Crop Plans, Field Activities, Harvest Records
// =============================================================================

const CropPlanModel      = require('../models/cropPlan.model');
const FieldActivityModel = require('../models/fieldActivity.model');
const HarvestModel       = require('../models/harvest.model');
const pool               = require('../db');

const FarmOpsController = {

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  CROP PLANS                                                              ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── Create crop plan ────────────────────────────────────────────────────────
  async createCropPlan(req, res) {
    try {
      const {
        cropType,
        fieldPlot,
        plantingDate,
        expectedHarvestDate,
        staffIDs
      } = req.body;

      // Validate required fields
      if (!cropType || !fieldPlot || !plantingDate || !expectedHarvestDate) {
        return res.status(400).json({
          message: 'cropType, fieldPlot, plantingDate and expectedHarvestDate are required.'
        });
      }

      // Validate dates
      if (new Date(expectedHarvestDate) <= new Date(plantingDate)) {
        return res.status(400).json({
          message: 'expectedHarvestDate must be after plantingDate.'
        });
      }

      // Validate staffIDs provided
      if (!staffIDs || !Array.isArray(staffIDs) || staffIDs.length === 0) {
        return res.status(400).json({
          message: 'At least one staffID must be assigned to the crop plan.'
        });
      }

      // Create the crop plan
      const plan = await CropPlanModel.create({
        cropType,
        fieldPlot,
        plantingDate,
        expectedHarvestDate,
        managerID: req.user.userID
      });

      // Assign staff
      await CropPlanModel.assignStaff(plan.plan_id, staffIDs);

      // Notify assigned staff via notifications table
      for (const staffID of staffIDs) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, reference_id)
           VALUES ($1, 'task_assignment', $2, $3)`,
          [
            staffID,
            `You have been assigned to crop plan: ${cropType} on ${fieldPlot}`,
            plan.plan_id
          ]
        );
      }

      // Fetch assigned staff details
      const assignedStaff = await CropPlanModel.getAssignedStaff(plan.plan_id);

      return res.status(201).json({
        message      : 'Crop plan created successfully.',
        cropPlan     : plan,
        assignedStaff: assignedStaff
      });

    } catch (err) {
      console.error('Create crop plan error:', err.message);
      return res.status(500).json({ message: 'Server error creating crop plan.' });
    }
  },

  // ── Get all crop plans ──────────────────────────────────────────────────────
  async getAllCropPlans(req, res) {
    try {
      const { status, fieldPlot } = req.query;

      // FarmManager sees their own plans; Admin sees all
      const managerID = req.user.role === 'FarmManager' ? req.user.userID : null;

      const plans = await CropPlanModel.getAll({ managerID, status, fieldPlot });

      // Attach staff to each plan
      const plansWithStaff = await Promise.all(
        plans.map(async (plan) => {
          const staff = await CropPlanModel.getAssignedStaff(plan.plan_id);
          return { ...plan, assignedStaff: staff };
        })
      );

      return res.status(200).json({
        count    : plansWithStaff.length,
        cropPlans: plansWithStaff
      });

    } catch (err) {
      console.error('Get crop plans error:', err.message);
      return res.status(500).json({ message: 'Server error fetching crop plans.' });
    }
  },

  // ── Get single crop plan ────────────────────────────────────────────────────
  async getCropPlanByID(req, res) {
    try {
      const { planID } = req.params;
      const plan = await CropPlanModel.getByID(planID);

      if (!plan) {
        return res.status(404).json({ message: 'Crop plan not found.' });
      }

      const assignedStaff  = await CropPlanModel.getAssignedStaff(planID);
      const fieldActivities = await FieldActivityModel.getByPlan(planID);
      const harvestRecords  = await HarvestModel.getByPlan(planID);

      return res.status(200).json({
        cropPlan        : plan,
        assignedStaff,
        fieldActivities,
        harvestRecords
      });

    } catch (err) {
      console.error('Get crop plan error:', err.message);
      return res.status(500).json({ message: 'Server error fetching crop plan.' });
    }
  },

  // ── Get crop plans for logged-in staff ──────────────────────────────────────
  async getMyCropPlans(req, res) {
    try {
      const plans = await CropPlanModel.getByStaff(req.user.userID);
      return res.status(200).json({ count: plans.length, cropPlans: plans });
    } catch (err) {
      console.error('Get my crop plans error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Update crop plan ────────────────────────────────────────────────────────
  async updateCropPlan(req, res) {
    try {
      const { planID } = req.params;
      const plan = await CropPlanModel.getByID(planID);

      if (!plan) {
        return res.status(404).json({ message: 'Crop plan not found.' });
      }
      if (plan.status === 'Harvested' || plan.status === 'Cancelled') {
        return res.status(400).json({
          message: `Cannot update a crop plan with status: ${plan.status}`
        });
      }

      const updated = await CropPlanModel.update(planID, req.body);
      return res.status(200).json({ message: 'Crop plan updated.', cropPlan: updated });

    } catch (err) {
      console.error('Update crop plan error:', err.message);
      return res.status(500).json({ message: 'Server error updating crop plan.' });
    }
  },

  // ── Cancel crop plan ────────────────────────────────────────────────────────
  async cancelCropPlan(req, res) {
    try {
      const { planID }  = req.params;
      const { reason }  = req.body;

      const plan = await CropPlanModel.getByID(planID);
      if (!plan) {
        return res.status(404).json({ message: 'Crop plan not found.' });
      }
      if (plan.status === 'Harvested' || plan.status === 'Cancelled') {
        return res.status(400).json({
          message: `Plan is already ${plan.status}.`
        });
      }

      const updated = await CropPlanModel.updateStatus(planID, 'Cancelled', reason || null);

      // Notify assigned staff
      const staff = await CropPlanModel.getAssignedStaff(planID);
      for (const member of staff) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, reference_id)
           VALUES ($1, 'task_assignment', $2, $3)`,
          [
            member.user_id,
            `Crop plan for ${plan.crop_type} on ${plan.field_plot} has been cancelled.`,
            planID
          ]
        );
      }

      return res.status(200).json({ message: 'Crop plan cancelled.', cropPlan: updated });

    } catch (err) {
      console.error('Cancel crop plan error:', err.message);
      return res.status(500).json({ message: 'Server error cancelling crop plan.' });
    }
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  FIELD ACTIVITIES                                                        ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── Log field activity ──────────────────────────────────────────────────────
  async logFieldActivity(req, res) {
    try {
      const { cropPlanID, activityType, activityDate, notes } = req.body;

      if (!cropPlanID || !activityType || !activityDate) {
        return res.status(400).json({
          message: 'cropPlanID, activityType and activityDate are required.'
        });
      }

      // Validate activity date is not in the future
      if (new Date(activityDate) > new Date()) {
        return res.status(400).json({
          message: 'activityDate cannot be in the future.'
        });
      }

      // Check crop plan exists
      const plan = await CropPlanModel.getByID(cropPlanID);
      if (!plan) {
        return res.status(404).json({ message: 'Crop plan not found.' });
      }

      const activity = await FieldActivityModel.create({
        cropPlanID,
        activityType,
        activityDate,
        notes,
        staffID: req.user.userID
      });

      // Update crop plan status to In Progress if still Planned
      if (plan.status === 'Planned') {
        await CropPlanModel.updateStatus(cropPlanID, 'In Progress');
      }

      return res.status(201).json({
        message : 'Field activity logged successfully.',
        activity: activity
      });

    } catch (err) {
      console.error('Log field activity error:', err.message);
      return res.status(500).json({ message: 'Server error logging field activity.' });
    }
  },

  // ── Get activities for a crop plan ─────────────────────────────────────────
  async getActivitiesByPlan(req, res) {
    try {
      const { planID } = req.params;
      const activities = await FieldActivityModel.getByPlan(planID);
      return res.status(200).json({ count: activities.length, activities });
    } catch (err) {
      console.error('Get activities error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get my activities (for staff) ───────────────────────────────────────────
  async getMyActivities(req, res) {
    try {
      const activities = await FieldActivityModel.getByStaff(req.user.userID);
      return res.status(200).json({ count: activities.length, activities });
    } catch (err) {
      console.error('Get my activities error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  HARVEST RECORDS                                                         ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── Record harvest ──────────────────────────────────────────────────────────
  async recordHarvest(req, res) {
    try {
      const {
        cropPlanID,
        quantityHarvested,
        unit,
        harvestDate,
        qualityGrade
      } = req.body;

      if (!cropPlanID || !quantityHarvested || !unit || !harvestDate || !qualityGrade) {
        return res.status(400).json({
          message: 'cropPlanID, quantityHarvested, unit, harvestDate and qualityGrade are required.'
        });
      }

      if (parseFloat(quantityHarvested) <= 0) {
        return res.status(400).json({ message: 'quantityHarvested must be greater than 0.' });
      }

      // Validate harvest date is not future
      if (new Date(harvestDate) > new Date()) {
        return res.status(400).json({ message: 'harvestDate cannot be in the future.' });
      }

      // Check crop plan exists
      const plan = await CropPlanModel.getByID(cropPlanID);
      if (!plan) {
        return res.status(404).json({ message: 'Crop plan not found.' });
      }
      if (plan.status === 'Cancelled') {
        return res.status(400).json({ message: 'Cannot record harvest for a cancelled plan.' });
      }

      // Create harvest record
      // Note: the DB trigger will automatically update inventory_items
      const harvest = await HarvestModel.create({
        cropPlanID,
        quantityHarvested: parseFloat(quantityHarvested),
        unit,
        harvestDate,
        qualityGrade,
        managerID: req.user.userID
      });

      // Fetch updated inventory stock
      const inventoryResult = await pool.query(
        `SELECT current_stock, unit FROM inventory_items
         WHERE item_name = $1 AND category = 'Produce'`,
        [plan.crop_type]
      );
      const updatedStock = inventoryResult.rows[0] || null;

      return res.status(201).json({
        message          : 'Harvest recorded successfully. Inventory updated automatically.',
        harvest,
        updatedInventory : updatedStock
      });

    } catch (err) {
      console.error('Record harvest error:', err.message);
      return res.status(500).json({ message: 'Server error recording harvest.' });
    }
  },

  // ── Get harvests for a crop plan ────────────────────────────────────────────
  async getHarvestsByPlan(req, res) {
    try {
      const { planID } = req.params;
      const harvests   = await HarvestModel.getByPlan(planID);
      const total      = await HarvestModel.getTotalByPlan(planID);
      return res.status(200).json({ count: harvests.length, totalHarvested: total, harvests });
    } catch (err) {
      console.error('Get harvests error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get all harvests ────────────────────────────────────────────────────────
  async getAllHarvests(req, res) {
    try {
      const { from, to, cropType } = req.query;
      const harvests = await HarvestModel.getAll({ from, to, cropType });
      return res.status(200).json({ count: harvests.length, harvests });
    } catch (err) {
      console.error('Get all harvests error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },
};

module.exports = FarmOpsController;
