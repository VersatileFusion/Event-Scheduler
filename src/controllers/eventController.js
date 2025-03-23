const Event = require('../models/Event');
const User = require('../models/User');
const moment = require('moment-timezone');
const logger = require('../utils/logger');
const { sendEventInvitation, sendEventReminder } = require('../utils/emailUtils');
const { generateEventICS, saveICSFile } = require('../utils/calendarUtils');

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event | ایجاد رویداد جدید
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startTime
 *               - endTime
 *               - timezone
 *             properties:
 *               title:
 *                 type: string
 *                 description: Event title | عنوان رویداد
 *               description:
 *                 type: string
 *                 description: Event description | توضیحات رویداد
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: Start time (ISO format) | زمان شروع (فرمت ISO)
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: End time (ISO format) | زمان پایان (فرمت ISO)
 *               timezone:
 *                 type: string
 *                 description: Event timezone | منطقه زمانی رویداد
 *               location:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [physical, virtual]
 *                     description: Location type | نوع مکان
 *                   address:
 *                     type: string
 *                     description: Address or meeting link | آدرس یا لینک جلسه
 *               attendees:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to invite | آرایه‌ای از شناسه‌های کاربران برای دعوت
 *               reminders:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     time:
 *                       type: string
 *                       format: date-time
 *                       description: When to send reminder | زمان ارسال یادآوری
 *                 description: Reminder settings | تنظیمات یادآوری
 *     responses:
 *       201:
 *         description: Event created successfully | رویداد با موفقیت ایجاد شد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid event data | اطلاعات رویداد نامعتبر است
 *       401:
 *         description: Not authorized | عدم دسترسی
 */
const createEvent = async (req, res) => {
  try {
    // Get event data from request
    const {
      title,
      description,
      startTime,
      endTime,
      timezone,
      location,
      attendees,
      reminders
    } = req.body;
    
    // Create event with current user as organizer
    const event = new Event({
      title,
      description,
      startTime,
      endTime,
      timezone,
      location,
      organizer: req.user._id,
      attendees: [],
      reminders: []
    });
    
    // Add attendees if provided
    if (attendees && attendees.length > 0) {
      // Validate attendees exist
      const attendeeUsers = await User.find({ _id: { $in: attendees } });
      const validAttendeeIds = attendeeUsers.map(user => user._id.toString());
      
      event.attendees = attendees
        .filter(id => validAttendeeIds.includes(id.toString()))
        .map(id => ({ user: id, status: 'pending' }));
      
      if (event.attendees.length !== attendees.length) {
        logger.warn(`Some attendees were not found when creating event: ${title}`);
        console.warn(`Some attendees were not found when creating event: ${title} | برخی از شرکت‌کنندگان هنگام ایجاد رویداد یافت نشدند: ${title}`);
      }
    }
    
    // Add reminders if provided
    if (reminders && reminders.length > 0) {
      event.reminders = reminders.map(r => ({
        time: r.time,
        sent: false
      }));
    }
    
    // Save event
    const savedEvent = await event.save();
    
    logger.info(`New event created: ${savedEvent.title} (${savedEvent._id})`);
    console.log(`New event created: ${savedEvent.title} (${savedEvent._id}) | رویداد جدید ایجاد شد: ${savedEvent.title} (${savedEvent._id})`);
    
    // Send invitations to attendees
    if (savedEvent.attendees.length > 0) {
      const organizer = await User.findById(req.user._id);
      
      // Send invitations asynchronously (don't await to avoid delaying response)
      savedEvent.attendees.forEach(async (attendee) => {
        const user = await User.findById(attendee.user);
        if (user) {
          sendEventInvitation(savedEvent, user, organizer)
            .then(success => {
              if (success) {
                logger.info(`Invitation sent to ${user.email} for event: ${savedEvent.title}`);
                console.log(`Invitation sent to ${user.email} for event: ${savedEvent.title} | دعوت‌نامه برای ${user.email} ارسال شد برای رویداد: ${savedEvent.title}`);
              }
            });
        }
      });
    }
    
    res.status(201).json(savedEvent);
  } catch (error) {
    logger.error('Error creating event', error);
    console.error(`Error creating event | خطا در ایجاد رویداد: ${error.message}`);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          en: 'Invalid event data',
          fa: 'اطلاعات رویداد نامعتبر است',
          details: error.message
        }
      });
    }
    
    res.status(500).json({
      error: {
        en: 'Server error while creating event',
        fa: 'خطای سرور هنگام ایجاد رویداد'
      }
    });
  }
};

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events for the user | دریافت همه رویدادهای کاربر
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD) | فیلتر بر اساس تاریخ شروع
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD) | فیلتر بر اساس تاریخ پایان
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [organizer, attendee, all]
 *         description: Filter by user role | فیلتر بر اساس نقش کاربر
 *     responses:
 *       200:
 *         description: List of events | لیست رویدادها
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       401:
 *         description: Not authorized | عدم دسترسی
 */
const getEvents = async (req, res) => {
  try {
    const { startDate, endDate, role = 'all' } = req.query;
    const userId = req.user._id;
    
    // Build query based on parameters
    let query = {};
    
    // Date filters
    if (startDate || endDate) {
      query.startTime = {};
      
      if (startDate) {
        const start = moment(startDate).startOf('day').toDate();
        query.startTime.$gte = start;
      }
      
      if (endDate) {
        const end = moment(endDate).endOf('day').toDate();
        if (query.startTime) {
          query.startTime.$lte = end;
        } else {
          query.startTime = { $lte: end };
        }
      }
    }
    
    // Role filters
    if (role === 'organizer') {
      query.organizer = userId;
    } else if (role === 'attendee') {
      query['attendees.user'] = userId;
    } else {
      // 'all' - both organizer and attendee
      query.$or = [
        { organizer: userId },
        { 'attendees.user': userId }
      ];
    }
    
    // Fetch events
    const events = await Event.find(query)
      .populate('organizer', 'name email')
      .populate('attendees.user', 'name email')
      .sort({ startTime: 1 });
    
    logger.info(`Retrieved ${events.length} events for user ${req.user.email}`);
    console.log(`Retrieved ${events.length} events for user ${req.user.email} | ${events.length} رویداد برای کاربر ${req.user.email} دریافت شد`);
    
    res.status(200).json(events);
  } catch (error) {
    logger.error('Error getting events', error);
    console.error(`Error getting events | خطا در دریافت رویدادها: ${error.message}`);
    res.status(500).json({
      error: {
        en: 'Server error while retrieving events',
        fa: 'خطای سرور هنگام دریافت رویدادها'
      }
    });
  }
};

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID | دریافت رویداد با شناسه
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID | شناسه رویداد
 *     responses:
 *       200:
 *         description: Event details | جزئیات رویداد
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found | رویداد یافت نشد
 *       401:
 *         description: Not authorized | عدم دسترسی
 */
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('attendees.user', 'name email');
    
    // Check if event exists
    if (!event) {
      logger.warn(`Event not found: ${req.params.id}`);
      console.warn(`Event not found: ${req.params.id} | رویداد یافت نشد: ${req.params.id}`);
      return res.status(404).json({
        error: {
          en: 'Event not found',
          fa: 'رویداد یافت نشد'
        }
      });
    }
    
    // Check if user has access to this event
    const userId = req.user._id.toString();
    const isOrganizer = event.organizer._id.toString() === userId;
    const isAttendee = event.attendees.some(a => a.user._id.toString() === userId);
    
    if (!isOrganizer && !isAttendee) {
      logger.warn(`Unauthorized access to event: ${req.params.id} by user: ${req.user.email}`);
      console.warn(`Unauthorized access to event: ${req.params.id} by user: ${req.user.email} | دسترسی غیرمجاز به رویداد: ${req.params.id} توسط کاربر: ${req.user.email}`);
      return res.status(403).json({
        error: {
          en: 'You do not have permission to access this event',
          fa: 'شما مجوز دسترسی به این رویداد را ندارید'
        }
      });
    }
    
    logger.info(`Event details retrieved: ${event.title} (${event._id})`);
    console.log(`Event details retrieved: ${event.title} (${event._id}) | جزئیات رویداد دریافت شد: ${event.title} (${event._id})`);
    
    res.status(200).json(event);
  } catch (error) {
    logger.error(`Error getting event: ${req.params.id}`, error);
    console.error(`Error getting event: ${req.params.id} | خطا در دریافت رویداد: ${req.params.id}: ${error.message}`);
    res.status(500).json({
      error: {
        en: 'Server error while retrieving event',
        fa: 'خطای سرور هنگام دریافت رویداد'
      }
    });
  }
};

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update an event | بروزرسانی رویداد
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID | شناسه رویداد
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               timezone:
 *                 type: string
 *               location:
 *                 type: object
 *               attendees:
 *                 type: array
 *                 items:
 *                   type: string
 *               reminders:
 *                 type: array
 *     responses:
 *       200:
 *         description: Event updated successfully | رویداد با موفقیت بروزرسانی شد
 *       400:
 *         description: Invalid event data | اطلاعات رویداد نامعتبر است
 *       404:
 *         description: Event not found | رویداد یافت نشد
 *       401:
 *         description: Not authorized | عدم دسترسی
 */
const updateEvent = async (req, res) => {
  try {
    // Find event
    let event = await Event.findById(req.params.id);
    
    // Check if event exists
    if (!event) {
      logger.warn(`Event not found for update: ${req.params.id}`);
      console.warn(`Event not found for update: ${req.params.id} | رویداد برای بروزرسانی یافت نشد: ${req.params.id}`);
      return res.status(404).json({
        error: {
          en: 'Event not found',
          fa: 'رویداد یافت نشد'
        }
      });
    }
    
    // Check if user is the organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      logger.warn(`Unauthorized update attempt for event: ${req.params.id} by user: ${req.user.email}`);
      console.warn(`Unauthorized update attempt for event: ${req.params.id} by user: ${req.user.email} | تلاش غیرمجاز برای بروزرسانی رویداد: ${req.params.id} توسط کاربر: ${req.user.email}`);
      return res.status(403).json({
        error: {
          en: 'Only the event organizer can update this event',
          fa: 'فقط برگزارکننده رویداد می‌تواند آن را بروزرسانی کند'
        }
      });
    }
    
    // Update fields if provided
    const {
      title,
      description,
      startTime,
      endTime,
      timezone,
      location,
      attendees,
      reminders
    } = req.body;
    
    // Basic fields
    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (startTime) event.startTime = startTime;
    if (endTime) event.endTime = endTime;
    if (timezone) event.timezone = timezone;
    if (location) event.location = location;
    
    // Update attendees if provided
    if (attendees && attendees.length > 0) {
      // Get existing attendees
      const existingAttendees = event.attendees.map(a => a.user.toString());
      
      // Validate new attendees exist
      const attendeeUsers = await User.find({ _id: { $in: attendees } });
      const validAttendeeIds = attendeeUsers.map(user => user._id.toString());
      
      // Find new attendees
      const newAttendees = validAttendeeIds.filter(id => !existingAttendees.includes(id));
      
      // Add new attendees
      if (newAttendees.length > 0) {
        const newAttendeeObjects = newAttendees.map(id => ({ user: id, status: 'pending' }));
        event.attendees = [...event.attendees, ...newAttendeeObjects];
        
        // Send invitations to new attendees
        const organizer = await User.findById(req.user._id);
        newAttendees.forEach(async (id) => {
          const user = await User.findById(id);
          if (user) {
            sendEventInvitation(event, user, organizer)
              .then(success => {
                if (success) {
                  logger.info(`Invitation sent to ${user.email} for updated event: ${event.title}`);
                  console.log(`Invitation sent to ${user.email} for updated event: ${event.title} | دعوت‌نامه برای ${user.email} ارسال شد برای رویداد به‌روزرسانی شده: ${event.title}`);
                }
              });
          }
        });
      }
      
      // Remove attendees who are not in the new list
      event.attendees = event.attendees.filter(a => 
        validAttendeeIds.includes(a.user.toString())
      );
    }
    
    // Update reminders if provided
    if (reminders) {
      event.reminders = reminders.map(r => ({
        time: r.time,
        sent: false
      }));
    }
    
    // Save updated event
    const updatedEvent = await event.save();
    
    logger.info(`Event updated: ${updatedEvent.title} (${updatedEvent._id})`);
    console.log(`Event updated: ${updatedEvent.title} (${updatedEvent._id}) | رویداد بروزرسانی شد: ${updatedEvent.title} (${updatedEvent._id})`);
    
    res.status(200).json(updatedEvent);
  } catch (error) {
    logger.error(`Error updating event: ${req.params.id}`, error);
    console.error(`Error updating event: ${req.params.id} | خطا در بروزرسانی رویداد: ${req.params.id}: ${error.message}`);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          en: 'Invalid event data',
          fa: 'اطلاعات رویداد نامعتبر است',
          details: error.message
        }
      });
    }
    
    res.status(500).json({
      error: {
        en: 'Server error while updating event',
        fa: 'خطای سرور هنگام بروزرسانی رویداد'
      }
    });
  }
};

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete an event | حذف رویداد
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID | شناسه رویداد
 *     responses:
 *       200:
 *         description: Event deleted successfully | رویداد با موفقیت حذف شد
 *       404:
 *         description: Event not found | رویداد یافت نشد
 *       401:
 *         description: Not authorized | عدم دسترسی
 */
const deleteEvent = async (req, res) => {
  try {
    // Find event
    const event = await Event.findById(req.params.id);
    
    // Check if event exists
    if (!event) {
      logger.warn(`Event not found for deletion: ${req.params.id}`);
      console.warn(`Event not found for deletion: ${req.params.id} | رویداد برای حذف یافت نشد: ${req.params.id}`);
      return res.status(404).json({
        error: {
          en: 'Event not found',
          fa: 'رویداد یافت نشد'
        }
      });
    }
    
    // Check if user is the organizer
    if (event.organizer.toString() !== req.user._id.toString()) {
      logger.warn(`Unauthorized deletion attempt for event: ${req.params.id} by user: ${req.user.email}`);
      console.warn(`Unauthorized deletion attempt for event: ${req.params.id} by user: ${req.user.email} | تلاش غیرمجاز برای حذف رویداد: ${req.params.id} توسط کاربر: ${req.user.email}`);
      return res.status(403).json({
        error: {
          en: 'Only the event organizer can delete this event',
          fa: 'فقط برگزارکننده رویداد می‌تواند آن را حذف کند'
        }
      });
    }
    
    // Delete event
    await event.remove();
    
    logger.info(`Event deleted: ${event.title} (${event._id})`);
    console.log(`Event deleted: ${event.title} (${event._id}) | رویداد حذف شد: ${event.title} (${event._id})`);
    
    res.status(200).json({
      message: {
        en: 'Event deleted successfully',
        fa: 'رویداد با موفقیت حذف شد'
      }
    });
  } catch (error) {
    logger.error(`Error deleting event: ${req.params.id}`, error);
    console.error(`Error deleting event: ${req.params.id} | خطا در حذف رویداد: ${req.params.id}: ${error.message}`);
    res.status(500).json({
      error: {
        en: 'Server error while deleting event',
        fa: 'خطای سرور هنگام حذف رویداد'
      }
    });
  }
};

/**
 * @swagger
 * /api/events/{id}/calendar:
 *   get:
 *     summary: Generate an ICS calendar file for the event | ایجاد فایل تقویم ICS برای رویداد
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID | شناسه رویداد
 *     responses:
 *       200:
 *         description: Calendar file generated | فایل تقویم ایجاد شد
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 *       404:
 *         description: Event not found | رویداد یافت نشد
 *       401:
 *         description: Not authorized | عدم دسترسی
 */
const generateEventCalendar = async (req, res) => {
  try {
    // Find event
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'name email');
    
    // Check if event exists
    if (!event) {
      logger.warn(`Event not found for calendar generation: ${req.params.id}`);
      console.warn(`Event not found for calendar generation: ${req.params.id} | رویداد برای ساخت تقویم یافت نشد: ${req.params.id}`);
      return res.status(404).json({
        error: {
          en: 'Event not found',
          fa: 'رویداد یافت نشد'
        }
      });
    }
    
    // Check if user has access to this event
    const userId = req.user._id.toString();
    const isOrganizer = event.organizer._id.toString() === userId;
    const isAttendee = event.attendees.some(a => a.user.toString() === userId);
    
    if (!isOrganizer && !isAttendee) {
      logger.warn(`Unauthorized calendar access for event: ${req.params.id} by user: ${req.user.email}`);
      console.warn(`Unauthorized calendar access for event: ${req.params.id} by user: ${req.user.email} | دسترسی غیرمجاز به تقویم برای رویداد: ${req.params.id} توسط کاربر: ${req.user.email}`);
      return res.status(403).json({
        error: {
          en: 'You do not have permission to access this event',
          fa: 'شما مجوز دسترسی به این رویداد را ندارید'
        }
      });
    }
    
    // Generate ICS content
    const { error, value: icsContent } = await generateEventICS(event);
    
    if (error || !icsContent) {
      logger.error(`Error generating ICS for event: ${event._id}`, error);
      console.error(`Error generating ICS for event: ${event._id} | خطا در ایجاد ICS برای رویداد: ${event._id}: ${error?.message || 'Unknown error'}`);
      return res.status(500).json({
        error: {
          en: 'Failed to generate calendar file',
          fa: 'ایجاد فایل تقویم ناموفق بود'
        }
      });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${event.title.replace(/[^a-z0-9]/gi, '_')}.ics"`);
    
    logger.info(`Calendar file generated for event: ${event.title} (${event._id})`);
    console.log(`Calendar file generated for event: ${event.title} (${event._id}) | فایل تقویم برای رویداد ایجاد شد: ${event.title} (${event._id})`);
    
    res.send(icsContent);
  } catch (error) {
    logger.error(`Error generating calendar for event: ${req.params.id}`, error);
    console.error(`Error generating calendar for event: ${req.params.id} | خطا در ایجاد تقویم برای رویداد: ${req.params.id}: ${error.message}`);
    res.status(500).json({
      error: {
        en: 'Server error while generating calendar',
        fa: 'خطای سرور هنگام ایجاد تقویم'
      }
    });
  }
};

/**
 * @swagger
 * /api/events/{id}/rsvp:
 *   post:
 *     summary: Respond to an event invitation | پاسخ به دعوت رویداد
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID | شناسه رویداد
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, declined, tentative]
 *                 description: RSVP response | پاسخ شرکت‌کننده
 *     responses:
 *       200:
 *         description: RSVP updated successfully | پاسخ با موفقیت به‌روزرسانی شد
 *       404:
 *         description: Event not found or user not invited | رویداد یافت نشد یا کاربر دعوت نشده است
 *       401:
 *         description: Not authorized | عدم دسترسی
 */
const respondToInvitation = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { status } = req.body;
    const userId = req.user._id;
    
    // Validate status
    if (!['accepted', 'declined', 'tentative'].includes(status)) {
      return res.status(400).json({
        error: {
          en: 'Invalid status. Must be one of: accepted, declined, tentative',
          fa: 'وضعیت نامعتبر. باید یکی از موارد زیر باشد: accepted, declined, tentative'
        }
      });
    }
    
    // Find event
    const event = await Event.findById(eventId);
    
    // Check if event exists
    if (!event) {
      logger.warn(`Event not found for RSVP: ${eventId}`);
      console.warn(`Event not found for RSVP: ${eventId} | رویداد برای پاسخ یافت نشد: ${eventId}`);
      return res.status(404).json({
        error: {
          en: 'Event not found',
          fa: 'رویداد یافت نشد'
        }
      });
    }
    
    // Check if user is an attendee
    const attendeeIndex = event.attendees.findIndex(a => a.user.toString() === userId.toString());
    
    if (attendeeIndex === -1) {
      logger.warn(`User ${req.user.email} not invited to event: ${eventId}`);
      console.warn(`User ${req.user.email} not invited to event: ${eventId} | کاربر ${req.user.email} به رویداد دعوت نشده است: ${eventId}`);
      return res.status(404).json({
        error: {
          en: 'You are not invited to this event',
          fa: 'شما به این رویداد دعوت نشده‌اید'
        }
      });
    }
    
    // Update attendee status
    event.attendees[attendeeIndex].status = status;
    
    // Save event
    await event.save();
    
    logger.info(`User ${req.user.email} responded ${status} to event: ${event.title}`);
    console.log(`User ${req.user.email} responded ${status} to event: ${event.title} | کاربر ${req.user.email} پاسخ ${status} به رویداد داد: ${event.title}`);
    
    res.status(200).json({
      message: {
        en: `You have ${status} the invitation`,
        fa: `شما دعوت را ${status === 'accepted' ? 'پذیرفتید' : status === 'declined' ? 'نپذیرفتید' : 'به صورت احتمالی پذیرفتید'}`
      },
      status
    });
  } catch (error) {
    logger.error(`Error responding to invitation: ${req.params.id}`, error);
    console.error(`Error responding to invitation: ${req.params.id} | خطا در پاسخ به دعوت: ${req.params.id}: ${error.message}`);
    res.status(500).json({
      error: {
        en: 'Server error while updating RSVP',
        fa: 'خطای سرور هنگام به‌روزرسانی پاسخ'
      }
    });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  generateEventCalendar,
  respondToInvitation
}; 