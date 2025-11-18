from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

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
    language = data.get("language", "").lower()  # Get language from request
    
    # Map frontend language names to model-friendly names
    language_map = {
        "python3": "python",
        "nodejs": "javascript",
        "c#": "csharp",
        "csharp": "csharp",
        "cpp": "cpp",
        "c": "c",
        "java": "java",
        "go": "go",
        "rust": "rust",
        "ruby": "ruby",
        "php": "php",
        "swift": "swift",
        "scala": "scala",
        "bash": "bash",
        "sql": "sql",
        "pascal": "pascal",
        "r": "r"
    }
    
    # Get normalized language name
    normalized_lang = language_map.get(language, language)
    
    if not code:
        return jsonify({"completions": []})
    
    try:
        # Tokenize input with attention mask
        inputs = tokenizer(code, return_tensors="pt", return_attention_mask=True)
        
        # Generate completions with better parameters
        with torch.no_grad():
            outputs = model.generate(
                inputs.input_ids,
                attention_mask=inputs.attention_mask,  # Fix the warning
                max_new_tokens=25,  # Increased for better completions
                num_return_sequences=5,  # Generate 5 to get 3 unique ones
                do_sample=True,
                temperature=0.6,  # Increased for more diversity
                top_p=0.95,
                top_k=50,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                no_repeat_ngram_size=2  # Avoid repetition
            )
        
        # Decode and extract only the new completion part
        suggestions = []
        for output in outputs:
            completed_text = tokenizer.decode(output, skip_special_tokens=True)
            
            # Remove the language hint we added
            if normalized_lang and normalized_lang != "text":
                lang_hints = {
                    "python": "# Python code\n",
                    "javascript": "// JavaScript code\n",
                    "java": "// Java code\n",
                    "cpp": "// C++ code\n",
                    "c": "// C code\n",
                    "csharp": "// C# code\n",
                    "go": "// Go code\n",
                    "rust": "// Rust code\n",
                    "php": "// PHP code\n",
                    "ruby": "// Ruby code\n",
                    "swift": "// Swift code\n",
                    "scala": "// Scala code\n",
                    "bash": "# Bash script\n",
                    "sql": "-- SQL code\n",
                    "pascal": "{ Pascal code }\n",
                    "r": "# R code\n"
                }
                hint = lang_hints.get(normalized_lang, f"// {normalized_lang.title()} code\n")
                if completed_text.startswith(hint):
                    completed_text = completed_text[len(hint):]
            
            # Extract only the newly generated part
            completion = completed_text[len(code):].strip()
            
            # For single line completions, stop at newline
            if '\n' in completion:
                first_line = completion.split('\n')[0].strip()
                if first_line:  # Only add if not empty
                    suggestions.append(first_line)
            elif completion:  # Add if not empty
                suggestions.append(completion)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_suggestions = []
        for s in suggestions:
            if s and s not in seen:
                seen.add(s)
                unique_suggestions.append(s)
        
        # Ensure we always return exactly 3 suggestions
        while len(unique_suggestions) < 3:
            unique_suggestions.append("")
        
        return jsonify({"completions": unique_suggestions[:3]})
    
    except Exception as e:
        print(f"Error during completion: {str(e)}")
        return jsonify({"completions": ["", "", ""], "error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": model_name})

if __name__ == "__main__":
    app.run(port=8080, debug=False)