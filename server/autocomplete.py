from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import torch

app = Flask(__name__)
CORS(app)

# Load a better code-specific model
model_name = "microsoft/CodeGPT-small-py"  # Better for Python/JavaScript code completion
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

# Set pad token if not present
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

device = 0 if torch.cuda.is_available() else -1

@app.route("/autocomplete", methods=["POST"])
def autocomplete():
    try:
        data = request.get_json()
        code_context = data.get("codeContext", "")
        language = data.get("language", "python3")

        if not code_context.strip():
            return jsonify({"suggestion": ""})

        # Language-specific prompt engineering
        language_prompts = {
            "python3": "def ",
            "cpp": "#include ",
            "java": "public class ",
            "javascript": "function ",
            "c": "#include ",
            "csharp": "using System;",
            "php": "<?php ",
            "ruby": "def ",
            "go": "package main",
            "rust": "fn ",
            "swift": "func ",
            "kotlin": "fun ",
            "typescript": "function ",
            "html": "<!DOCTYPE html>",
            "css": "body {",
            "sql": "SELECT ",
            "bash": "#!/bin/bash",
            "r": "library(",
            "scala": "object ",
            "pascal": "program "
        }

        # Add language-specific context to help the model
        prefix = language_prompts.get(language, "")
        enhanced_context = prefix + code_context if prefix else code_context

        # Tokenize input
        inputs = tokenizer(enhanced_context, return_tensors="pt", truncation=True, max_length=512)

        if device >= 0:
            inputs = {k: v.to(device) for k, v in inputs.items()}
            model.to(device)

        # Generate completion with language-specific parameters
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=10,  # Allow longer completions
                do_sample=True,
                temperature=0.4,  # Slightly higher for more variety
                top_p=0.95,
                num_return_sequences=1,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id,
                repetition_penalty=1.1
            )

        # Decode the completion
        completion = tokenizer.decode(outputs[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True)

        # Clean up the completion
        completion = completion.strip()

        # Language-specific cleaning
        if language in ["python3", "javascript", "typescript", "java", "cpp", "c", "csharp", "php", "ruby", "go", "rust", "swift", "kotlin", "scala"]:
            # For programming languages, take reasonable code snippets
            completion = completion.split('\n')[0]  # First line only
            # Stop at common terminators
            for terminator in ['\n', ';', '{', '}', '(', ')', '[', ']', ':', ',']:
                if terminator in completion:
                    completion = completion.split(terminator)[0] + terminator
                    break
        elif language in ["html", "css"]:
            # For markup/styling, allow more content
            completion = completion.split('\n')[0]  # First line for now
        else:
            # For other languages, take first reasonable token
            completion = completion.split('\n')[0].split(' ')[0]

        # Remove the prefix if it was added
        if prefix and completion.startswith(prefix):
            completion = completion[len(prefix):]

        # Final cleanup
        completion = completion.strip()
        if len(completion) > 30:
            completion = completion[:30]

        return jsonify({"suggestion": completion})

    except Exception as e:
        print(f"Autocomplete error: {e}")
        return jsonify({"suggestion": "", "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8080, debug=True)
