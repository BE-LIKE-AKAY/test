let currentUser = null;
let currentRoom = null;
let unsubscribeMessages = null;

// Auth State Listener
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        showApp();
        loadProfile();
        loadRooms();
    } else {
        showAuth();
    }
});

// Auth Functions
async function signUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set({
            email,
            name: '',
            dob: null,
            rooms: []
        });
    } catch (error) {
        showError(error.message);
    }
}

async function signIn() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        showError(error.message);
    }
}

function logout() {
    auth.signOut();
    if (unsubscribeMessages) unsubscribeMessages();
}

// Room Management
async function createRoom() {
    const roomId = generateId();
    await db.collection('rooms').doc(roomId).set({
        name: `Room ${roomId.substring(0,5)}`,
        owner: currentUser.uid,
        members: [currentUser.uid],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    joinRoom(roomId);
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function loadRooms() {
    db.collection('rooms').where('members', 'array-contains', currentUser.uid)
        .onSnapshot(snapshot => {
            const roomsList = document.getElementById('roomsList');
            roomsList.innerHTML = '';
            snapshot.forEach(doc => {
                const room = doc.data();
                roomsList.innerHTML += `
                    <div class="room-item" onclick="joinRoom('${doc.id}')">
                        <i class="mdi mdi-chat"></i>
                        ${room.name}
                        ${room.owner === currentUser.uid ? '<span class="owner-badge">👑</span>' : ''}
                    </div>
                `;
            });
        });
}

// Chat Functions
function joinRoom(roomId) {
    currentRoom = roomId;
    document.getElementById('currentRoomId').textContent = roomId;
    
    if (unsubscribeMessages) unsubscribeMessages();
    
    unsubscribeMessages = db.collection('messages')
        .where('roomId', '==', roomId)
        .orderBy('timestamp')
        .onSnapshot(snapshot => {
            const container = document.getElementById('messagesContainer');
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const msg = change.doc.data();
                    container.appendChild(createMessageElement(msg, change.doc.id));
                }
            });
            container.scrollTop = container.scrollHeight;
        });
}

function createMessageElement(msg, id) {
    const div = document.createElement('div');
    div.className = `message ${msg.sender === currentUser.uid ? 'sent' : 'received'}`;
    div.innerHTML = `
        <div class="message-content">${msg.text}</div>
        <div class="message-footer">
            <div class="reactions">
                ${Object.entries(msg.reactions || {}).map(([emoji, count]) => `
                    <span class="reaction" onclick="addReaction('${emoji}', '${id}')">
                        ${emoji} ${count}
                    </span>
                `).join('')}
            </div>
            <span class="timestamp">${msg.timestamp?.toDate().toLocaleTimeString()}</span>
        </div>
    `;
    return div;
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    await db.collection('messages').add({
        roomId: currentRoom,
        sender: currentUser.uid,
        text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        reactions: {}
    });
    input.value = '';
}

// Profile Management
async function loadProfile() {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    const user = doc.data();
    document.getElementById('userName').textContent = user.name || user.email;
    document.getElementById('profileName').value = user.name || '';
    document.getElementById('profileEmail').value = user.email;
    document.getElementById('profileDOB').value = user.dob || '';
}

async function updateProfile() {
    const updates = {
        name: document.getElementById('profileName').value,
        email: document.getElementById('profileEmail').value,
        dob: document.getElementById('profileDOB').value
    };

    try {
        await currentUser.updateEmail(updates.email);
        if (document.getElementById('profilePassword').value) {
            await currentUser.updatePassword(document.getElementById('profilePassword').value);
        }
        await db.collection('users').doc(currentUser.uid).update(updates);
        toggleProfileModal();
        loadProfile();
    } catch (error) {
        showError(error.message);
    }
}

// UI Functions
function showApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

function showAuth() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

function toggleProfileModal() {
    document.getElementById('profileModal').classList.toggle('hidden');
}

function toggleInviteModal() {
    document.getElementById('inviteModal').classList.toggle('hidden');
}

function showError(message) {
    // Implement error toast
    console.error(message);
}