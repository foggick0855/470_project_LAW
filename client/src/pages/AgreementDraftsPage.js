// client/src/pages/AgreementDraftsPage.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import {
  listVersions,
  createVersion,
  getVersion,
  getFinalAgreement,
  finalizeAgreement,
} from '../components/agreementsApi';

const AgreementDraftsPage = () => {
  const navigate = useNavigate();
  const { caseId: caseIdFromRoute } = useParams();
  const location = useLocation();

  // caseId may come from /cases/:caseId/agreements or ?caseId=...
  const urlCaseId = new URLSearchParams(location.search).get('caseId');
  const caseId = useMemo(() => caseIdFromRoute || urlCaseId, [caseIdFromRoute, urlCaseId]);

  // Optional title passed from CaseDetail via navigate state
  const passedTitle = location.state?.caseTitle || '';
  const [caseTitle, setCaseTitle] = useState(passedTitle);

  // ✅ Get role from JWT (not localStorage 'role')
  const [isMediator, setIsMediator] = useState(false);
  useEffect(() => {
    try {
      const token = localStorage.getItem('token') || '';
      const { role } = jwtDecode(token) || {};
      setIsMediator(role === 'Mediator'); // UI allows Mediator only; backend enforces too
    } catch {
      setIsMediator(false);
    }
  }, []);

  const editorRef = useRef(null);
  const [content, setContent] = useState('');
  const [versions, setVersions] = useState([]);
  const [isFinalized, setIsFinalized] = useState(false);
  const [finalDoc, setFinalDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!caseId) return;
    if (!caseTitle) fetchCaseTitle(caseId);
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function fetchCaseTitle(id) {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`/api/cases/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCaseTitle(data?.case?.title || '');
    } catch { /* ignore */ }
  }

  async function boot() {
    setLoading(true);
    setMsg('');
    try {
      // 1) Try final, but silently ignore 404 (means "no final yet")
      try {
        const finalRes = await getFinalAgreement(caseId);
        if (finalRes?.success) {
          setIsFinalized(true);
          setFinalDoc(finalRes.final);
          return;
        }
      } catch (e) {
        if (!(e?.response?.status === 404)) {
          console.error(e);
          toast('Failed to load final agreement', true);
        }
      }

      // 2) Load versions
      const listRes = await listVersions(caseId);
      if (listRes?.success) {
        setIsFinalized(!!listRes.finalized);
        setVersions(listRes.versions || []);
        setContent(listRes.versions?.[0]?.content || '');
      }
    } finally {
      setLoading(false);
    }
  }

  function toast(text, isError = false) {
    setMsg(text);
    setTimeout(() => setMsg(''), isError ? 4000 : 2500);
  }

  // Toolbar commands
  function exec(cmd) {
    if (isFinalized) return;
    document.execCommand(cmd, false, null);
    if (editorRef.current) setContent(editorRef.current.innerHTML);
  }

  function onEditorInput() {
    if (editorRef.current) setContent(editorRef.current.innerHTML);
  }

  async function onSaveVersion() {
    if (!caseId) return;
    if (isFinalized) return toast('Agreement is finalized; editing is disabled.', true);
    const clean = (content || '').trim();
    if (!clean) return toast('Write something before saving.', true);

    setBusy(true);
    try {
      const res = await createVersion({ caseId, content: clean });
      if (res?.success) {
        toast('Saved as new version.');
        const listRes = await listVersions(caseId);
        if (listRes?.success) setVersions(listRes.versions || []);
      }
    } catch (e) {
      console.error(e);
      toast('Failed to save version.', true);
    } finally {
      setBusy(false);
    }
  }

  async function openVersion(v) {
    try {
      const res = await getVersion(v._id);
      if (res?.success) {
        setContent(res.version.content || '');
        editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (e) {
      console.error(e);
      toast('Failed to open version.', true);
    }
  }

  async function onFinalize(vId) {
    if (!isMediator) return toast('Only the mediator can finalize.', true);
    const ok = window.confirm(
      'Finalizing will LOCK the agreement and DELETE all previous versions. Continue?'
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await finalizeAgreement({ caseId, versionId: vId || null });
      if (res?.success) {
        setIsFinalized(true);
        setFinalDoc(res.final);
        toast('Agreement finalized and locked.');
      }
    } catch (e) {
      console.error(e);
      toast('Failed to finalize.', true);
    } finally {
      setBusy(false);
    }
  }

  const FinalBanner = () =>
    finalDoc ? (
      <div style={styles.finalBanner}>
        <div><strong>Confirmed and signed by:</strong> {finalDoc.signedByMediatorName}</div>
        <div><strong>Signed at:</strong> {formatDate(finalDoc.signedAt)}</div>
      </div>
    ) : null;

  return (
    <div style={styles.wrap}>
      {/* Title is now dark and readable on white background */}
      <div style={styles.topbar}>
        <h2 style={{ margin: 0, color: '#0f172a' }}>
          Agreement Drafts{caseTitle ? ` — ${caseTitle}` : ''}
        </h2>
        <button
          style={styles.minBtn}
          onClick={() => navigate(`/cases/${caseId}`)}
          title="Back to Case Detail"
        >
          ← Back to Case
        </button>
      </div>

      {!!msg && <div style={{ ...styles.toast, background: '#1f6feb' }}>{msg}</div>}

      {loading ? (
        <div style={styles.empty}>Loading…</div>
      ) : isFinalized && finalDoc ? (
        <div style={styles.row}>
          <div style={{ ...styles.col, flex: 2 }}>
            <div style={{ ...styles.card, color: '#e6edf3' }}>
              <div style={styles.headerRow}>
                <h3 style={{ margin: 0 }}>Final Agreement (Locked)</h3>
              </div>
              <div
                style={styles.viewer}
                dangerouslySetInnerHTML={{ __html: finalDoc.content || '' }}
              />
              <FinalBanner />
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.row}>
          {/* Editor + Actions */}
          <div style={{ ...styles.col, flex: 2 }}>
            <div style={{ ...styles.card, color: '#e6edf3' }}>
              <div style={styles.headerRow}>
                <h3 style={{ margin: 0 }}>Editor</h3>
                <div style={styles.toolbar}>
                  <button style={styles.tbBtn} onClick={() => exec('bold')} title="Bold">B</button>
                  <button style={styles.tbBtn} onClick={() => exec('italic')} title="Italic">I</button>
                  <button style={styles.tbBtn} onClick={() => exec('underline')} title="Underline">U</button>
                  <button style={styles.tbBtn} onClick={() => exec('insertUnorderedList')} title="Bulleted list">••</button>
                </div>
              </div>

              <div
                ref={editorRef}
                style={styles.editor}
                contentEditable
                suppressContentEditableWarning
                onInput={onEditorInput}
                dir="ltr"
                dangerouslySetInnerHTML={{ __html: content }}
              />

              <div style={styles.actions}>
                <button
                  style={styles.primaryBtn}
                  onClick={onSaveVersion}
                  disabled={busy}
                  title="Save as a new version"
                >
                  {busy ? 'Saving…' : 'Save New Version'}
                </button>

                {/* ✅ Finalize buttons visible for Mediator only */}
                {isMediator && (
                  <button
                    style={styles.warnBtn}
                    onClick={() => onFinalize(null)}
                    disabled={busy || versions.length === 0}
                    title="Finalize the latest version (locks document)"
                  >
                    {busy ? 'Finalizing…' : 'Finalize & Sign (Latest)'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Versions */}
          <div style={{ ...styles.col, flex: 1 }}>
            <div style={{ ...styles.card, color: '#e6edf3' }}>
              <div style={styles.headerRow}>
                <h3 style={{ margin: 0 }}>Version History</h3>
              </div>

              {versions.length === 0 ? (
                <div style={styles.empty}>No versions yet. Write and save to create one.</div>
              ) : (
                <ul style={styles.list}>
                  {versions.map((v) => (
                    <li key={v._id} style={styles.listItem}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {v.authorId?.name || 'Unknown'}{' '}
                            <span style={styles.rolePill}>{v.authorId?.role}</span>
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>
                            {formatDate(v.createdAt)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={styles.minBtn} onClick={() => openVersion(v)} title="Open preview">
                            Open
                          </button>
                          {isMediator && (
                            <button
                              style={styles.minWarnBtn}
                              onClick={() => onFinalize(v._id)}
                              title="Finalize this version"
                            >
                              Finalize
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* --------------------------------- Styles -------------------------------- */
const styles = {
  wrap: {
    maxWidth: 1100,
    margin: '24px auto',
    padding: '0 16px',
    color: '#0f172a',
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  row: {
    display: 'flex',
    gap: 16,
    alignItems: 'stretch',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  card: {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,.35)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  toolbar: {
    display: 'flex',
    gap: 8,
  },
  tbBtn: {
    background: '#22272e',
    border: '1px solid #30363d',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    fontWeight: 700,
    color: '#e6edf3',
  },
  editor: {
    minHeight: 220,
    padding: 12,
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
    outline: 'none',
    direction: 'ltr',
    unicodeBidi: 'bidi-override',
    textAlign: 'left',
  },
  viewer: {
    padding: 12,
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: 8,
  },
  actions: {
    marginTop: 12,
    display: 'flex',
    gap: 12,
  },
  primaryBtn: {
    background: '#238636',
    border: '1px solid #2ea043',
    borderRadius: 8,
    padding: '8px 14px',
    fontWeight: 600,
    cursor: 'pointer',
    color: 'white',
  },
  warnBtn: {
    background: '#9e3b3b',
    border: '1px solid #b34747',
    borderRadius: 8,
    padding: '8px 14px',
    fontWeight: 600,
    cursor: 'pointer',
    color: 'white',
  },
  minBtn: {
    background: '#22272e',
    border: '1px solid #30363d',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    color: '#e6edf3',
  },
  minWarnBtn: {
    background: '#6b2a2a',
    border: '1px solid #b34747',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    color: 'white',
  },
  rolePill: {
    marginLeft: 6,
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 999,
    background: '#30363d',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  listItem: {
    padding: 12,
    border: '1px solid #30363d',
    borderRadius: 8,
    background: '#0b1320',
  },
  finalBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    border: '1px dashed #3fb950',
    background: '#071a10',
  },
  toast: {
    marginBottom: 12,
    padding: '8px 12px',
    borderRadius: 8,
    color: 'white',
  },
  empty: {
    opacity: 0.8,
    padding: 12,
  },
};

function formatDate(dt) {
  try {
    const d = new Date(dt);
    return d.toLocaleString();
  } catch {
    return String(dt || '');
  }
}

export default AgreementDraftsPage;
