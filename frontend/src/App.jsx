import { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import './App.css';

function App() {
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [zkCredentialFlag, setZkCredentialFlag] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch documents from backend
  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        console.error('Failed to fetch documents');
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchDocuments, 10000);
    return () => clearInterval(interval);
  }, []);

  const minePoW = (docHash) => {
    return new Promise((resolve) => {
      let nonce = 0;
      setStatusMessage('Mining Proof of Work... (this may take a moment)');

      // Use setTimeout to avoid blocking the UI completely
      const mineChunk = () => {
        for (let i = 0; i < 5000; i++) {
          const data = `${docHash}:${nonce}`;
          const hash = CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);

          if (hash.startsWith('000')) {
            resolve(nonce);
            return;
          }
          nonce++;
        }
        setTimeout(mineChunk, 0);
      };

      mineChunk();
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setStatusMessage('Reading file...');

    try {
      // 1. Read file and generate hash
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileContent = event.target.result;

        // Convert ArrayBuffer to WordArray for CryptoJS
        const wordArray = CryptoJS.lib.WordArray.create(fileContent);
        const docHash = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);

        // 2. Perform Proof of Work
        const nonce = await minePoW(docHash);

        setStatusMessage('Uploading document and submitting PoW...');

        // 3. Upload to backend
        const formData = new FormData();
        formData.append('document', file);
        formData.append('docHash', docHash);
        formData.append('nonce', nonce);
        formData.append('zkCredentialFlag', zkCredentialFlag);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          setStatusMessage(`Success! ${result.message} (Score: ${result.score})`);
          setFile(null);
          setZkCredentialFlag(false);
          fetchDocuments();
        } else {
          const error = await response.json();
          setStatusMessage(`Error: ${error.error || 'Upload failed'}`);
        }
        setIsUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error(err);
      setStatusMessage(`Error: ${err.message}`);
      setIsUploading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Samizdat</h1>
        <p>Free platform, auto-validation without money.</p>
        <p className="pitch">
          The truth is not bought here. It is corroborated.
        </p>
      </header>

      <main>
        <section className="upload-section">
          <h2>Upload an Investigation</h2>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                disabled={isUploading}
                required
              />
            </div>
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={zkCredentialFlag}
                  onChange={(e) => setZkCredentialFlag(e.target.checked)}
                  disabled={isUploading}
                />
                Include ZK Credential (simulated)
              </label>
              <small>Optionally prove you are part of a verified organization without revealing your identity.</small>
            </div>

            <button type="submit" disabled={!file || isUploading}>
              {isUploading ? 'Processing...' : 'Upload Document'}
            </button>

            {statusMessage && <p className="status-message">{statusMessage}</p>}
          </form>
        </section>

        <section className="feed-section">
          <h2>Public Feed</h2>
          {documents.length === 0 ? (
            <p>No documents found.</p>
          ) : (
            <div className="documents-list">
              {documents.map((doc) => (
                <div key={doc.docHash} className="document-card">
                  <div className="doc-header">
                    <span className="doc-score" title="Validity Score">Score: {doc.score}/100</span>
                    <span className="doc-corroborations" title="Independent Corroborations">
                      {doc.corroborationCount} Source{doc.corroborationCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="doc-body">
                    <p><strong>Hash:</strong> {doc.docHash.substring(0, 16)}...</p>
                    <p><strong>CID:</strong> {doc.cid}</p>
                    <p><strong>Registered:</strong> {new Date(doc.timestamp * 1000).toLocaleString()}</p>
                    {doc.zkCredentialFlag === 1 && (
                      <span className="zk-badge">✓ Verified Organization ZK Proof</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;