const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '90d',
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user.id);

    // Remove password from output
    delete user.password;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
    });
};

exports.signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Hash password manually since we don't have mongoose middleware
        const hashedPassword = await bcrypt.hash(password, 12);

        const { data: newUser, error } = await req.supabase
            .from('users')
            .insert([{ username, email, password: hashedPassword }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        createSendToken(newUser, 201, res);
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide email and password!',
            });
        }

        const { data: user, error } = await req.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                status: 'fail',
                message: 'Incorrect email or password',
            });
        }

        createSendToken(user, 200, res);
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
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
                message: 'The user belonging to this token no longer exists.',
            });
        }

        req.user = currentUser;
        next();
    } catch (err) {
        res.status(401).json({
            status: 'fail',
            message: 'Invalid token. Please log in again!',
        });
    }
};
