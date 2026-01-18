require('dotenv').config();

const sendPasswordResetEmail = async (email, username, token) => {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetLink = `${baseUrl}/reset-password/${token}`;

  console.log("----------------------------------------------------------------");
  console.log("🔑 PASSWORD RESET LINK (Dev Mode):");
  console.log(`To: ${email}`);
  console.log(`Link: ${resetLink}`);
  console.log("----------------------------------------------------------------");

  // Logic to successfully "send" the email without Resend
  return true;
};

module.exports = { sendPasswordResetEmail };
