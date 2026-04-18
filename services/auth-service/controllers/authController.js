const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user.id);
    delete user.password;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: { user },
    });
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

exports.signup = async (req, res) => {
    try {
        const { username, email, password } = req.body || {};

        if (!username || !email || !password) {
            return res.status(400).json({ status: 'fail', message: 'Username, email, and password are required.' });
        }
        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({ status: 'fail', message: 'Please provide a valid email address.' });
        }
        if (!USERNAME_RE.test(username)) {
            return res.status(400).json({ status: 'fail', message: 'Username must be 3–32 characters (letters, numbers, . _ -).' });
        }
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ status: 'fail', message: 'Password must be at least 8 characters.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const { data: newUser, error } = await req.supabase
            .from('users')
            .insert([{ username, email: email.toLowerCase(), password: hashedPassword }])
            .select()
            .single();

        if (error) {
            console.error('[auth.signup]', error);
            const msg = (error.message || '').toLowerCase();
            if (msg.includes('duplicate') || msg.includes('unique')) {
                // Don't reveal which field collided — prevents account enumeration.
                return res.status(409).json({ status: 'fail', message: 'That username or email is already in use.' });
            }
            return res.status(400).json({ status: 'fail', message: 'Signup failed. Please try again.' });
        }

        createSendToken(newUser, 201, res);
    } catch (err) {
        console.error('[auth.signup]', err);
        res.status(500).json({ status: 'fail', message: 'Signup failed. Please try again.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ status: 'fail', message: 'Please provide email and password.' });
        }

        const { data: user } = await req.supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ status: 'fail', message: 'Incorrect email or password.' });
        }

        createSendToken(user, 200, res);
    } catch (err) {
        console.error('[auth.login]', err);
        res.status(500).json({ status: 'fail', message: 'Login failed. Please try again.' });
    }
};

exports.protect = async (req, res, next) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                status: 'fail',
                message: 'You are not logged in! Please log in to get access.',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { data: currentUser, error } = await req.supabase
            .from('users')
            .select('*')
            .eq('id', decoded.id)
            .single();

        if (!currentUser) {
            return res.status(401).json({
                status: 'fail',
                message: 'Session expired. Please log in again.',
            });
        }

        delete currentUser.password;
        req.user = currentUser;
        next();
    } catch (err) {
        res.status(401).json({
            status: 'fail',
            message: 'Session expired. Please log in again.',
        });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const { error } = await req.supabase
            .from('users')
            .delete()
            .eq('id', req.user.id);

        if (error) {
            console.error('[auth.deleteAccount]', error);
            return res.status(400).json({ status: 'fail', message: 'Could not delete account.' });
        }

        res.status(204).end();
    } catch (err) {
        console.error('[auth.deleteAccount]', err);
        res.status(500).json({ status: 'fail', message: 'Could not delete account.' });
    }
};
