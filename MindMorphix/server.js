const express = require("express");
const next = require("next");
const http = require("http");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // Example of a custom route (optional)
  server.get("/p/:id", (req, res) => {
    const actualPage = "/post";
    const queryParams = { id: req.params.id };
    app.render(req, res, actualPage, queryParams);
  });

  // Custom API route (optional)
  server.get("/api/custom", (req, res) => {
    res.json({ message: "Custom API response" });
  });

  // Fallback to the default Next.js handler for all other routes
  server.all("*", (req, res) => {
    return handle(req, res);
  });

  // Function to check if the port is already in use and switch ports
  const checkPort = (port, callback) => {
    const serverTest = http.createServer();
    serverTest.listen(port, () => {
      serverTest.close();
      callback(null, port);
    });

    serverTest.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        // If port is in use, try the next port (4000 in this case)
        callback(null, 4000);
      } else {
        callback(err);
      }
    });
  };

  // Check if port 3000 is available, if not, use 4000
  checkPort(3000, (err, portToUse) => {
    if (err) {
      console.error("Error checking port:", err);
      return;
    }
    
    server.listen(portToUse, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${portToUse}`);
    });
  });
});
