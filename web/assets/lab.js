(function () {
  "use strict";

  Array.prototype.forEach.call(document.querySelectorAll(".lab-form"), function (form) {
    var out = form.parentElement.querySelector("[data-out]");
    var button = form.querySelector("button[type=submit]");
    var pending = null;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (pending) {
        pending.abort();
      }
      var controller = new AbortController();
      pending = controller;

      var query = new URLSearchParams();
      new FormData(form).forEach(function (value, key) {
        var trimmed = String(value).trim();
        if (trimmed !== "") {
          query.set(key, trimmed);
        }
      });

      var url = form.dataset.endpoint + "?" + query.toString();
      var started = performance.now();
      button.setAttribute("aria-busy", "true");
      button.disabled = true;
      out.hidden = false;
      out.dataset.tone = "loading";
      out.textContent = "GET " + url;

      fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } })
        .then(function (response) {
          return response.text().then(function (text) {
            return { response: response, text: text };
          });
        })
        .then(function (reply) {
          if (controller.signal.aborted) {
            return;
          }
          var elapsed = Math.round(performance.now() - started);
          var pretty = reply.text;
          try {
            pretty = JSON.stringify(JSON.parse(reply.text), null, 2);
          } catch (error) {
            // Non-JSON bodies are shown as served.
          }
          out.dataset.tone = reply.response.ok ? "ok" : "error";
          out.textContent =
            "HTTP " + reply.response.status + " · " + elapsed + " ms\n" +
            "GET " + url + "\n\n" +
            pretty;
        })
        .catch(function (error) {
          if (error && error.name === "AbortError") {
            return;
          }
          out.dataset.tone = "error";
          out.textContent = "Gagal menghubungi server: " + (error && error.message ? error.message : "tidak diketahui");
        })
        .finally(function () {
          if (pending === controller) {
            pending = null;
          }
          button.removeAttribute("aria-busy");
          button.disabled = false;
        });
    });
  });
})();
