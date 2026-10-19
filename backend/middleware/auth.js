const jwt = require('jsonwebtoken');

// 这里的密钥应该放在 .env 里，这里为了方便直接写死
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function (req, res, next) {
    // 1. 从前端的请求头里拿通行证
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ error: '没有通行证，拒绝访问！' });
    }

    // 通常格式是 "Bearer xxxxxx"，我们要把 "Bearer " 切掉，只留后面的 Token
    const token = authHeader.split(' ')[1];

    try {
        // 2. 验票：看看这票是不是我们发的，有没有过期
        const decoded = jwt.verify(token, JWT_SECRET);

        // 3. 把破解出来的用户信息（包含 user_id）挂在 req 对象上，传给下一个函数
        req.user = decoded;

        // 4. 验票通过，放行！
        next();
    } catch (err) {
        res.status(401).json({ error: '通行证无效或已过期，请重新登录！' });
    }
};