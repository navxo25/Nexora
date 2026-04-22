import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

export async function sendOTPEmail(email, otp) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: 'Your Nexora OTP Code',
      html: `
        <h2>Nexora Verification Code</h2>
        <p>Your OTP code is:</p>
        <h1>${otp}</h1>
        <p>This code expires in 5 minutes.</p>
      `
    });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

export async function sendComplaintNotification(email, complaint) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: `Complaint #${complaint.id} Status Update`,
      html: `
        <h2>Your Complaint has been updated</h2>
        <p><strong>Title:</strong> ${complaint.title}</p>
        <p><strong>Status:</strong> ${complaint.status}</p>
        <p><strong>Track ID:</strong> ${complaint.id}</p>
      `
    });
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}
