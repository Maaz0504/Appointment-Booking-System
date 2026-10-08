require('dotenv').config();
const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const MINIMOTH_API_KEY = process.env.MINIMOTH_API_KEY || '';
const MINIMOTH_BASE_URL = process.env.MINIMOTH_BASE_URL || 'https://api.minimoth.dev';

// Essential middleware
app.use(express.json());

// Lightweight CORS headers without extra library
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Helper: check if real Minimoth API key is configured
function isRealKey(key) {
  return Boolean(key && key.trim() && !key.includes('your_minimoth_api_key'));
}

// ==========================================
// 5 BACKEND API ENDPOINTS
// ==========================================

// 1. POST /api/auth/send-otp (Send OTP via Minimoth)
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || typeof phone !== 'string' || phone.trim().length < 10) {
      return res.status(400).json({ error: 'A valid phone number (at least 10 digits) is required.' });
    }

    const cleanPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/^0+/, '')}`;

    if (!isRealKey(MINIMOTH_API_KEY)) {
      console.log(`[Minimoth Demo Mode] Send OTP request for ${cleanPhone}. Key not configured; use test OTP: 123456`);
      return res.json({
        success: true,
        message: 'OTP sent! (Workshop Demo Mode: use 123456 to verify)',
        devMode: true,
        testOtp: '123456',
        phone: cleanPhone
      });
    }

    // Call real Minimoth API
    const response = await fetch(`${MINIMOTH_BASE_URL}/v1/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': MINIMOTH_API_KEY
      },
      body: JSON.stringify({ phone: cleanPhone })
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data.error || data.message || 'Failed to send OTP via Minimoth';
      return res.status(response.status).json({ error: errMsg });
    }

    return res.json({
      success: true,
      message: 'OTP sent successfully to your WhatsApp / SMS!',
      otpId: data.otp_id || null,
      phone: cleanPhone
    });
  } catch (err) {
    console.error('Error sending OTP:', err);
    return res.status(500).json({ error: 'Internal server error while sending OTP.' });
  }
});

// 2. POST /api/auth/verify-otp (Verify OTP via Minimoth & Register/Login User)
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, code, name } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'Both phone and 6-digit OTP code are required.' });
    }

    const cleanPhone = phone.trim().startsWith('+') ? phone.trim() : `+91${phone.trim().replace(/^0+/, '')}`;
    const cleanCode = String(code).trim();

    let verified = false;

    if (!isRealKey(MINIMOTH_API_KEY)) {
      // Demo mode verification
      if (cleanCode === '123456') {
        verified = true;
      } else {
        return res.status(400).json({ error: 'Invalid OTP code. In workshop demo mode, use 123456.' });
      }
    } else {
      // Call real Minimoth API
      const response = await fetch(`${MINIMOTH_BASE_URL}/v1/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': MINIMOTH_API_KEY
        },
        body: JSON.stringify({ phone: cleanPhone, code: cleanCode })
      });

      const data = await response.json();
      if (!response.ok) {
        const errMsg = data.error || data.message || 'Invalid or expired OTP code.';
        return res.status(response.status).json({ error: errMsg });
      }
      verified = true;
    }

    if (verified) {
      // Find or create user in SQLite database (User Entity)
      let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
      const userName = (name && name.trim()) ? name.trim() : 'Patient';

      if (!user) {
        const info = db.prepare('INSERT INTO users (phone, name) VALUES (?, ?)').run(cleanPhone, userName);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      } else if (name && name.trim() && user.name !== name.trim()) {
        db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), user.id);
        user.name = name.trim();
      }

      return res.json({
        success: true,
        message: 'OTP verified successfully.',
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          createdAt: user.created_at
        },
        token: `token_${user.id}_${Date.now()}`
      });
    }
  } catch (err) {
    console.error('Error verifying OTP:', err);
    return res.status(500).json({ error: 'Internal server error while verifying OTP.' });
  }
});

// 3. GET /api/services (List available services)
app.get('/api/services', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services ORDER BY id ASC').all();
    return res.json(services);
  } catch (err) {
    console.error('Error fetching services:', err);
    return res.status(500).json({ error: 'Failed to retrieve services.' });
  }
});

// 4. POST /api/appointments (Book new appointment or Cancel existing)
app.post('/api/appointments', (req, res) => {
  try {
    const { action, appointmentId, userId, serviceId, appointmentDate, timeSlot, notes } = req.body;

    // Sub-action: Cancel appointment
    if (action === 'cancel') {
      if (!appointmentId || !userId) {
        return res.status(400).json({ error: 'appointmentId and userId are required to cancel.' });
      }
      const info = db.prepare(
        "UPDATE appointments SET status = 'Cancelled' WHERE id = ? AND user_id = ?"
      ).run(Number(appointmentId), Number(userId));

      if (info.changes === 0) {
        return res.status(404).json({ error: 'Appointment not found or unauthorized.' });
      }
      return res.json({ success: true, message: 'Appointment cancelled successfully.' });
    }

    // Default action: Book new appointment
    if (!userId || !serviceId || !appointmentDate || !timeSlot) {
      return res.status(400).json({ error: 'User ID, Service, Appointment Date, and Time Slot are required.' });
    }

    // Validate User exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(Number(userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please log in again.' });
    }

    // Validate Service exists
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(Number(serviceId));
    if (!service) {
      return res.status(404).json({ error: 'Selected service does not exist.' });
    }

    const info = db.prepare(`
      INSERT INTO appointments (user_id, service_id, appointment_date, time_slot, notes, status)
      VALUES (?, ?, ?, ?, ?, 'Confirmed')
    `).run(Number(userId), Number(serviceId), String(appointmentDate), String(timeSlot), notes ? String(notes).trim() : '');

    const newAppointment = db.prepare(`
      SELECT a.*, s.name as service_name, s.price, s.duration_minutes
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.id = ?
    `).get(info.lastInsertRowid);

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      appointment: newAppointment
    });
  } catch (err) {
    console.error('Error handling appointment:', err);
    return res.status(500).json({ error: 'Failed to process appointment.' });
  }
});

// 5. GET /api/appointments (Get appointments for authenticated user)
app.get('/api/appointments', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required.' });
    }

    const appointments = db.prepare(`
      SELECT 
        a.id, 
        a.user_id, 
        a.service_id, 
        a.appointment_date, 
        a.time_slot, 
        a.status, 
        a.notes, 
        a.created_at,
        s.name as service_name, 
        s.price, 
        s.duration_minutes
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.user_id = ?
      ORDER BY a.appointment_date DESC, a.time_slot DESC
    `).all(Number(userId));

    return res.json(appointments);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    return res.status(500).json({ error: 'Failed to retrieve appointments.' });
  }
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Appointment Booking Backend running on http://localhost:${PORT}`);
  console.log(`Minimoth API Status: ${isRealKey(MINIMOTH_API_KEY) ? 'Configured with API Key' : 'Demo Mode (Use OTP: 123456)'}`);
});
