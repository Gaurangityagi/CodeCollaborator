import mongoose from "mongoose";

const SuggestionSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  text: { type: String, required: true },
  username: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Suggestion = mongoose.model("Suggestion", SuggestionSchema);
export default Suggestion;
