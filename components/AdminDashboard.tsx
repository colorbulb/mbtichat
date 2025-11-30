/**
 * AdminDashboard Component
 * 
 * Comprehensive admin interface for managing users and monitoring chat activity.
 * Features include:
 * - User creation, editing, deletion, and visibility management
 * - Real-time user and chat room monitoring
 * - Bootstrap-based UI (reactstrap) for professional admin interface
 * 
 * State Management:
 * - Uses separate states for data (users, chats), loading/saving status, and form data
 * - Global loading state for data refresh, specific states (creating, saving) for actions
 * 
 * Note: Error/success messages are managed at component level. For larger apps,
 * consider a dedicated Toast/notification system to handle multiple messages.
 */
import React, { useState, useEffect } from 'react';
import { store } from '../services/store';
import { User, ChatRoom, Gender } from '../types';
import { MBTI_PROFILES } from '../constants';
import DevTools from './DevTools';
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Alert,
  Table,
  Badge,
  Spinner,
  Input as SwitchInput,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
} from 'reactstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

export const AdminDashboard: React.FC = () => {
  console.log('🔍 [AdminDashboard] Component rendered');
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // User Creation State
  const [newUser, setNewUser] = useState({
    username: '', email: '', password: 'password', birthDate: '2000-01-01', gender: 'Male' as Gender, mbti: 'INTJ'
  });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // User Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    mbti: 'INTJ',
    gender: 'Male' as Gender,
    birthDate: '2000-01-01',
    apiCallLimit: 10
  });
  const [saving, setSaving] = useState(false);

  // Personality Phrases State
  const [showPhrasesModal, setShowPhrasesModal] = useState(false);
  const [selectedMBTI, setSelectedMBTI] = useState<string>('INTJ');
  const [phrases, setPhrases] = useState<Record<string, string[]>>({});
  const [newPhrase, setNewPhrase] = useState<string>('');

  /**
   * Refreshes user and chat data from Firestore
   * Called on component mount and after user operations
   */
  const refreshData = async () => {
    console.log('🔍 [AdminDashboard] Refreshing data...');
    setLoading(true);
    try {
    const u = await store.getAllUsers();
    const c = await store.getAllChats();
      console.log('🔍 [AdminDashboard] Users loaded:', u.length);
    setUsers(u);
    setChats(c);
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      setErrorMsg(`Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 [AdminDashboard] useEffect - Initial load');
    refreshData();
  }, []);

  /**
   * Handles user creation by admin
   * Creates both Firebase Auth user and Firestore user document
   * Includes delay before refresh to ensure Firestore consistency
   * 
   * TODO: Consider using useCallback for performance optimization
   */
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setCreating(true);
    
    try {
      console.log('🔍 [AdminDashboard] Creating user:', newUser);
      const createdUser = await store.adminCreateUser({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        birthDate: newUser.birthDate,
        gender: newUser.gender,
        mbti: newUser.mbti,
      bio: 'Created by Admin',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.username}`
    });
      
      console.log('🔍 [AdminDashboard] User created successfully:', createdUser);
      setSuccessMsg(`User ${newUser.username} created with email ${newUser.email}!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      
      // Reset form
      setNewUser({ username: '', email: '', password: 'password', birthDate: '2000-01-01', gender: 'Male', mbti: 'INTJ' });
      
      // Refresh data after a short delay to ensure Firestore has updated
      setTimeout(() => {
        console.log('🔍 [AdminDashboard] Refreshing after user creation...');
        refreshData();
      }, 500);
    } catch (error: any) {
      console.error('🔍 [AdminDashboard] Error creating user:', error);
      setErrorMsg(`Error creating user: ${error.message}`);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) {
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const success = await store.deleteUser(userId);
      if (success) {
        setSuccessMsg(`User ${username} deleted!`);
        setTimeout(() => setSuccessMsg(''), 3000);
        await refreshData();
      } else {
        setErrorMsg(`Failed to delete user ${username}`);
        setTimeout(() => setErrorMsg(''), 5000);
      }
    } catch (error: any) {
      setErrorMsg(`Error deleting user: ${error.message}`);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Opens edit modal and populates form with user data
   * Admin can edit: username, MBTI, gender, birthdate, API call limit
   */
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      mbti: user.mbti,
      gender: user.gender,
      birthDate: user.birthDate,
      apiCallLimit: user.apiCallLimit ?? 10
    });
  };

  /**
   * Saves edited user profile
   * Updates user document in Firestore with new values
   */
  const handleSaveEdit = async () => {
    if (!editingUser) return;
    
    setSaving(true);
    setErrorMsg('');
    try {
      const updated = await store.updateUserProfile(editingUser.id, {
        username: editFormData.username,
        mbti: editFormData.mbti,
        gender: editFormData.gender,
        birthDate: editFormData.birthDate,
        apiCallLimit: editFormData.apiCallLimit
      });
      
      if (updated) {
        setSuccessMsg(`User ${editFormData.username} updated successfully!`);
        setTimeout(() => setSuccessMsg(''), 3000);
        setEditingUser(null);
        await refreshData();
      } else {
        setErrorMsg('Failed to update user');
        setTimeout(() => setErrorMsg(''), 5000);
      }
    } catch (error: any) {
      setErrorMsg(`Error updating user: ${error.message}`);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Loads personality phrases for management
   */
  const loadPhrases = async () => {
    try {
      const allPhrases = await store.getAllPersonalityPhrases();
      setPhrases(allPhrases);
    } catch (error: any) {
      setErrorMsg(`Error loading phrases: ${error.message}`);
    }
  };

  /**
   * Opens phrases management modal
   */
  const handleOpenPhrasesModal = async () => {
    await loadPhrases();
    setShowPhrasesModal(true);
  };

  /**
   * Adds a new phrase for selected MBTI
   */
  const handleAddPhrase = async () => {
    if (!newPhrase.trim()) return;
    
    try {
      const currentPhrases = phrases[selectedMBTI] || [];
      const updatedPhrases = [...currentPhrases, newPhrase.trim()];
      await store.setPersonalityPhrases(selectedMBTI, updatedPhrases);
      setPhrases({ ...phrases, [selectedMBTI]: updatedPhrases });
      setNewPhrase('');
      setSuccessMsg(`Phrase added for ${selectedMBTI}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error adding phrase: ${error.message}`);
    }
  };

  /**
   * Removes a phrase for selected MBTI
   */
  const handleRemovePhrase = async (phrase: string) => {
    try {
      const currentPhrases = phrases[selectedMBTI] || [];
      const updatedPhrases = currentPhrases.filter(p => p !== phrase);
      await store.setPersonalityPhrases(selectedMBTI, updatedPhrases);
      setPhrases({ ...phrases, [selectedMBTI]: updatedPhrases });
      setSuccessMsg(`Phrase removed!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error: any) {
      setErrorMsg(`Error removing phrase: ${error.message}`);
    }
  };

  const handleToggleVisibility = async (userId: string, username: string, currentVisibility: boolean) => {
    setErrorMsg('');
    setLoading(true);
    try {
      const updated = await store.updateUserProfile(userId, {
        visibleToUsers: !currentVisibility
      });
      if (updated) {
        setSuccessMsg(`User ${username} visibility ${!currentVisibility ? 'enabled' : 'disabled'}!`);
        setTimeout(() => setSuccessMsg(''), 3000);
        await refreshData();
      } else {
        setErrorMsg(`Failed to update visibility for ${username}`);
        setTimeout(() => setErrorMsg(''), 5000);
      }
    } catch (error: any) {
      setErrorMsg(`Error updating visibility: ${error.message}`);
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DevTools />
      <Container fluid className="py-4" style={{ backgroundColor: '#111827', minHeight: '100vh', color: 'white' }}>
        <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="text-danger mb-0">Master Admin Dashboard</h1>
            <Button color="info" onClick={handleOpenPhrasesModal}>
              Manage Personality Phrases
            </Button>
          </div>
        </Col>
      </Row>
      
      {/* Create User Section */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-dark border-secondary">
            <CardHeader className="bg-dark border-secondary">
              <h3 className="text-info mb-0">Create New User</h3>
            </CardHeader>
            <CardBody>
              {successMsg && (
                <Alert color="success" className="mb-3">
                  {successMsg}
                </Alert>
              )}
              {errorMsg && (
                <Alert color="danger" className="mb-3">
                  {errorMsg}
                </Alert>
              )}
              
              <Form onSubmit={handleCreateUser}>
                <Row>
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">Username *</Label>
                      <Input
                        type="text"
              value={newUser.username} 
              onChange={e => setNewUser({...newUser, username: e.target.value})} 
              required
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
                      />
                    </FormGroup>
                  </Col>
                  
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">Email *</Label>
                      <Input
                        type="email"
                        value={newUser.email}
                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                        required
                        placeholder="user@example.com"
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
                      />
                      <small className="text-muted">Required - links to Firebase Auth</small>
                    </FormGroup>
                  </Col>
                  
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">Password *</Label>
                      <Input
                        type="password"
                        value={newUser.password}
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                        required
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
                      />
                    </FormGroup>
                  </Col>
                  
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">Date of Birth</Label>
                      <Input
              type="date"
              value={newUser.birthDate} 
              onChange={e => setNewUser({...newUser, birthDate: e.target.value})} 
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
                      />
                    </FormGroup>
                  </Col>
                  
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">Gender</Label>
                      <Input
                        type="select"
              value={newUser.gender}
              onChange={e => setNewUser({...newUser, gender: e.target.value as Gender})}
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
                      </Input>
                    </FormGroup>
                  </Col>
                  
                  <Col md={6} lg={4} className="mb-3">
                    <FormGroup>
                      <Label className="text-white">MBTI</Label>
                      <Input
                        type="select"
              value={newUser.mbti}
              onChange={e => setNewUser({...newUser, mbti: e.target.value})}
                        className="bg-dark text-white border-secondary"
                        disabled={creating}
                      >
                        {MBTI_PROFILES.map(p => (
                          <option key={p.code} value={p.code}>{p.code}</option>
                        ))}
                      </Input>
                    </FormGroup>
                  </Col>
                  
                  <Col md={12} className="mb-3">
                    <Button 
                      type="submit" 
                      color="primary" 
                      disabled={creating}
                      className="w-100"
                    >
                      {creating ? (
                        <>
                          <Spinner size="sm" className="me-2" />
                          Creating...
                        </>
                      ) : (
                        'Create User'
                      )}
                    </Button>
                  </Col>
                </Row>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* User List */}
        <Col lg={6} className="mb-4">
          <Card className="bg-dark border-secondary">
            <CardHeader className="bg-dark border-secondary d-flex justify-content-between align-items-center">
              <h4 className="mb-0 text-white">Registered Users</h4>
              <div className="d-flex align-items-center gap-2">
                <Button
                  size="sm"
                  color="secondary"
                  onClick={refreshData}
                  disabled={loading}
                  outline
                >
                  {loading ? <Spinner size="sm" /> : '↻ Refresh'}
                </Button>
                {loading ? (
                  <Spinner size="sm" color="light" />
                ) : (
                  <Badge color="info">{users.length}</Badge>
                )}
                  </div>
            </CardHeader>
            <CardBody>
              {loading && users.length === 0 ? (
                <div className="text-center py-4">
                  <Spinner color="light" />
                  <p className="text-muted mt-2">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <p className="text-muted text-center py-4">No users found</p>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <Table dark hover responsive>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Details</th>
                        <th>Visible</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <img
                                src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`}
                                alt={u.username}
                                className="rounded-circle me-2"
                                style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                              />
                              <div>
                                <div className="fw-bold text-white">
                                  {u.username || 'N/A'}
                                  {u.isAdmin && (
                                    <Badge color="danger" className="ms-2">ADMIN</Badge>
                                  )}
                                  <span className={`ms-2 badge ${u.isOnline ? 'bg-success' : 'bg-secondary'}`}>
                                    {u.isOnline ? '●' : '○'}
                                  </span>
                                </div>
                                <small className="text-muted">{u.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <small className="text-muted">
                              {u.mbti} • {u.gender} • {u.age} y/o
                              {u.role && ` • ${u.role}`}
                              <br />
                              API: {u.apiCallsUsed ?? 0}/{u.apiCallLimit ?? 10}
                            </small>
                          </td>
                          <td>
                            {!u.isAdmin ? (
                              <div className="form-check form-switch">
                                <Input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={u.visibleToUsers !== false}
                                  onChange={() => handleToggleVisibility(u.id, u.username, u.visibleToUsers !== false)}
                                  disabled={loading}
                                  style={{ cursor: 'pointer' }}
                                />
                                <Label className="form-check-label text-white ms-2" style={{ fontSize: '0.875rem' }}>
                                  {u.visibleToUsers !== false ? 'Yes' : 'No'}
                                </Label>
                              </div>
                            ) : (
                              <Badge color="secondary">N/A</Badge>
                            )}
                          </td>
                          <td>
                            {!u.isAdmin && (
                              <div className="d-flex gap-2">
                                <Button
                                  size="sm"
                                  color="primary"
                                  onClick={() => handleEditUser(u)}
                                  disabled={loading}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  color="danger"
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  disabled={loading}
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>

        {/* Chat Rooms */}
        <Col lg={6} className="mb-4">
          <Card className="bg-dark border-secondary">
            <CardHeader className="bg-dark border-secondary d-flex justify-content-between align-items-center">
              <h4 className="mb-0 text-white">Active Chat Rooms</h4>
              {loading ? (
                <Spinner size="sm" color="light" />
              ) : (
                <Badge color="info">{chats.length}</Badge>
              )}
            </CardHeader>
            <CardBody>
              {loading && chats.length === 0 ? (
                <div className="text-center py-4">
                  <Spinner color="light" />
                  <p className="text-muted mt-2">Loading chats...</p>
                </div>
              ) : chats.length === 0 ? (
                <p className="text-muted text-center py-4">No active chats</p>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {chats.map(chat => {
              const u1 = users.find(u => u.id === chat.participants[0]);
              const u2 = users.find(u => u.id === chat.participants[1]);
              return (
                <div 
                  key={chat.id} 
                  onClick={() => setSelectedChat(chat)}
                        className={`p-3 mb-2 rounded border cursor-pointer ${
                          selectedChat?.id === chat.id
                            ? 'bg-primary bg-opacity-25 border-primary'
                            : 'bg-secondary bg-opacity-10 border-secondary'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-bold text-info">
                      {u1?.username || chat.participants[0]} & {u2?.username || chat.participants[1]}
                    </span>
                          {chat.lastMessage ? (
                            <Badge color="success">Active</Badge>
                          ) : (
                            <Badge color="secondary">No messages</Badge>
                          )}
                  </div>
                </div>
              );
            })}
          </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Admin Chat Viewer */}
      {selectedChat && (
        <Row>
          <Col>
            <Card className="bg-dark border-secondary">
              <CardHeader className="bg-dark border-secondary">
                <h4 className="mb-0 text-white">Chat Log: {selectedChat.id}</h4>
              </CardHeader>
              <CardBody>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="bg-black bg-opacity-50 p-3 rounded">
                  {selectedChat.messages.length === 0 ? (
                    <p className="text-muted text-center">No messages in this chat</p>
                  ) : (
                    selectedChat.messages.map(msg => {
                const sender = users.find(u => u.id === msg.senderId);
                return (
                        <div key={msg.id} className="mb-3 pb-3 border-bottom border-secondary">
                          <span className="fw-bold text-info">{sender?.username || msg.senderId}: </span>
                          {msg.type === 'text' && <span className="text-white">{msg.text}</span>}
                          {msg.type === 'image' && <Badge color="primary">[Image]</Badge>}
                          {msg.type === 'sticker' && <Badge color="warning">[Sticker]</Badge>}
                    {msg.translatedText && (
                            <div className="ms-4 mt-1">
                              <small className="text-success fst-italic">Translated: {msg.translatedText}</small>
        </div>
      )}
    </div>
                      );
                    })
                  )}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {/* Edit User Modal */}
      <Modal isOpen={editingUser !== null} toggle={() => setEditingUser(null)}>
        <ModalHeader toggle={() => setEditingUser(null)}>
          Edit User: {editingUser?.username}
        </ModalHeader>
        <ModalBody>
          <Form>
            <FormGroup>
              <Label>Username</Label>
              <Input
                type="text"
                value={editFormData.username}
                onChange={e => setEditFormData({...editFormData, username: e.target.value})}
                placeholder="Username"
              />
            </FormGroup>
            
            <FormGroup>
              <Label>MBTI</Label>
              <Input
                type="select"
                value={editFormData.mbti}
                onChange={e => setEditFormData({...editFormData, mbti: e.target.value})}
              >
                {MBTI_PROFILES.map(p => (
                  <option key={p.code} value={p.code}>{p.code}</option>
                ))}
              </Input>
            </FormGroup>
            
            <FormGroup>
              <Label>Gender</Label>
              <Input
                type="select"
                value={editFormData.gender}
                onChange={e => setEditFormData({...editFormData, gender: e.target.value as Gender})}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </Input>
            </FormGroup>
            
            <FormGroup>
              <Label>Birth Date</Label>
              <Input
                type="date"
                value={editFormData.birthDate}
                onChange={e => setEditFormData({...editFormData, birthDate: e.target.value})}
              />
            </FormGroup>
            
            <FormGroup>
              <Label>API Call Limit</Label>
              <Input
                type="number"
                min="0"
                value={editFormData.apiCallLimit}
                onChange={e => setEditFormData({...editFormData, apiCallLimit: parseInt(e.target.value) || 10})}
                placeholder="10"
              />
              <small className="text-muted">Default: 10. Set to 0 for unlimited.</small>
            </FormGroup>
          </Form>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setEditingUser(null)}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleSaveEdit} disabled={saving}>
            {saving ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Personality Phrases Management Modal */}
      <Modal isOpen={showPhrasesModal} toggle={() => setShowPhrasesModal(false)} size="lg">
        <ModalHeader toggle={() => setShowPhrasesModal(false)}>
          Manage Personality Phrases
        </ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Select MBTI Type</Label>
            <Input
              type="select"
              value={selectedMBTI}
              onChange={e => setSelectedMBTI(e.target.value)}
            >
              {MBTI_PROFILES.map(p => (
                <option key={p.code} value={p.code}>{p.code}</option>
              ))}
            </Input>
          </FormGroup>

          <FormGroup>
            <Label>Add New Phrase for {selectedMBTI}</Label>
            <div className="d-flex gap-2">
              <Input
                type="text"
                value={newPhrase}
                onChange={e => setNewPhrase(e.target.value)}
                placeholder="e.g., then...?"
                onKeyPress={e => e.key === 'Enter' && handleAddPhrase()}
              />
              <Button color="primary" onClick={handleAddPhrase} disabled={!newPhrase.trim()}>
                Add
              </Button>
            </div>
          </FormGroup>

          <div className="mt-4">
            <Label>Current Phrases for {selectedMBTI}</Label>
            {phrases[selectedMBTI] && phrases[selectedMBTI].length > 0 ? (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {phrases[selectedMBTI].map((phrase, idx) => (
                  <Badge
                    key={idx}
                    color="info"
                    className="p-2 d-flex align-items-center gap-2"
                    style={{ fontSize: '0.9rem', cursor: 'pointer' }}
                  >
                    {phrase}
                    <span
                      onClick={() => handleRemovePhrase(phrase)}
                      style={{ cursor: 'pointer', marginLeft: '4px' }}
                    >
                      ×
                    </span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-2">No phrases added yet for {selectedMBTI}</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowPhrasesModal(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
      </Container>
    </>
  );
};
