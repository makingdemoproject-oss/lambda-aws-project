import { useState, useEffect, useRef } from 'react';

const DEFAULT_API = localStorage.getItem('s3DemoApi') || 'https://7x5s0zdwi0.execute-api.ap-south-1.amazonaws.com/prod';

export default function S3DemoPage() {
  const [apiUrl, setApiUrl]       = useState(DEFAULT_API);
  const [editApi, setEditApi]     = useState(false);
  const [file, setFile]           = useState(null);
  const [status, setStatus]       = useState('');
  const [uploads, setUploads]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modal, setModal]         = useState(null);
  const fileRef = useRef();

  const saveApi = (v) => { localStorage.setItem('s3DemoApi', v); setApiUrl(v); setEditApi(false); };

  const fetchUploads = async () => {
    try {
      const r = await fetch(`${apiUrl}/uploads`);
      const d = await r.json();
      setUploads(d.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchUploads(); }, [apiUrl]);

  const upload = async () => {
    if (!file) return setStatus('Choose a file first');
    setLoading(true);
    setStatus('Getting presigned URL from Lambda...');
    try {
      const r = await fetch(`${apiUrl}/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'text/csv')}`);
      const { uploadUrl, key } = await r.json();
      setStatus(`Uploading to S3... (key: ${key})`);

      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'text/csv' },
      });

      setStatus('S3 upload done! S3 -> SQS event triggered -> Lambda consumer -> DynamoDB insert...');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';

      setTimeout(fetchUploads, 3000);
      setTimeout(fetchUploads, 6000);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const FLOW_STEPS = [
    { icon: '👤', label: 'User',    desc: 'Selects CSV file in React UI' },
    { icon: '⚡', label: 'Lambda',  desc: 'GET /upload-url → generates S3 presigned PUT URL (5 min expiry)' },
    { icon: '🪣', label: 'S3',      desc: 'Browser PUTs file directly to S3 bucket using presigned URL' },
    { icon: '📨', label: 'SQS',     desc: 'S3 ObjectCreated event → pushed to SQS queue automatically' },
    { icon: '⚡', label: 'Lambda',  desc: 'SQS trigger fires Lambda consumer (batch size 5)' },
    { icon: '🗄️', label: 'DynamoDB', desc: 'Lambda extracts metadata (fileName, size, key, eTag) → PutItem' },
    { icon: '📋', label: 'Table',   desc: 'GET /uploads → Lambda scans DynamoDB → returns all records' },
  ];

  const CODE_SNIPPETS = {
    presigned: `// presignedUrl.js — Lambda
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

exports.handler = async (event) => {
  const { filename, contentType } = event.queryStringParameters;
  const key = \`uploads/\${Date.now()}-\${filename}\`;
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  return { statusCode: 200, body: JSON.stringify({ uploadUrl: url, key }) };
};`,
    sqsConsumer: `// sqsConsumer.js — Lambda (SQS Trigger)
exports.handler = async (event) => {
  for (const sqsRecord of event.Records) {
    const s3Event = JSON.parse(sqsRecord.body);      // S3 event inside SQS body
    for (const s3Record of s3Event.Records) {
      const { bucket, object } = s3Record.s3;
      await dynamo.send(new PutCommand({
        TableName: TABLE,
        Item: {
          fileId: randomUUID(),
          fileName: object.key.split('/').pop(),
          s3Key: object.key,
          bucket: bucket.name,
          fileSize: object.size,
          eTag: object.eTag,
          status: 'processed',
          uploadedAt: new Date().toISOString(),
        },
      }));
    }
  }
};`,
    cloudformation: `# CloudFormation — S3 notification to SQS
UploadsBucket:
  Type: AWS::S3::Bucket
  DependsOn: UploadsQueuePolicy      # queue policy must exist first!
  Properties:
    NotificationConfiguration:
      QueueConfigurations:
        - Event: s3:ObjectCreated:*
          Queue: !GetAtt UploadsQueue.Arn

SqsEventSourceMapping:
  Type: AWS::Lambda::EventSourceMapping
  Properties:
    EventSourceArn: !GetAtt UploadsQueue.Arn
    FunctionName: !GetAtt SqsConsumerFunction.Arn
    BatchSize: 5
    FunctionResponseTypes: [ReportBatchItemFailures]`,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: 'monospace', padding: '20px' }}>

      {/* Header */}
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <a href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}>&larr; ShopSphere</a>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
          S3 &rarr; SQS &rarr; Lambda &rarr; DynamoDB
        </h1>
        <p style={{ color: '#64748b', margin: '0 0 24px', fontSize: 14 }}>
          Upload a CSV file — S3 fires SQS event — Lambda consumes it — metadata saved to DynamoDB
        </p>

        {/* API URL config */}
        <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>API URL:</span>
          {editApi ? (
            <>
              <input
                defaultValue={apiUrl}
                onBlur={e => saveApi(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveApi(e.target.value)}
                autoFocus
                style={{ flex: 1, background: '#0f1117', border: '1px solid #4f46e5', borderRadius: 4, padding: '4px 8px', color: '#e2e8f0', fontSize: 12 }}
              />
              <button onClick={() => setEditApi(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
            </>
          ) : (
            <>
              <code style={{ flex: 1, color: '#a5b4fc', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apiUrl}</code>
              <button onClick={() => setEditApi(true)} style={{ background: 'none', border: '1px solid #2d3148', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}>Edit</button>
            </>
          )}
        </div>

        {/* Architecture Flow */}
        <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1 }}>Architecture Flow</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
            {FLOW_STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  onClick={() => setModal(step)}
                  style={{ cursor: 'pointer', background: '#0f1117', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', textAlign: 'center', minWidth: 80 }}
                >
                  <div style={{ fontSize: 20 }}>{step.icon}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{step.label}</div>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div style={{ color: '#4f46e5', fontSize: 18, padding: '0 4px' }}>&rarr;</div>
                )}
              </div>
            ))}
          </div>
          <p style={{ color: '#475569', fontSize: 11, marginTop: 12, marginBottom: 0 }}>Click any box to see details</p>
        </div>

        {/* Upload Card */}
        <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1 }}>Upload CSV File</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={e => setFile(e.target.files[0])}
              style={{ color: '#e2e8f0', fontSize: 13 }}
            />
            <button
              onClick={upload}
              disabled={loading || !file}
              style={{
                background: loading ? '#334155' : '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 20px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {loading ? 'Uploading...' : 'Upload to S3'}
            </button>
            <button
              onClick={fetchUploads}
              style={{ background: 'none', border: '1px solid #334155', borderRadius: 6, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontFamily: 'monospace', fontSize: 13 }}
            >
              Refresh Table
            </button>
          </div>
          {status && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#0f1117', borderRadius: 6, border: '1px solid #334155' }}>
              <code style={{ fontSize: 12, color: '#a5b4fc' }}>{status}</code>
            </div>
          )}
          {/* Code snippets */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(CODE_SNIPPETS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setModal({ icon: '📄', label: k, desc: v })}
                style={{ background: '#0f1117', border: '1px solid #334155', borderRadius: 4, padding: '4px 12px', color: '#64748b', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}
              >
                {k}.js
              </button>
            ))}
          </div>
        </div>

        {/* Uploads Table */}
        <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1 }}>
            DynamoDB Records — csv-file-uploads ({uploads.length})
          </h2>
          {uploads.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 13 }}>No records yet. Upload a file above.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['fileName', 'fileSize', 'status', 'uploadedAt', 's3Key'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((u, i) => (
                    <tr key={u.fileId || i} style={{ borderBottom: '1px solid #1e2130' }}>
                      <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{u.fileName}</td>
                      <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{u.fileSize ? `${(u.fileSize / 1024).toFixed(1)} KB` : '-'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ background: u.status === 'processed' ? '#14532d' : '#1e3a5f', color: u.status === 'processed' ? '#4ade80' : '#60a5fa', padding: '2px 8px', borderRadius: 4 }}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#64748b' }}>{u.uploadedAt ? new Date(u.uploadedAt).toLocaleString() : '-'}</td>
                      <td style={{ padding: '8px 12px', color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.s3Key}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#1e2130', border: '1px solid #334155', borderRadius: 10, padding: 24, maxWidth: 680, width: '100%', maxHeight: '80vh', overflow: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#f1f5f9' }}>{modal.icon} {modal.label}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <pre style={{ background: '#0f1117', padding: 16, borderRadius: 6, fontSize: 11, color: '#a5b4fc', overflowX: 'auto', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {modal.desc}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
