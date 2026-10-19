import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Layout, Button, Input, List, Checkbox, Tag,
    Calendar, Select, DatePicker, Modal, Form, message, Space, Typography, Divider, Empty
} from 'antd';
import {
    PlusOutlined, LogoutOutlined, CalendarOutlined,
    StarFilled
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTodos, createTodo, updateTodo, deleteTodo } from '../services/api';
import updateLocale from 'dayjs/plugin/updateLocale';

dayjs.extend(updateLocale);
dayjs.updateLocale('en', {
    weekdaysMin: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
});

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// 标签映射表
const TAG_MAP = {
    work: { label: '工作', emoji: '💻', color: 'blue' },
    study: { label: '学习', emoji: '📚', color: 'purple' },
    sport: { label: '运动', emoji: '🏃', color: 'green' },
    life: { label: '生活', emoji: '🏠', color: 'orange' },
    finance: { label: '财务', emoji: '💰', color: 'gold' },
    entertainment: { label: '娱乐', emoji: '🎮', color: 'volcano' },
};

const PRIORITY_MAP = {
    1: { label: '高', color: '#FFB6B9' }, // 马卡龙红
    2: { label: '中', color: '#FFE699' }, // 马卡龙黄
    3: { label: '低', color: '#A5D8FF' }, // 马卡龙蓝
};

export default function Home() {
    const navigate = useNavigate();
    const [todos, setTodos] = useState([]);
    const [filteredTodos, setFilteredTodos] = useState([]);
    const [loading, setLoading] = useState(false);

    // 筛选与视图状态
    const [filterType, setFilterType] = useState('all');
    const [sortType, setSortType] = useState('default');
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [calendarMode, setCalendarMode] = useState('month'); // 控制日历面板模式

    // UI 状态
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [form] = Form.useForm();

    const username = localStorage.getItem('username') || '用户';

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchTodos();
    }, []);

    // 核心过滤与排序逻辑
    useEffect(() => {
        let result = [...todos];

        // 1. 状态过滤
        if (filterType === 'active') result = result.filter(t => !t.completed);
        if (filterType === 'completed') result = result.filter(t => t.completed);

        // 2. 日期过滤
        if (filterType === 'today') {
            const todayStr = dayjs().format('YYYY-MM-DD');
            result = result.filter(t => {
                if (t.type === 'schedule') return t.due_date === todayStr;
                if (t.type === 'task') return t.start_date <= todayStr && t.due_date >= todayStr;
                return false;
            });
        } else if (filterType === 'all' && calendarMode === 'month') {
            // 如果是“全部任务”，但用户点击了具体某天（排除默认的今天未点击状态）
            // 这里为了符合直觉，如果点的是今天，显示全部；如果点的是其他日子，只显示那天的。
            const selectedStr = selectedDate.format('YYYY-MM-DD');
            const isToday = selectedStr === dayjs().format('YYYY-MM-DD');

            if (!isToday) {
                result = result.filter(t => {
                    if (!t.due_date) return false;
                    if (t.type === 'schedule') return t.due_date === selectedStr;
                    if (t.type === 'task') return t.start_date <= selectedStr && t.due_date >= selectedStr;
                    return false;
                });
            }
        }

        // 3. 排序
        result.sort((a, b) => {
            // 优先排未完成的
            if (a.completed !== b.completed) return a.completed ? 1 : -1;

            if (sortType === 'priority') return a.priority - b.priority;
            if (sortType === 'date') return (a.due_date || '9999').localeCompare(b.due_date || '9999');
            const aHasDate = a.due_date ? 1 : 0;
            const bHasDate = b.due_date ? 1 : 0;
            if (aHasDate !== bHasDate) return bHasDate - aHasDate;
            if (a.priority !== b.priority) return a.priority - b.priority;
            return 0;
        });

        setFilteredTodos(result);
    }, [todos, filterType, sortType, selectedDate, calendarMode]);

    const fetchTodos = async () => {
        setLoading(true);
        try {
            const res = await getTodos();
            // 强转日期格式，确保星星和日历能匹配上
            const formattedData = res.data.map(item => ({
                ...item,
                due_date: item.due_date ? dayjs(item.due_date).format('YYYY-MM-DD') : null,
                start_date: item.start_date ? dayjs(item.start_date).format('YYYY-MM-DD') : null,
            }));
            setTodos(formattedData);
        } catch (error) {
            message.error('获取数据失败，请重新登录');
            if (error.response?.status === 401) handleLogout();
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };

    const onFinish = async (values) => {
        const data = {
            title: values.title,
            description: values.description,
            priority: values.priority,
            type: values.type,
            start_date: values.dateRange && values.type === 'task' ? values.dateRange[0].format('YYYY-MM-DD') : null,
            due_date: values.dateRange ? (values.type === 'task' ? values.dateRange[1].format('YYYY-MM-DD') : values.dateRange.format('YYYY-MM-DD')) : null,
            tag: values.tag,
        };

        try {
            if (editingTodo) {
                await updateTodo(editingTodo.id, { ...data, completed: editingTodo.completed });
                message.success('修改成功');
            } else {
                await createTodo(data);
                message.success('添加成功');
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingTodo(null);
            fetchTodos();
        } catch (error) {
            message.error('操作失败');
        }
    };

    const toggleComplete = async (todo) => {
        try {
            await updateTodo(todo.id, { completed: !todo.completed });
            fetchTodos();
        } catch (error) {
            message.error('更新失败');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteTodo(id);
            message.success('已删除');
            fetchTodos();
        } catch (error) {
            message.error('删除失败');
        }
    };

    const openEdit = (todo) => {
        setEditingTodo(todo);
        form.setFieldsValue({
            title: todo.title,
            description: todo.description,
            priority: todo.priority,
            type: todo.type,
            dateRange: todo.type === 'task'
                ? [dayjs(todo.start_date), dayjs(todo.due_date)]
                : (todo.due_date ? dayjs(todo.due_date) : null),
            tag: todo.tag,
        });
        setIsModalOpen(true);
    };

    // 日历格子渲染
    const dateCellRender = (value) => {
        const dateStr = value.format('YYYY-MM-DD');

        // 匹配那天所有的任务
        const dayTodos = todos.filter(t => {
            if (!t.due_date) return false;
            if (t.type === 'schedule') return t.due_date === dateStr;
            if (t.type === 'task') return t.start_date <= dateStr && t.due_date >= dateStr;
            return false;
        });

        if (dayTodos.length === 0) return null;

        // 找出最高优先级（数字最小）
        const highestPriority = Math.min(...dayTodos.map(t => t.priority));

        return (
            <div style={{ textAlign: 'center', fontSize: 12, marginTop: 2 }}>
                <StarFilled style={{ color: PRIORITY_MAP[highestPriority]?.color || '#FFE699' }} />
            </div>
        );
    };

    // 处理日历点击事件
    const onCalendarSelect = (date, info) => {
        if (calendarMode === 'year') {
            setSelectedDate(date);
            return;
        }
        setSelectedDate(date);
    };

    // 左侧下方显示的列表逻辑（根据日历模式变化）
    let sideListTitle = '';
    let sideListData = [];

    if (calendarMode === 'month') {
        sideListTitle = `📅 ${selectedDate.format('MM月DD日')} 日程`;
        const dateStr = selectedDate.format('YYYY-MM-DD');
        sideListData = todos.filter(t => {
            if (!t.due_date) return false;
            if (t.type === 'schedule') return t.due_date === dateStr;
            if (t.type === 'task') return t.start_date <= dateStr && t.due_date >= dateStr;
            return false;
        });
    } else {
        sideListTitle = `📅 ${selectedDate.format('YYYY年MM月')} 日程`;
        const monthStr = selectedDate.format('YYYY-MM');
        sideListData = todos.filter(t => {
            if (!t.due_date) return false;
            if (t.type === 'schedule') return t.due_date.startsWith(monthStr);
            if (t.type === 'task') return t.start_date.startsWith(monthStr) || t.due_date.startsWith(monthStr);
            return false;
        });
    }

    return (
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Title level={4} style={{ margin: 0, color: '#010000d2' }}>我的待办</Title>
                <Space>
                    <Text>你好，{username}</Text>
                    <Button icon={<LogoutOutlined />} onClick={handleLogout} type="text">退出</Button>
                </Space>
            </Header>

            <Layout>
                {!isMobile && (
                    <Sider width={340} style={{ background: '#fff', padding: 16, borderRadius: 12, margin: '24px 0 24px 24px', height: 'fit-content' }}>
                        <Calendar
                            fullscreen={false}
                            mode={calendarMode}
                            onPanelChange={(date, mode) => { setCalendarMode(mode); setSelectedDate(date); }}
                            onSelect={onCalendarSelect}
                            dateCellRender={dateCellRender}
                        />

                        <Divider style={{ margin: '12px 0' }} />

                        <div style={{ padding: '0 8px' }}>
                            <Text strong style={{ fontSize: 14, color: '#555' }}>{sideListTitle}</Text>
                            {sideListData.length > 0 ? (
                                <List
                                    size="small"
                                    dataSource={sideListData}
                                    style={{ marginTop: 8 }}
                                    renderItem={item => {
                                        let datePrefix = '';
                                        if (calendarMode === 'year') {
                                            if (item.type === 'schedule') {
                                                datePrefix = `${dayjs(item.due_date).date()}日`;
                                            } else if (item.type === 'task') {
                                                const start = dayjs(item.start_date);
                                                const end = dayjs(item.due_date);
                                                if (start.month() === end.month()) {
                                                    datePrefix = `${start.date()}日 ~ ${end.date()}日截止`;
                                                } else {
                                                    datePrefix = `${start.format('MM月DD日')} ~ ${end.format('MM月DD日')}截止`;
                                                }
                                            }
                                        }

                                        return (
                                            <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                                <Space align="start">
                                                    <StarFilled style={{ color: PRIORITY_MAP[item.priority]?.color, marginTop: 4 }} />
                                                    {calendarMode === 'year' && (
                                                        <Tag color="default" style={{ marginRight: 0, fontSize: 12 }}>
                                                            {datePrefix}
                                                        </Tag>
                                                    )}
                                                    <Text delete={item.completed}>{item.title}</Text>
                                                </Space>
                                            </List.Item>
                                        );
                                    }}
                                />
                            ) : (
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="很闲~" style={{ marginTop: 16 }} />
                            )}
                        </div>
                    </Sider>
                )}

                <Content style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                        <Space wrap>
                            {isMobile && (
                                <DatePicker
                                    value={selectedDate}
                                    onChange={(date) => date && setSelectedDate(date)}
                                    allowClear={false}
                                />
                            )}
                            <Select value={filterType} onChange={setFilterType} style={{ width: 110 }}>
                                <Select.Option value="all">全部任务</Select.Option>
                                <Select.Option value="active">未完成</Select.Option>
                                <Select.Option value="completed">已完成</Select.Option>
                                <Select.Option value="today">今日待办</Select.Option>
                            </Select>
                            <Select value={sortType} onChange={setSortType} style={{ width: 120 }}>
                                <Select.Option value="default">默认排序</Select.Option>
                                <Select.Option value="priority">按优先级</Select.Option>
                                <Select.Option value="date">按日期</Select.Option>
                            </Select>
                        </Space>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingTodo(null); form.resetFields(); setIsModalOpen(true); }} style={{ background: '#a1c4fd' }}>
                            添加任务
                        </Button>
                    </div>

                    <List
                        loading={loading}
                        itemLayout="horizontal"
                        dataSource={filteredTodos}
                        renderItem={(item) => {
                            const isOverdue = item.due_date && dayjs(item.due_date).isBefore(dayjs(), 'day') && !item.completed;
                            const dateDisplay = item.type === 'task'
                                ? `${item.start_date} ~ ${item.due_date}`
                                : item.due_date;

                            return (
                                <List.Item
                                    style={{
                                        background: '#fff', marginBottom: 12, borderRadius: 12, padding: '16px 24px',
                                        opacity: item.completed ? 0.6 : 1, boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                    }}
                                    actions={[
                                        <Button type="link" onClick={() => openEdit(item)}>编辑</Button>,
                                        <Button type="link" danger onClick={() => handleDelete(item.id)}>删除</Button>
                                    ]}
                                >
                                    {/* 完全手写 Flex 布局接管左侧区域 */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>

                                        {/* 1. 复选框容器：固定高度 24，内部垂直居中 */}
                                        <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>
                                            <Checkbox
                                                checked={item.completed}
                                                onChange={() => toggleComplete(item)}
                                                style={{ transform: 'scale(1.1)' }}
                                            />
                                        </div>

                                        {/* 2. 文字与标签内容区 */}
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>

                                            {/* 第一行：星星 + 标题 + 过期提示（同样固定高度 24，内部垂直居中） */}
                                            <div style={{ minHeight: 24, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <StarFilled style={{ color: PRIORITY_MAP[item.priority]?.color, fontSize: 18, display: 'flex' }} />
                                                <Text delete={item.completed} style={{ fontSize: 16, fontWeight: 500, lineHeight: 1 }}>
                                                    {item.title}
                                                </Text>
                                                {isOverdue && <Text type="danger" style={{ fontSize: 13 }}>❗已过期</Text>}
                                            </div>

                                            {/* 第二行：描述和标签（如果存在才渲染） */}
                                            {(item.description || item.due_date || item.tag) && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {item.description && <Text type="secondary" style={{ fontSize: 14 }}>{item.description}</Text>}
                                                    <Space wrap size={4}>
                                                        {item.due_date && (
                                                            <Tag color="default" icon={<CalendarOutlined />} style={{ margin: 0 }}>
                                                                {dateDisplay}
                                                            </Tag>
                                                        )}
                                                        {item.tag && TAG_MAP[item.tag] && (
                                                            <Tag color={TAG_MAP[item.tag].color} style={{ margin: 0 }}>
                                                                {TAG_MAP[item.tag].emoji} {TAG_MAP[item.tag].label}
                                                            </Tag>
                                                        )}
                                                    </Space>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </List.Item>
                            );
                        }}
                    />
                </Content>
            </Layout>

            <Modal
                title={editingTodo ? "编辑任务" : "添加新任务"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                okText="保存"
                cancelText="取消"
                okButtonProps={{ style: { background: '#a1c4fd' } }}
            >
                <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ type: 'schedule', priority: 2 }}>
                    <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
                        <Input placeholder="要做什么？" />
                    </Form.Item>
                    <Form.Item name="description" label="描述 (选填)">
                        <Input.TextArea rows={2} placeholder="补充一些细节..." />
                    </Form.Item>
                    <Space style={{ display: 'flex', marginBottom: 16 }} align="baseline">
                        <Form.Item name="type" label="类型" style={{ marginBottom: 0 }}>
                            <Select style={{ width: 120 }}>
                                <Select.Option value="schedule">单日日程</Select.Option>
                                <Select.Option value="task">时间段任务</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.type !== curr.type}>
                            {({ getFieldValue }) => {
                                const type = getFieldValue('type');
                                return (
                                    <Form.Item name="dateRange" label="日期" style={{ marginBottom: 0 }}>
                                        {type === 'task' ? <RangePicker /> : <DatePicker />}
                                    </Form.Item>
                                );
                            }}
                        </Form.Item>
                    </Space>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item name="priority" label="优先级" style={{ flex: 1 }}>
                            <Select>
                                <Select.Option value={1}><StarFilled style={{ color: '#FFB6B9' }} /> 高</Select.Option>
                                <Select.Option value={2}><StarFilled style={{ color: '#FFE699' }} /> 中</Select.Option>
                                <Select.Option value={3}><StarFilled style={{ color: '#A5D8FF' }} /> 低</Select.Option>
                            </Select>
                        </Form.Item>
                        <Form.Item name="tag" label="标签 (选填)" style={{ flex: 1 }}>
                            <Select allowClear placeholder="选择标签">
                                <Select.Option value="work">💻 工作</Select.Option>
                                <Select.Option value="study">📚 学习</Select.Option>
                                <Select.Option value="sport">🏃 运动</Select.Option>
                                <Select.Option value="life">🏠 生活</Select.Option>
                                <Select.Option value="finance">💰 财务</Select.Option>
                                <Select.Option value="entertainment">🎮 娱乐</Select.Option>
                            </Select>
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </Layout>
    );
}