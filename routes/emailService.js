const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendWelcomeEmail = async (to, name) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Welcome to Travel Explorer!',
    text: `Dear ${name},\n\nWelcome to Travel Explorer! We're excited to have you on board.\n\nBest regards,\nTravel Explorer Team`,
  };
  await transporter.sendMail(mailOptions);
};

const sendOtpEmail = async (to, name, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your OTP for Travel Explorer',
    text: `Dear ${name},\n\nYour OTP is ${otp}. It is valid for 10 minutes.\n\nBest regards,\nTravel Explorer Team`,
  };
  await transporter.sendMail(mailOptions);
};

const sendResetEmail = async (to, resetUrl) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nBest regards,\nTravel Explorer Team`,
  };
  await transporter.sendMail(mailOptions);
};

module.exports = { sendWelcomeEmail, sendOtpEmail, sendResetEmail };