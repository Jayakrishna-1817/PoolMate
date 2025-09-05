const nodemailer = require("nodemailer");

// Email transporter configuration (using existing PoolMate credentials)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "poolmate2025@gmail.com",
    pass: "xwdg fjej qmgb oqmi", 
  },
});

/**
 * Send email notification to driver when a rider sends a ride request
 * @param {Object} riderDetails - Details of the rider making the request
 * @param {Object} driverDetails - Details of the driver receiving the request
 * @param {Object} rideDetails - Details of the ride request
 */
async function sendRideRequestNotification(riderDetails, driverDetails, rideDetails) {
  try {
    const mailOptions = {
      from: '"PoolMate" <poolmate2025@gmail.com>',
      to: driverDetails.email,
      subject: `New Ride Request from ${riderDetails.firstName} ${riderDetails.lastName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .rider-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
            .ride-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #6b7280; }
            .button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 5px; }
            .button:hover { background: #059669; }
            .button.secondary { background: #6b7280; }
            .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 14px; }
            .emergency-contact { background: #fef3c7; padding: 10px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #f59e0b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚗 New Ride Request</h1>
              <p>You have received a new ride request on PoolMate!</p>
            </div>
            
            <div class="content">
              <div class="rider-info">
                <h3>👤 Rider Information</h3>
                <div class="info-row">
                  <span class="label">Name:</span>
                  <span class="value">${riderDetails.firstName} ${riderDetails.lastName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Phone:</span>
                  <span class="value">${riderDetails.phone}</span>
                </div>
                <div class="info-row">
                  <span class="label">Email:</span>
                  <span class="value">${riderDetails.email}</span>
                </div>
                <div class="info-row">
                  <span class="label">City:</span>
                  <span class="value">${riderDetails.city || 'Not specified'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Rating:</span>
                  <span class="value">⭐ ${riderDetails.rating?.average || 'New User'}</span>
                </div>
                ${riderDetails.emergencyContact ? `
                <div class="emergency-contact">
                  <strong>Emergency Contact:</strong><br>
                  ${riderDetails.emergencyContact.name} - ${riderDetails.emergencyContact.phone}
                </div>
                ` : ''}
              </div>

              <div class="ride-details">
                <h3>🗺️ Ride Details</h3>
                <div class="info-row">
                  <span class="label">From:</span>
                  <span class="value">${rideDetails.pickup.address || rideDetails.pickup}</span>
                </div>
                <div class="info-row">
                  <span class="label">To:</span>
                  <span class="value">${rideDetails.destination.address || rideDetails.destination}</span>
                </div>
                <div class="info-row">
                  <span class="label">Requested Date:</span>
                  <span class="value">${rideDetails.requestedDate ? new Date(rideDetails.requestedDate).toLocaleDateString() : 'ASAP'}</span>
                </div>
                <div class="info-row">
                  <span class="label">Passengers:</span>
                  <span class="value">${rideDetails.passengers || 1} passenger(s)</span>
                </div>
                <div class="info-row">
                  <span class="label">Estimated Fare:</span>
                  <span class="value">₹${rideDetails.estimatedFare || 'To be discussed'}</span>
                </div>
                ${rideDetails.riderNotes ? `
                <div class="info-row">
                  <span class="label">Message:</span>
                  <span class="value">"${rideDetails.riderNotes}"</span>
                </div>
                ` : ''}
              </div>

              <div style="text-align: center; margin: 20px 0;">
                <a href="http://localhost:3000/dlogin" class="button">Accept Request</a>
                <a href="http://localhost:3000/dlogin" class="button secondary">View Dashboard</a>
              </div>

              <div class="footer">
                <p>Please respond to this request as soon as possible.</p>
                <p>You can manage all your ride requests from your driver dashboard.</p>
                <p>© 2025 PoolMate - Making carpooling easier and safer</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      // Plain text version for email clients that don't support HTML
      text: `
New Ride Request from ${riderDetails.firstName} ${riderDetails.lastName}

RIDER INFORMATION:
- Name: ${riderDetails.firstName} ${riderDetails.lastName}
- Phone: ${riderDetails.phone}
- Email: ${riderDetails.email}
- City: ${riderDetails.city || 'Not specified'}
- Rating: ${riderDetails.rating?.average || 'New User'}

RIDE DETAILS:
- From: ${rideDetails.pickup.address || rideDetails.pickup}
- To: ${rideDetails.destination.address || rideDetails.destination}
- Date: ${rideDetails.requestedDate ? new Date(rideDetails.requestedDate).toLocaleDateString() : 'ASAP'}
- Passengers: ${rideDetails.passengers || 1}
- Estimated Fare: ₹${rideDetails.estimatedFare || 'To be discussed'}
${rideDetails.riderNotes ? `- Message: "${rideDetails.riderNotes}"` : ''}

Please log in to your PoolMate driver dashboard to respond to this request.
Visit: http://localhost:3000/dlogin

© 2025 PoolMate
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Ride request notification sent to driver ${driverDetails.email}`);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error(`❌ Failed to send ride request notification:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Send confirmation email to rider when request is sent
 * @param {Object} riderDetails - Details of the rider
 * @param {Object} driverDetails - Details of the driver
 * @param {Object} rideDetails - Details of the ride request
 */
async function sendRideRequestConfirmation(riderDetails, driverDetails, rideDetails) {
  try {
    const mailOptions = {
      from: '"PoolMate" <poolmate2025@gmail.com>',
      to: riderDetails.email,
      subject: `Ride Request Sent to ${driverDetails.firstName} ${driverDetails.lastName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .confirmation { background: #dcfce7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #22c55e; }
            .driver-info { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #6b7280; }
            .footer { text-align: center; margin-top: 20px; color: #9ca3af; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Request Sent Successfully</h1>
              <p>Your ride request has been sent to the driver!</p>
            </div>
            
            <div class="content">
              <div class="confirmation">
                <h3>🎉 Request Confirmation</h3>
                <p>Your ride request has been successfully sent to <strong>${driverDetails.firstName} ${driverDetails.lastName}</strong>.</p>
                <p>You will receive a notification once the driver responds to your request.</p>
              </div>

              <div class="driver-info">
                <h3>🚗 Driver Information</h3>
                <div class="info-row">
                  <span class="label">Name:</span>
                  <span class="value">${driverDetails.firstName} ${driverDetails.lastName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Phone:</span>
                  <span class="value">${driverDetails.phone}</span>
                </div>
                <div class="info-row">
                  <span class="label">City:</span>
                  <span class="value">${driverDetails.city || 'Not specified'}</span>
                </div>
              </div>

              <div class="footer">
                <p>Track your request status from your rider dashboard.</p>
                <p>© 2025 PoolMate - Making carpooling easier and safer</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Ride request confirmation sent to rider ${riderDetails.email}`);
    return { success: true, messageId: result.messageId };

  } catch (error) {
    console.error(`❌ Failed to send ride request confirmation:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendRideRequestNotification,
  sendRideRequestConfirmation
};
