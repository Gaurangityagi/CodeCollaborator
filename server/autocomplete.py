from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline

# Use deepseek-coder for better code completion (no compatibility issues)
model_name = "deepseek-ai/deepseek-coder-1.3b-base"

print("Loading model... This may take a minute on first run.")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float32,  # Use float32 for CPU
    low_cpu_mem_usage=True
)
model.eval()  # Set to evaluation mode
print("Model loaded successfully!")

app = Flask(__name__)
CORS(app)

@app.route("/autocomplete", methods=["POST"])
def autocomplete():
    data = request.get_json()
    code = data.get("code", "")
    # Generate multiple completions for better suggestions
    result = generator(code, max_new_tokens=5, do_sample=True, num_return_sequences=3, temperature=0.7)
    suggestions = [r["generated_text"][len(code):].strip() for r in result]
    return jsonify({"completions": suggestions})

if __name__ == "__main__":
    app.run(port=8080)
