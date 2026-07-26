const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT) || 4173;
const host = '127.0.0.1';

// ============================================================
//  حذف صور Cloudinary نهائياً (اختياري)
//  ------------------------------------------------------------
//  الرفع يتم Unsigned من المتصفح مباشرة (لا يحتاج سر). لكن الحذف
//  الفعلي لأصل مرفوع على Cloudinary يتطلب طلباً موقّعاً بـ API Secret،
//  ولا يمكن تنفيذه من المتصفح بأمان. لذلك أضفنا هذه النقطة الاختيارية
//  هنا على الخادم المحلي.
//
//  لتفعيلها: عرّف متغيرات البيئة التالية قبل تشغيل السيرفر:
//    CLOUDINARY_CLOUD_NAME=sbc91hvd
//    CLOUDINARY_API_KEY=...
//    CLOUDINARY_API_SECRET=...
//  (القيم متاحة من: Cloudinary Dashboard > Settings > Access Keys)
//
//  بدون هذه المتغيرات: يستمر النظام بالعمل بشكل طبيعي، وتُحذف الصورة
//  من قاعدة البيانات فقط (لن تُحذف الصورة فعلياً من مساحة Cloudinary،
//  لكن لن تظهر لأي طالب لأن رابطها لم يعد مخزناً عندهم).
// ============================================================
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'sbc91hvd';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
            raw += chunk;
            if (raw.length > 1e6) req.destroy(); // حماية بسيطة من طلبات ضخمة
        });
        req.on('end', () => {
            try { resolve(raw ? JSON.parse(raw) : {}); }
            catch (e) { reject(e); }
        });
        req.on('error', reject);
    });
}

function cloudinaryDestroy(publicId) {
    return new Promise((resolve, reject) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const toSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
        const signature = crypto.createHash('sha1').update(toSign).digest('hex');

        const form = new URLSearchParams({
            public_id: publicId,
            timestamp: String(timestamp),
            api_key: CLOUDINARY_API_KEY,
            signature
        }).toString();

        const options = {
            hostname: 'api.cloudinary.com',
            path: `/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(form)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(form);
        req.end();
    });
}

async function handleCloudinaryDelete(req, res) {
    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        send(res, 501, JSON.stringify({ result: 'not_configured' }), 'application/json; charset=utf-8');
        return;
    }
    try {
        const body = await readJsonBody(req);
        if (!body || !body.publicId) {
            send(res, 400, JSON.stringify({ result: 'missing_public_id' }), 'application/json; charset=utf-8');
            return;
        }
        const result = await cloudinaryDestroy(body.publicId);
        send(res, 200, JSON.stringify(result), 'application/json; charset=utf-8');
    } catch (err) {
        send(res, 500, JSON.stringify({ result: 'error', message: err.message }), 'application/json; charset=utf-8');
    }
}

const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
    res.writeHead(status, {
        'Content-Type': type,
        'Cache-Control': 'no-store'
    });
    res.end(body);
}

const server = http.createServer((req, res) => {
    const cleanUrl = decodeURIComponent(req.url.split('?')[0]);

    if (req.method === 'POST' && cleanUrl === '/api/cloudinary/delete') {
        handleCloudinaryDelete(req, res);
        return;
    }

    const requestPath = cleanUrl === '/' ? '/index.html' : cleanUrl;
    const filePath = path.normalize(path.join(root, requestPath));

    if (!filePath.startsWith(root)) {
        send(res, 403, 'Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            send(res, 404, 'Not found');
            return;
        }

        const type = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        send(res, 200, data, type);
    });
});

server.listen(port, host, () => {
    console.log(`نظام إدارة الدروس is running at http://${host}:${port}`);
});
