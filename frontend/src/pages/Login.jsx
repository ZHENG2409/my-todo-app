import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Checkbox } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { login, register } from '../services/api';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true); // 切换登录/注册状态
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); // 用于页面跳转

    // 表单提交时的处理逻辑
    const onFinish = async (values) => {
        setLoading(true);
        try {
            if (isLogin) {
                // 调用后端登录接口
                const res = await login({ username: values.username, password: values.password });
                // 把 token 和用户名存入本地存储
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('username', res.data.username);

                // 处理“记住我”功能
                if (values.remember) {
                    localStorage.setItem('saved_username', values.username);
                } else {
                    localStorage.removeItem('saved_username');
                }

                message.success('登录成功！');
                window.location.href = '/';  // 跳转到主页
            } else {
                // 调用后端注册接口
                await register({ username: values.username, password: values.password });
                message.success('注册成功，请直接登录！');
                setIsLogin(true); // 切换到登录状态
            }
        } catch (error) {
            // 捕获后端返回的错误信息
            const errMsg = error.response?.data?.error || '操作失败，请稍后重试';
            message.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    // 获取上次记住的用户名（如果有）
    const savedUsername = localStorage.getItem('saved_username');

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            // 延续你的马卡龙粉蓝渐变风格
            background: 'linear-gradient(135deg, #ffdde1 0%, #ee9ca7 50%, #c2e9fb 100%)'
        }}>
            <Card
                title={isLogin ? "🌸 欢迎回来" : "✨ 注册新账号"}
                style={{ width: 380, borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
                headStyle={{ textAlign: 'center', fontSize: 20, color: '#ff7e9d' }}
            >
                <Form
                    name="login_form"
                    initialValues={{ remember: !!savedUsername, username: savedUsername }}
                    onFinish={onFinish}
                    size="large"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: '请输入用户名！' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="用户名" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码！' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                    </Form.Item>

                    {isLogin && (
                        <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 12 }}>
                            <Checkbox>记住我（下次自动填充）</Checkbox>
                        </Form.Item>
                    )}

                    <Form.Item style={{ marginBottom: 12 }}>
                        <Button type="primary" htmlType="submit" loading={loading} block style={{ background: '#a1c4fd', border: 'none', borderRadius: 8 }}>
                            {isLogin ? '登 录' : '注 册'}
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        <Button type="link" onClick={() => setIsLogin(!isLogin)} style={{ color: '#ff7e9d' }}>
                            {isLogin ? '没有账号？点此注册' : '已有账号？去登录'}
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
}