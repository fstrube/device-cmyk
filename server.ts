import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import mime from 'mime';

const PORT = process.env.PORT || 3000;

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Catch docker-compose down signal
process.on('SIGTERM', () => {
    console.log('Server is shutting down');
    server.close(() => {
        console.log('Server has been shut down');
        process.exit(0);
    });
});

const server = http.createServer((req, res) => {
    const url = req.url?.endsWith('/') ? req.url + 'index.html' : req.url;
    const filePath = path.join(__dirname, 'public', url?.startsWith('/') ? url.slice(1) : url!);

    if (filePath.endsWith('.icc')) {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(fs.readFileSync(filePath));
    } else if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': mime.getType(filePath) ?? 'text/html' });
        res.end(fs.readFileSync(filePath, 'utf8'));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log('Server is running on port http://localhost:3000');
});
