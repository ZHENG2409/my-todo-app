const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// 获取所有待办
router.get('/', async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM todos ORDER BY id DESC');
    res.json(rows);
});

// 新增待办
router.post('/', async (req, res) => {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    const [result] = await pool.query('INSERT INTO todos (title, completed) VALUES (?, ?)', [title, false]);
    const [rows] = await pool.query('SELECT * FROM todos WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
});

// 更新待办（切换完成状态或修改标题）
router.put('/:id', async (req, res) => {
    const { title, completed } = req.body;
    await pool.query('UPDATE todos SET title = ?, completed = ? WHERE id = ?', [
        title,
        completed,
        req.params.id,
    ]);
    const [rows] = await pool.query('SELECT * FROM todos WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
});

// 删除待办
router.delete('/:id', async (req, res) => {
    await pool.query('DELETE FROM todos WHERE id = ?', [req.params.id]);
    res.status(204).send();
});

module.exports = router;