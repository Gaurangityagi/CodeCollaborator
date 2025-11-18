import mongoose from "mongoose";

const TodoSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  id: { type: String, required: true },
  text: { type: String, required: true },
  username: { type: String, required: true },
  completed: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

const Todo = mongoose.model("Todo", TodoSchema);
export default Todo;
