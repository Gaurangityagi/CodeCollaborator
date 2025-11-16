import React, { useState, useEffect } from "react";

function TodoList({ socketRef, roomId, username }) {
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleNewTodo = ({ task, username: adder, id }) => {
      setTodos(prev => [...prev, { text: task, username: adder, id, completed: false }]);
    };

    const handleToggleTodo = ({ id }) => {
      setTodos(prev => prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ));
    };

    socket.on("NEW_TODO", handleNewTodo);
    socket.on("TOGGLE_TODO", handleToggleTodo);

    return () => {
      socket.off("NEW_TODO", handleNewTodo);
      socket.off("TOGGLE_TODO", handleToggleTodo);
    };
  }, [socketRef.current]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newTask.trim()) {
      const taskId = String(Date.now());
      // Add to local state immediately
      setTodos(prev => [...prev, { text: newTask, username, id: taskId, completed: false }]);
      // Emit to other clients
      socketRef.current.emit("ADD_TODO", { roomId, task: newTask, username, id: taskId });
      setNewTask("");
    }
  };

  const toggleTodo = (id) => {
    // Update local state immediately
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
    // Emit to other clients
    socketRef.current.emit("TOGGLE_TODO", { roomId, id });
  };

  return (
    <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}>
      <h4>To-Do List</h4>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task..."
          style={{ width: "70%", marginRight: "10px" }}
        />
        <button type="submit" style={{ padding: "5px 10px", background: "#28a745", color: "white", border: "none", borderRadius: "4px" }}>
          Add Task
        </button>
      </form>
      <div style={{ marginTop: "10px" }}>
        {todos.map((todo) => (
          <div key={todo.id} style={{ marginBottom: "5px", color: "#007bff" }}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              style={{ marginRight: "10px" }}
            />
            <span style={{ textDecoration: todo.completed ? "line-through" : "none" }}>
              <strong>{todo.username}:</strong> {todo.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TodoList;
