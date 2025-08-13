// utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'subramanyamsiliveri@gmail.com',
    pass: 'yuya jsfy kdxt cpeh',
  },
});

const sendMail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"RBAC System" <${'subramanyamsiliveri@gmail.coom'}>`,
    to,
    subject,
    html,
  };
  return transporter.sendMail(mailOptions);
};

module.exports = sendMail;
