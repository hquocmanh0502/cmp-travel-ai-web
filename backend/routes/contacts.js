const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const User = require('../models/User');

// ==================== PUBLIC ROUTES ====================

// POST - Submit contact form (public)
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, subject, message, category = 'general' } = req.body;

        // Basic validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, subject, and message are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address'
            });
        }

        // Create contact
        const contact = new Contact({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim(),
            subject: subject.trim(),
            message: message.trim(),
            category,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        });

        await contact.save();

        console.log(`📧 New contact message from ${email}: ${subject}`);

        res.status(201).json({
            success: true,
            message: 'Your message has been sent successfully. We will get back to you soon!',
            contactId: contact._id
        });

    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send message. Please try again later.'
        });
    }
});

// ==================== ADMIN ROUTES ====================

// Middleware for admin authentication (simple check)
const isAdmin = (req, res, next) => {
    // TODO: Implement proper admin authentication
    // For now, we'll allow all requests
    next();
};

// GET - Get all contacts with filtering and pagination (admin)
router.get('/admin', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const search = req.query.search || '';
        const status = req.query.status;
        const priority = req.query.priority;
        const category = req.query.category;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        // Build query
        const query = {};

        // Search in name, email, subject, message
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by status
        if (status && status !== 'all') {
            query.status = status;
        }

        // Filter by priority
        if (priority && priority !== 'all') {
            query.priority = priority;
        }

        // Filter by category
        if (category && category !== 'all') {
            query.category = category;
        }

        // Build sort object
        const sortObj = {};
        sortObj[sortBy] = sortOrder;

        // Get contacts
        const contacts = await Contact.find(query)
            .populate('respondedBy', 'fullName username email')
            .sort(sortObj)
            .skip(skip)
            .limit(limit);

        const total = await Contact.countDocuments(query);

        res.json({
            success: true,
            data: contacts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching contacts'
        });
    }
});

// GET - Get contact statistics (admin)
router.get('/admin/stats', isAdmin, async (req, res) => {
    try {
        const totalContacts = await Contact.countDocuments();
        const pendingContacts = await Contact.countDocuments({ status: 'pending' });
        const readContacts = await Contact.countDocuments({ status: 'read' });
        const repliedContacts = await Contact.countDocuments({ status: 'replied' });
        const resolvedContacts = await Contact.countDocuments({ status: 'resolved' });

        // Get contacts by priority
        const highPriorityContacts = await Contact.countDocuments({ priority: 'high' });
        const urgentContacts = await Contact.countDocuments({ priority: 'urgent' });

        // Get contacts by category
        const categoryStats = await Contact.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get recent contacts (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentContacts = await Contact.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });

        res.json({
            success: true,
            data: {
                totalContacts,
                pendingContacts,
                readContacts,
                repliedContacts,
                resolvedContacts,
                highPriorityContacts,
                urgentContacts,
                recentContacts,
                categoryStats: categoryStats.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error('Error fetching contact stats:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching contact statistics'
        });
    }
});

// GET - Get single contact (admin)
router.get('/admin/:id', isAdmin, async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id)
            .populate('respondedBy', 'fullName username email');

        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found'
            });
        }

        // Mark as read if still pending
        if (contact.status === 'pending') {
            contact.status = 'read';
            await contact.save();
        }

        res.json({
            success: true,
            data: contact
        });

    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching contact'
        });
    }
});

// PUT - Update contact status/priority (admin)
router.put('/admin/:id', isAdmin, async (req, res) => {
    try {
        const { status, priority, category, adminResponse } = req.body;
        
        const updateData = {};
        if (status !== undefined) updateData.status = status;
        if (priority !== undefined) updateData.priority = priority;
        if (category !== undefined) updateData.category = category;
        if (adminResponse !== undefined) {
            updateData.adminResponse = adminResponse;
            updateData.respondedAt = new Date();
            // TODO: Set respondedBy to actual admin user ID
            // updateData.respondedBy = req.userId;
        }

        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('respondedBy', 'fullName username email');

        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found'
            });
        }

        res.json({
            success: true,
            data: contact,
            message: 'Contact updated successfully'
        });

    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({
            success: false,
            error: 'Error updating contact'
        });
    }
});

// DELETE - Delete contact (admin)
router.delete('/admin/:id', isAdmin, async (req, res) => {
    try {
        const contact = await Contact.findByIdAndDelete(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found'
            });
        }

        res.json({
            success: true,
            message: 'Contact deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({
            success: false,
            error: 'Error deleting contact'
        });
    }
});

// PUT - Bulk update contacts (admin)
router.put('/admin/bulk/update', isAdmin, async (req, res) => {
    try {
        const { contactIds, updates } = req.body;

        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Contact IDs array is required'
            });
        }

        const result = await Contact.updateMany(
            { _id: { $in: contactIds } },
            { $set: updates }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} contacts updated successfully`,
            modified: result.modifiedCount
        });

    } catch (error) {
        console.error('Error bulk updating contacts:', error);
        res.status(500).json({
            success: false,
            error: 'Error updating contacts'
        });
    }
});

module.exports = router;