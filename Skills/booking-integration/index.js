/**
 * booking-integration — Self-scheduling for pool fence estimates
 *
 * Generates booking links and manages availability windows.
 * Works with Calendly, Cal.com, or a simple built-in scheduler.
 * Sends confirmation SMS after booking.
 */

const fs = require('fs');
const path = require('path');

const BOOKINGS_FILE = path.resolve(__dirname, 'bookings.json');
const CALENDLY_URL = process.env.CALENDLY_URL || '';
const CALCOM_URL = process.env.CALCOM_URL || '';

// Default availability: Mon-Sat, 8AM-5PM
const DEFAULT_AVAILABILITY = {
  days: [1, 2, 3, 4, 5, 6], // Mon-Sat
  startHour: 8,
  endHour: 17,
  slotDurationMinutes: 60,
  bufferMinutes: 30,
};

function loadBookings() {
  try { return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8')); } catch (_) { return []; }
}

function saveBookings(data) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(data, null, 2));
}

/**
 * Get the booking URL (Calendly, Cal.com, or built-in).
 */
function getBookingUrl() {
  if (CALENDLY_URL) return { type: 'calendly', url: CALENDLY_URL };
  if (CALCOM_URL) return { type: 'calcom', url: CALCOM_URL };
  return { type: 'built-in', url: null };
}

/**
 * Generate available time slots for a given date.
 */
function getAvailableSlots(date, availability = DEFAULT_AVAILABILITY) {
  const d = new Date(date);
  const dayOfWeek = d.getDay();

  if (!availability.days.includes(dayOfWeek)) {
    return { success: true, slots: [], message: 'No availability on this day.' };
  }

  const bookings = loadBookings();
  const dateStr = d.toISOString().split('T')[0];

  // Get existing bookings for this date
  const bookedSlots = bookings
    .filter((b) => b.date === dateStr && b.status !== 'cancelled')
    .map((b) => b.time);

  const slots = [];
  for (let h = availability.startHour; h < availability.endHour; h++) {
    const timeStr = `${h.toString().padStart(2, '0')}:00`;
    if (!bookedSlots.includes(timeStr)) {
      const label = new Date(2000, 0, 1, h).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      slots.push({ time: timeStr, label });
    }
  }

  return { success: true, slots, date: dateStr };
}

/**
 * Book an estimate appointment.
 */
function bookEstimate(params) {
  const { name, phone, email, date, time, address, notes } = params;

  if (!name || !phone || !date || !time) {
    return { success: false, error: 'Name, phone, date, and time are required.' };
  }

  const bookings = loadBookings();

  // Check for conflicts
  const conflict = bookings.find(
    (b) => b.date === date && b.time === time && b.status !== 'cancelled'
  );
  if (conflict) {
    return { success: false, error: `${date} at ${time} is already booked.` };
  }

  const booking = {
    id: `bk_${Date.now()}`,
    name,
    phone,
    email: email || null,
    date,
    time,
    address: address || '',
    notes: notes || '',
    status: 'confirmed', // confirmed | completed | cancelled | no-show
    createdAt: new Date().toISOString(),
    source: 'bot',
  };

  bookings.push(booking);
  saveBookings(bookings);

  return {
    success: true,
    booking,
    message: `Estimate booked: ${name} on ${date} at ${time}`,
  };
}

/**
 * Get upcoming bookings.
 */
function getUpcomingBookings(daysAhead = 7) {
  const bookings = loadBookings();
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const today = now.toISOString().split('T')[0];
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return bookings.filter(
    (b) => b.status === 'confirmed' && b.date >= today && b.date <= cutoffStr
  ).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

/**
 * Cancel a booking.
 */
function cancelBooking(bookingId) {
  const bookings = loadBookings();
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) return { success: false, error: 'Booking not found.' };

  booking.status = 'cancelled';
  saveBookings(bookings);
  return { success: true, message: `Booking cancelled for ${booking.name} on ${booking.date}.` };
}

/**
 * Format booking link message for leads.
 */
function getBookingMessage(name) {
  const link = getBookingUrl();
  if (link.url) {
    return `Hi ${name}! Book your free pool fence estimate here: ${link.url}`;
  }
  return `Hi ${name}! Reply with a day and time that works for your free pool fence estimate and we'll get you on the schedule!`;
}

/**
 * Format upcoming bookings for Telegram.
 */
function formatUpcomingBookings() {
  const upcoming = getUpcomingBookings();
  if (upcoming.length === 0) return 'No upcoming estimate appointments.';

  const lines = upcoming.map((b) => {
    const d = new Date(b.date + 'T12:00:00');
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `  ${dayLabel} ${b.time} — ${b.name} (${b.phone})${b.address ? '\n    ' + b.address : ''}`;
  });

  return `Upcoming Estimates\n\n${lines.join('\n\n')}`;
}

module.exports = {
  getBookingUrl,
  getAvailableSlots,
  bookEstimate,
  getUpcomingBookings,
  cancelBooking,
  getBookingMessage,
  formatUpcomingBookings,
};
