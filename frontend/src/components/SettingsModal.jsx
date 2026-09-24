import { useState, useEffect } from 'react';
import { Modal, Tab, Nav } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import * as api from '../api';

export default function SettingsModal({ show, onHide }) {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const [profileForm, setProfileForm] = useState({ full_name: '', shop_name: '', category: 'Kirana', location: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user && show) {
      setProfileForm({
        full_name: user.full_name || '',
        shop_name: user.shop?.name || '',
        category: user.shop?.category || 'Kirana',
        location: user.shop?.location || '',
      });
      setProfileMsg({ type: '', text: '' });
      setPwMsg({ type: '', text: '' });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    }
  }, [user, show]);

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg({ type: '', text: '' });
    try {
      await api.updateProfile(profileForm);
      await refreshUser();
      setProfileMsg({ type: 'success', text: 'Your details have been updated.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err?.response?.data?.detail || 'Could not save changes.' });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e) {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });

    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setPwSaving(true);
    try {
      await api.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err?.response?.data?.detail || 'Could not change password.' });
    } finally {
      setPwSaving(false);
    }
  }

  function MsgBanner({ msg }) {
    if (!msg.text) return null;
    const isError = msg.type === 'error';
    return (
      <div
        className="mb-3"
        style={{
          background: isError ? '#FCEAEA' : '#E9F7F4',
          color: isError ? '#E85555' : '#0FA28C',
          padding: '10px 14px',
          borderRadius: 10,
          fontSize: 13.5,
        }}
      >
        {msg.text}
      </div>
    );
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="section-title" style={{ fontSize: 18 }}>
          Settings
        </Modal.Title>
      </Modal.Header>
      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <Modal.Body>
          <Nav variant="pills" className="mb-4 gap-2">
            <Nav.Item>
              <Nav.Link eventKey="profile" className="chip-filter" style={{ border: 'none' }}>
                <i className="bi bi-person-fill me-1"></i> Shop & Profile
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="password" className="chip-filter" style={{ border: 'none' }}>
                <i className="bi bi-shield-lock-fill me-1"></i> Password
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            <Tab.Pane eventKey="profile">
              <form onSubmit={handleProfileSave}>
                <MsgBanner msg={profileMsg} />

                <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Your name</label>
                <input
                  className="ss-input mb-3"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  required
                />

                <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Shop name</label>
                <input
                  className="ss-input mb-3"
                  value={profileForm.shop_name}
                  onChange={(e) => setProfileForm({ ...profileForm, shop_name: e.target.value })}
                  required
                />

                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Category</label>
                    <select
                      className="ss-input"
                      value={profileForm.category}
                      onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                    >
                      <option>Kirana</option>
                      <option>Pharmacy</option>
                      <option>Stationery</option>
                      <option>Hardware</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Location</label>
                    <input
                      className="ss-input"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                    />
                  </div>
                </div>

                <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Email (cannot be changed)</label>
                <input className="ss-input mb-4" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />

                <button type="submit" className="btn-ss-primary" disabled={profileSaving}>
                  {profileSaving ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </Tab.Pane>

            <Tab.Pane eventKey="password">
              <form onSubmit={handlePasswordSave}>
                <MsgBanner msg={pwMsg} />

                <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Current password</label>
                <input
                  className="ss-input mb-3"
                  type="password"
                  value={pwForm.current_password}
                  onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                  required
                />

                <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>New password</label>
                <input
                  className="ss-input mb-3"
                  type="password"
                  minLength={6}
                  value={pwForm.new_password}
                  onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                  required
                />

                <label className="fw-semibold mb-2 d-block" style={{ fontSize: 13 }}>Confirm new password</label>
                <input
                  className="ss-input mb-4"
                  type="password"
                  minLength={6}
                  value={pwForm.confirm_password}
                  onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                  required
                />

                <button type="submit" className="btn-ss-primary" disabled={pwSaving}>
                  {pwSaving ? 'Updating…' : 'Change password'}
                </button>
              </form>
            </Tab.Pane>
          </Tab.Content>
        </Modal.Body>
      </Tab.Container>
    </Modal>
  );
}
