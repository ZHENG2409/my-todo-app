const express = require('express');
const cors = require('cors');
require('dotenv').config();
const todoRoutes = require('./routes/todos');
const authRoutes = require('./routes/auth'); // 新增这行

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes); // 新增这行：开启 /api/auth 开头的接口
app.use('/api/todos', todoRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});