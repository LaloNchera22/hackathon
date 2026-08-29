const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Set up storage for uploaded files (mocking IPFS)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Just use original name for simplicity in MVP, in reality it's pinned to IPFS and gets a CID
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Initialize SQLite database
const dbFile = path.join(__dirname, 'samizdat.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Create table matching the Contract's Registry structure
        db.run(`CREATE TABLE IF NOT EXISTS documents (
            docHash TEXT PRIMARY KEY,
            cid TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            proofOfWorkNonce INTEGER NOT NULL,
            corroborationCount INTEGER NOT NULL DEFAULT 1,
            zkCredentialFlag INTEGER NOT NULL DEFAULT 0,
            score INTEGER NOT NULL DEFAULT 10
        )`);
    }
});

// Helper function to calculate score (mirroring Registry.sol)
function calculateScore(corroborationCount, zkCredentialFlag) {
    let score = 10; // Base score
    if (zkCredentialFlag) score += 20;
    score += (corroborationCount * 15);
    return score > 100 ? 100 : score;
}

// Helper to verify Proof of Work (Hashcash style)
// For MVP, we expect a SHA-256 hash of "docHash:nonce" to start with "000" (12 bits)
function verifyPoW(docHash, nonce) {
    const data = `${docHash}:${nonce}`;
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return hash.startsWith('000');
}

// GET /api/documents - List all documents
app.get('/api/documents', (req, res) => {
    db.all(`SELECT * FROM documents ORDER BY score DESC, timestamp DESC`, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST /api/upload - Upload a new document and register it
app.post('/api/upload', upload.single('document'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { docHash, nonce, zkCredentialFlag } = req.body;

    if (!docHash || !nonce) {
        return res.status(400).json({ error: 'docHash and nonce are required' });
    }

    // Verify Proof of Work
    if (!verifyPoW(docHash, nonce)) {
        return res.status(400).json({ error: 'Invalid Proof of Work' });
    }

    const isZk = zkCredentialFlag === 'true' ? 1 : 0;
    const cid = 'ipfs-mock-' + req.file.filename; // Mock CID

    // Check if document already exists
    db.get(`SELECT * FROM documents WHERE docHash = ?`, [docHash], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (row) {
            // Document exists, corroborate it
            const newCount = row.corroborationCount + 1;
            const newScore = calculateScore(newCount, row.zkCredentialFlag);

            db.run(`UPDATE documents SET corroborationCount = ?, score = ? WHERE docHash = ?`,
                [newCount, newScore, docHash],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ message: 'Document corroborated successfully', docHash, newCount, newScore });
                }
            );
        } else {
            // New document
            const initialCount = 1;
            const initialScore = calculateScore(initialCount, isZk);
            const timestamp = Math.floor(Date.now() / 1000);

            db.run(`INSERT INTO documents (docHash, cid, timestamp, proofOfWorkNonce, corroborationCount, zkCredentialFlag, score)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [docHash, cid, timestamp, nonce, initialCount, isZk, initialScore],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({ message: 'Document registered successfully', docHash, score: initialScore });
                }
            );
        }
    });
});

// Serve frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
});
