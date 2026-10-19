const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = 'my_super_secret_key_123'; // 和上面那个保安文件里的一模一样

// 1. 注册接口
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    try {
        // 检查用户是否已存在
        const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ error: '该用户名已被注册' });
        }

        // 密码加密（加盐，防止被破解）
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 存入数据库
        const [result] = await pool.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );

        res.status(201).json({ message: '注册成功', userId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '注册失败，服务器错误' });
    }
});

// 2. 登录接口
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 查找用户
        const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(400).json({ error: '用户名或密码错误' });
        }

        const user = users[0];

        // 比对密码（把用户输入的密码和数据库加密的乱码比对）
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: '用户名或密码错误' });
        }

        // 生成 Token（相当于发通行证，有效期 7 天）
        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ message: '登录成功', token, username: user.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '登录失败，服务器错误' });
    }
});

module.exports = router;