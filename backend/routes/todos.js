const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth'); // 引入保安

// 所有下面的接口，都必须先经过保安验证（auth）
router.use(auth);

// 1. 获取当前用户的所有待办
// 1. 获取当前用户的所有待办
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        // 修改排序：先按是否完成排（未完成在前），再按日期（没日期的在后），最后按优先级
        const [rows] = await pool.query(
            `SELECT id, user_id, title, description, priority, type, start_date, due_date, tag, completed, created_at 
       FROM todos WHERE user_id = ? 
       ORDER BY completed ASC, due_date IS NULL, due_date ASC, priority ASC, id DESC`,
            [userId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: '获取数据失败' });
    }
});

// 2. 新增待办
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        // 接收前端传来的各种属性
        const { title, description, priority, type, start_date, due_date, tag } = req.body;

        if (!title) return res.status(400).json({ error: '标题不能为空' });

        const [result] = await pool.query(
            `INSERT INTO todos (user_id, title, description, priority, type, start_date, due_date, tag) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, title, description || null, priority || 2, type || 'schedule', start_date || null, due_date || null, tag || null]
        );

        const [newTodo] = await pool.query('SELECT * FROM todos WHERE id = ?', [result.insertId]);
        res.status(201).json(newTodo[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '添加失败' });
    }
});

// 3. 更新待办（支持只更新某几个字段，比如只切换完成状态）
// 3. 更新待办
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const todoId = req.params.id;
        const updates = req.body;

        // 确保这个待办真的是这个用户的
        const [existing] = await pool.query('SELECT * FROM todos WHERE id = ? AND user_id = ?', [todoId, userId]);
        if (existing.length === 0) return res.status(404).json({ error: '待办不存在或无权修改' });

        // 动态拼接 SQL 字段，只有前端传了的字段才更新，没传（undefined）的不动，传 null 的变成空
        const fields = [];
        const values = [];

        // 允许更新的字段白名单
        const allowedFields = ['title', 'description', 'priority', 'type', 'start_date', 'due_date', 'tag', 'completed'];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(updates[field]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ error: '没有提供要更新的字段' });
        }

        values.push(todoId, userId);
        await pool.query(`UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);

        const [updated] = await pool.query('SELECT * FROM todos WHERE id = ?', [todoId]);
        res.json(updated[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '更新失败' });
    }
});

// 4. 删除待办
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.userId;
        const todoId = req.params.id;

        await pool.query('DELETE FROM todos WHERE id = ? AND user_id = ?', [todoId, userId]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: '删除失败' });
    }
});

module.exports = router;