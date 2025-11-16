export async function aiSuggest(codeContext) {
  const res = await fetch("http://localhost:8080/autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: codeContext })
  });
  const data = await res.json();
  return data.completions; // returns array: ["suggest 1", "suggest 2", "suggest 3"]
}
