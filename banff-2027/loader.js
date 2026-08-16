(async () => {
  const root = document.getElementById("site-root");
  const files = ["body-1.html", "body-2.html", "body-3.html", "body-4.html", "body-5.html", "body-6.html"];
  try {
    const parts = await Promise.all(files.map(async (file) => {
      const response = await fetch(file);
      if (!response.ok) throw new Error(`Failed to load ${file}`);
      return response.text();
    }));
    root.outerHTML = parts.join("");
    const script = document.createElement("script");
    script.src = "app.js";
    script.defer = true;
    document.body.appendChild(script);
  } catch (error) {
    root.innerHTML = `<div class="site-loader"><strong>Trip plan could not load</strong><span>Please refresh the page.</span></div>`;
    console.error(error);
  }
})();
