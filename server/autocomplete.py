from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline

# Load a code-specific model for better code completion
generator = pipeline("text-generation", model="Salesforce/codegen-350M-mono")

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
