import mongoose from "mongoose";

const CodeSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  code: { type: String, default: "" },
  admin: { type: String, default: null }, 
});

const Code = mongoose.model("Code", CodeSchema);
export default Code;

