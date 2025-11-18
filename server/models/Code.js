import mongoose from "mongoose";

const CodeSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  code: { type: String, default: "" },
  admin: { type: String, default: null },
  language: { type: String, default: "python3" },
});

const Code = mongoose.model("Code", CodeSchema);
export default Code;

