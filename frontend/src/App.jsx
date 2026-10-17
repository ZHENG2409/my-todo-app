import { useEffect, useState } from 'react';
import { getTodos, createTodo, updateTodo, deleteTodo } from './services/api';
import './App.css'; // 引入可爱的样式

function App() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const loadTodos = async () => {
    try {
      const res = await getTodos();
      setTodos(res.data);
    } catch (error) {
      console.error("获取数据失败，请检查后端是否启动", error);
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const handleAdd = async () => {
    if (!input.trim()) return;
    await createTodo(input.trim());
    setInput('');
    loadTodos();
  };

  const handleToggle = async (todo) => {
    await updateTodo(todo.id, { title: todo.title, completed: !todo.completed });
    loadTodos();
  };

  const handleDelete = async (id) => {
    await deleteTodo(id);
    loadTodos();
  };

  return (
    <div className="app-container">
      <div className="todo-card">
        <h1 className="title">🌸 我的软萌待办 🌸</h1>

        <div className="input-group">
          <input
            className="todo-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="今天想做点什么呢？(。・ω・。)"
          />
          <button className="add-btn" onClick={handleAdd}>
            添加 ✨
          </button>
        </div>

        <ul className="todo-list">
          {todos.length === 0 ? (
            <div className="empty-tip">暂时没有待办哦，快添加一个吧~ ☁️</div>
          ) : (
            todos.map((todo) => (
              <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggle(todo)}
                  />
                  <span className="custom-checkbox">🎀</span>
                </label>
                <span className="todo-text">{todo.title}</span>
                <button className="delete-btn" onClick={() => handleDelete(todo.id)}>
                  删除 🗑️
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

export default App;