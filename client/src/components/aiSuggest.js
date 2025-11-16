export async function aiSuggest(codeContext, language = "python3") {
  try {
    const res = await fetch("http://localhost:5000/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codeContext, language })
    });
    const data = await res.json();
    // Return as array for CodeMirror hint system - now returns multiple suggestions
    return data.suggestions ? data.suggestions : [];
  } catch (error) {
    console.error("AI suggestion error:", error);
    return [];
  }
}
