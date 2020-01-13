const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const db = require('../queries');
const dbUsers = require('../db-utils/db-user');



const getUserFriends = async (req, res, next) => {

    const { uid } = req.params;

    let friends;
    try {
        friends = await db.query(
            'SELECT u_id, username, profile_pic ' +
            'FROM users JOIN friends ON users.u_id = friends.two_id AND friends.one_id = $1',
            [uid]
        ); // not very descriptive column names (google many to many relationship)...
        friends = friends.rows;
    } catch (e) {
        return res.status(500).json({
            status: 'error',
            message: 'Failed to get friends'
        })
    }
    res.json({friends: friends.map(friend => friend)});
};



const getUsers = async (req, res, next) => {

    let users;
    try {
        users = await db.query('SELECT u_id, username, intraid, profile_pic FROM users');
        users = users.rows;
    } catch (e) {
        return console.log('ERROR: ' + e);
    }

    res.json({users: users.map(user => user)});
};



const getUserById = async (req, res, next) => {

    const userId = req.params.pid;

    let user;
    try {
        user = await db.query('SELECT id, username FROM users WHERE u_id = $1', [userId]);
        user = user.rows[0];
    } catch (e) {
        return console.log('ERROR: ' + e);
    }
    res.json({user: user});
};



const signUp = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid input.'
        })
    }

    const {username, password, intraId} = req.body;

    let existingUser;
    try {
        existingUser = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        existingUser = existingUser.rows[0]; // can't do db.query().rows[0] directly
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: 'error',
            message: 'Sign up failed, please try again later.'
        });
    }

    if (existingUser) {
        return res.status(401).json({
            status: 'error',
            message: 'User already exists'
        })
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(password, 10);
    } catch (e) {
        return res.status(500).json({
            status: 'error',
            message: 'Sign up failed, please try again later.'
        })
    }

    let createdUser = {
        username,
        intraId,
        hashedPassword,
    };

    createdUser = await dbUsers.createUser(createdUser, res);

    res.status(201).json({createdUser: createdUser });
};



const login = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            message: 'Log in failed, please try again.'
        })
    }

    const { username, password } = req.body;

    let existingUser;
    try {
        existingUser = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        existingUser = existingUser.rows[0];
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: 'error',
            message: 'Sign up failed, please try again later.'
        });
    }

    if (!existingUser) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid credentials, please try again.'
        })
    }

    let isValidPass = false;
    try {
        isValidPass = await bcrypt.compare(password, existingUser.password)
    } catch (e) {
        return res.status(500).json({
            status: 'error',
            message: 'Log in failed, please try again later.'
        })
    }

    if (!isValidPass) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid credentials, please try again.'
        })
    }

    res.json({ status: 'success', message: 'logged in!' })
};



const searchUsers = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid search input, please try again.'
        })
    }

    const { search } = req.body;

    let usersFound;
    try {
        usersFound = await db.query("SELECT u_id, username, intraid FROM users WHERE username LIKE $1", [search + '%']);
        usersFound = usersFound.rows;
    } catch (e) {
        console.log(e);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to search for users'
        })
    }
    res.json({found: usersFound.map(user => user)})
};

exports.getUserFriends = getUserFriends;
exports.getUsers = getUsers;
exports.getUserById = getUserById;
exports.signUp = signUp;
exports.login = login;
exports.searchUsers = searchUsers;