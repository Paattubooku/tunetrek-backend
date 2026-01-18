const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const { JWT_SECRET } = require("../config");
const supabase = require("../config/supabaseClient");
const { sendPasswordResetEmail } = require('../utils/emailService');

exports.register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .or(`username.eq.${username},email.eq.${email}`)
            .maybeSingle();

        if (existingUser) {
            if (existingUser.username === username) return res.status(400).json({ error: "Username taken" });
            if (existingUser.email === email) return res.status(400).json({ error: "Email already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{ username, email, password: hashedPassword }])
            .select();

        if (insertError) throw new Error(insertError.message);

        res.json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !user) return res.status(400).json({ error: "Invalid username or password" });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid username or password" });

        // Generate Token
        // payload: userId matches the UUID from supabase
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });

        // Return user data (excluding password)
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            message: "Login successful",
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        if (error) throw error;

        // Security: Don't reveal if user doesn't exist
        if (!user) return res.json({ message: "If an account exists, a reset link has been sent." });

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await supabase
            .from('users')
            .update({
                reset_token: resetToken,
                reset_token_expires: tokenExpires
            })
            .eq('id', user.id);

        const emailSent = await sendPasswordResetEmail(email, user.username, resetToken);

        // Log for development even if email failed (since we print to console)
        if (!emailSent) {
            console.log("Failed to send reset email (simulated in dev)");
        }

        res.json({ message: "If an account exists, a reset link has been sent." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('reset_token', token)
            .gt('reset_token_expires', new Date().toISOString())
            .single();

        if (error || !user) return res.status(400).json({ error: "Invalid or expired reset token" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await supabase
            .from('users')
            .update({
                password: hashedPassword,
                reset_token: null,
                reset_token_expires: null
            })
            .eq('id', user.id);

        res.json({ message: "Password reset successful. Please login." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
