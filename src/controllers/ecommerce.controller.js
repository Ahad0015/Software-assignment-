// =============================================================================
//  AMDAN ORGANICS – E-Commerce Controller
//  Handles: Produce Listings, Purchase Inquiries, Orders
// =============================================================================

const ListingModel             = require('../models/listing.model');
const { InquiryModel, OrderModel } = require('../models/inquiry.model');
const pool                     = require('../db');

const EcommerceController = {

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  PRODUCE LISTINGS                                                        ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── Create listing ──────────────────────────────────────────────────────────
  async createListing(req, res) {
    try {
      const { productName, description, quantityAvailable,
              unit, unitPrice, harvestDate, qualityGrade } = req.body;

      if (!productName || !description || !quantityAvailable ||
          !unit || !unitPrice || !harvestDate || !qualityGrade) {
        return res.status(400).json({ message: 'All listing fields are required.' });
      }

      if (parseFloat(unitPrice) <= 0 || parseFloat(quantityAvailable) <= 0) {
        return res.status(400).json({
          message: 'unitPrice and quantityAvailable must be greater than 0.'
        });
      }

      const listing = await ListingModel.create({
        productName, description,
        quantityAvailable : parseFloat(quantityAvailable),
        unit, unitPrice   : parseFloat(unitPrice),
        harvestDate, qualityGrade,
        photoPaths        : [],
        managerID         : req.user.userID,
        status: 'Pending Approval'
      });

      // Notify admins for approval
      const admins = await pool.query(
        `SELECT user_id FROM users WHERE role = 'SystemAdmin' AND status = 'Approved'`
      );
      for (const admin of admins.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, reference_id)
           VALUES ($1, 'listing_approved', $2, $3)`,
          [admin.user_id,
           `New listing pending approval: "${productName}"`,
           listing.listing_id]
        );
      }

      return res.status(201).json({
        message : 'Listing created. Submitted for admin approval.',
        listing
      });
    } catch (err) {
      console.error('Create listing error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get all listings (manager sees own; admin sees all) ─────────────────────
  async getAllListings(req, res) {
    try {
      const { status, productName } = req.query;
      const managerID = req.user.role === 'FarmManager' ? req.user.userID : null;
      const listings  = await ListingModel.getAll({ status, productName, managerID });
      return res.status(200).json({ count: listings.length, listings });
    } catch (err) {
      console.error('Get listings error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get published listings for buyers ───────────────────────────────────────
  async getMarketplace(req, res) {
    try {
      const { productName, minPrice, maxPrice } = req.query;
      const listings = await ListingModel.getPublished({ productName, minPrice, maxPrice });
      return res.status(200).json({ count: listings.length, listings });
    } catch (err) {
      console.error('Get marketplace error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get single listing ──────────────────────────────────────────────────────
  async getListingByID(req, res) {
    try {
      const { listingID } = req.params;
      const listing = await ListingModel.getByID(listingID);
      if (!listing) return res.status(404).json({ message: 'Listing not found.' });
      return res.status(200).json({ listing });
    } catch (err) {
      console.error('Get listing error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Update listing ──────────────────────────────────────────────────────────
  async updateListing(req, res) {
    try {
      const { listingID } = req.params;
      const listing = await ListingModel.getByID(listingID);
      if (!listing) return res.status(404).json({ message: 'Listing not found.' });

      if (listing.status === 'Removed') {
        return res.status(400).json({ message: 'Cannot update a removed listing.' });
      }

      const updated = await ListingModel.update(listingID, req.body);

      // Re-submit for approval if it was published
      if (listing.status === 'Published') {
        await ListingModel.updateStatus(listingID, 'Pending Approval');
      }

      return res.status(200).json({ message: 'Listing updated.', listing: updated });
    } catch (err) {
      console.error('Update listing error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Approve listing (Admin only) ────────────────────────────────────────────
  async approveListing(req, res) {
    try {
      const { listingID } = req.params;
      const listing = await ListingModel.getByID(listingID);
      if (!listing) return res.status(404).json({ message: 'Listing not found.' });

      if (listing.status !== 'Pending Approval') {
        return res.status(400).json({
          message: `Listing status is "${listing.status}". Only Pending Approval listings can be approved.`
        });
      }

      const updated = await ListingModel.updateStatus(
        listingID, 'Published', { adminID: req.user.userID }
      );

      // Notify manager
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, reference_id)
         VALUES ($1, 'listing_approved', $2, $3)`,
        [listing.created_by_manager_id,
         `Your listing "${listing.product_name}" has been approved and is now live.`,
         listingID]
      );

      return res.status(200).json({ message: 'Listing approved and published.', listing: updated });
    } catch (err) {
      console.error('Approve listing error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Reject listing (Admin only) ─────────────────────────────────────────────
  async rejectListing(req, res) {
    try {
      const { listingID } = req.params;
      const { reason }   = req.body;
      const listing = await ListingModel.getByID(listingID);
      if (!listing) return res.status(404).json({ message: 'Listing not found.' });

      const updated = await ListingModel.updateStatus(
        listingID, 'Rejected', { adminID: req.user.userID, reason }
      );

      // Notify manager
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, reference_id)
         VALUES ($1, 'listing_rejected', $2, $3)`,
        [listing.created_by_manager_id,
         `Your listing "${listing.product_name}" was rejected. Reason: ${reason || 'Not specified.'}`,
         listingID]
      );

      return res.status(200).json({ message: 'Listing rejected.', listing: updated });
    } catch (err) {
      console.error('Reject listing error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Remove listing ──────────────────────────────────────────────────────────
  async removeListing(req, res) {
    try {
      const { listingID } = req.params;
      const listing = await ListingModel.getByID(listingID);
      if (!listing) return res.status(404).json({ message: 'Listing not found.' });

      await ListingModel.updateStatus(listingID, 'Removed');
      return res.status(200).json({ message: 'Listing removed successfully.' });
    } catch (err) {
      console.error('Remove listing error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  PURCHASE INQUIRIES                                                      ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── Submit inquiry (Buyer) ──────────────────────────────────────────────────
  async submitInquiry(req, res) {
    try {
      const { listingID, requestedQty, preferredDeliveryDate, notes } = req.body;

      if (!listingID || !requestedQty) {
        return res.status(400).json({ message: 'listingID and requestedQty are required.' });
      }

      const listing = await ListingModel.getByID(listingID);
      if (!listing) return res.status(404).json({ message: 'Listing not found.' });
      if (listing.status !== 'Published') {
        return res.status(400).json({ message: 'This listing is not available for purchase.' });
      }

      // Warn if qty > available
      if (parseFloat(requestedQty) > parseFloat(listing.quantity_available)) {
        return res.status(400).json({
          message  : `Requested quantity exceeds available stock.`,
          available: listing.quantity_available
        });
      }

      const inquiry = await InquiryModel.create({
        listingID,
        buyerID           : req.user.userID,
        requestedQty      : parseFloat(requestedQty),
        unit              : listing.unit,
        preferredDeliveryDate,
        notes
      });

      // Notify farm manager
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, reference_id)
         VALUES ($1, 'new_inquiry', $2, $3)`,
        [listing.created_by_manager_id,
         `New purchase inquiry for "${listing.product_name}" — ${requestedQty} ${listing.unit}`,
         inquiry.inquiry_id]
      );

      return res.status(201).json({
        message : 'Inquiry submitted. The farm manager will respond shortly.',
        inquiry
      });
    } catch (err) {
      console.error('Submit inquiry error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Get all inquiries ───────────────────────────────────────────────────────
  async getInquiries(req, res) {
    try {
      const { status }  = req.query;
      const buyerID     = req.user.role === 'Buyer' ? req.user.userID : null;
      const inquiries   = await InquiryModel.getAll({ buyerID, status });
      return res.status(200).json({ count: inquiries.length, inquiries });
    } catch (err) {
      console.error('Get inquiries error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Respond to inquiry (FarmManager) ────────────────────────────────────────
  async respondToInquiry(req, res) {
    try {
      const { inquiryID }          = req.params;
      const { action, message }    = req.body;

      const validActions = ['Accept', 'Decline', 'Counter-Offer'];
      if (!action || !validActions.includes(action)) {
        return res.status(400).json({
          message: `action must be one of: ${validActions.join(', ')}`
        });
      }

      const inquiry = await InquiryModel.getByID(inquiryID);
      if (!inquiry) return res.status(404).json({ message: 'Inquiry not found.' });
      if (!['Submitted', 'Under Review', 'Counter-Offered'].includes(inquiry.status)) {
        return res.status(400).json({
          message: `Cannot respond to an inquiry with status: ${inquiry.status}`
        });
      }

      const statusMap = {
        'Accept'       : 'Accepted',
        'Decline'      : 'Declined',
        'Counter-Offer': 'Counter-Offered'
      };

      const updated = await InquiryModel.updateStatus(
        inquiryID, statusMap[action], message
      );

      // If accepted — create order and deduct listing stock
      let order = null;
      if (action === 'Accept') {
        const listing = await ListingModel.getByID(inquiry.listing_id);
        order = await OrderModel.createFromInquiry(
          inquiry, listing, req.user.userID
        );
        await ListingModel.deductQuantity(inquiry.listing_id, inquiry.requested_qty);
        await InquiryModel.updateStatus(inquiryID, 'Order Created', message);

        // Notify buyer
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, reference_id)
           VALUES ($1, 'order_update', $2, $3)`,
          [inquiry.buyer_id,
           `Your inquiry for "${inquiry.product_name}" was accepted! Order #${order.order_id} created.`,
           order.order_id]
        );
      } else {
        // Notify buyer of decline or counter-offer
        await pool.query(
          `INSERT INTO notifications (user_id, type, message, reference_id)
           VALUES ($1, 'inquiry_response', $2, $3)`,
          [inquiry.buyer_id,
           `Farm manager responded to your inquiry for "${inquiry.product_name}": ${action}. ${message || ''}`,
           inquiryID]
        );
      }

      return res.status(200).json({
        message : `Inquiry ${action}ed successfully.`,
        inquiry : updated,
        order
      });
    } catch (err) {
      console.error('Respond to inquiry error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  ORDERS                                                                  ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // ── Get all orders ──────────────────────────────────────────────────────────
  async getOrders(req, res) {
    try {
      const { status }       = req.query;
      const buyerID          = req.user.role === 'Buyer' ? req.user.userID : null;
      const farmManagerID    = req.user.role === 'FarmManager' ? req.user.userID : null;
      const orders           = await OrderModel.getAll({ buyerID, farmManagerID, status });
      return res.status(200).json({ count: orders.length, orders });
    } catch (err) {
      console.error('Get orders error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },

  // ── Update order status (FarmManager) ───────────────────────────────────────
  async updateOrderStatus(req, res) {
    try {
      const { orderID }   = req.params;
      const { status, reason } = req.body;

      const validStatuses = ['Processing', 'Ready for Pickup', 'Delivered', 'Cancelled'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          message: `status must be one of: ${validStatuses.join(', ')}`
        });
      }

      const order = await OrderModel.getByID(orderID);
      if (!order) return res.status(404).json({ message: 'Order not found.' });
      if (order.status === 'Delivered' || order.status === 'Cancelled') {
        return res.status(400).json({
          message: `Order is already ${order.status}. Cannot update.`
        });
      }

      const updated = await OrderModel.updateStatus(orderID, status, reason);

      // Notify buyer
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, reference_id)
         VALUES ($1, 'order_update', $2, $3)`,
        [order.buyer_id,
         `Your order for "${order.product_name}" status updated to: ${status}.`,
         orderID]
      );

      return res.status(200).json({ message: `Order status updated to ${status}.`, order: updated });
    } catch (err) {
      console.error('Update order status error:', err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  },
};

module.exports = EcommerceController;
