import fs from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const PORT = 3000;
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const server = createServer((req, res) => {
    try {
        console.log(req.method, req.url);

        let filePath = path.join(__dirname, req.url.slice(1));
        if (fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath.replace(/\/+$/, ''), 'index.html');
        }
        let contentType = 'text/plain';
        if (filePath.endsWith('.html')) {
            contentType = 'text/html';
        } else if (filePath.endsWith('.js')) {
            contentType = 'application/javascript';
        } else if (filePath.endsWith('.icc')) {
            contentType = 'application/octet-stream';
        }
        const content = fs.readFileSync(filePath);

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        console.error(error);

        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
    }
});

server.listen(PORT, () => {
    console.log('Server is running on http://localhost:3000');
});
