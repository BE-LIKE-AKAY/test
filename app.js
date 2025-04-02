// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyABC...",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-bucket.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abc123..."
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// State Management
let currentUser = null;
let currentRoom = null;
let unsubscribeMessages = null;

// Auth State Listener
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        initApp();
    } else {
        showAuthScreen();
    }
});

// Authentication Handler
async function handleAuth(action) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        if (action === 'signup') {
            await auth.createUserWithEmailAndPassword(email, password);
            await createUserProfile();
        } else {
            await auth.signInWithEmailAndPassword(email, password);
        }
    } catch (error) {
        showError(error.message);
    }
}

// User Profile Creation
async function createUserProfile() {
    await db.collection('users').doc(currentUser.uid).set({
        email: currentUser.email,
        name: currentUser.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        rooms: []
    });
}

// Room Management
async function createRoom() {
    try {
        const roomId = generateRoomId();
        await db.collection('rooms').doc(roomId).set({
            name: `Room ${roomId.slice(0,5)}`,
            owner: currentUser.uid,
            members: [currentUser.uid],
            createdAt: new Date()
        });
        joinRoom(roomId);
    } catch (error) {
        showError(error.message);
    }
}

function generateRoomId() {
    return Math.random().toString(36).substr(2, 9);
}

// Real-time Chat
function setupChatListener(roomId) {
    if (unsubscribeMessages) unsubscribeMessages();

    unsubscribeMessages = db.collection('messages')
        .where('roomId', '==', roomId)
        .orderBy('timestamp')
        .onSnapshot(snapshot => {
            const container = document.getElementById('messagesContainer');
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const msg = change.doc.data();
                    container.appendChild(createMessageElement(msg));
                    container.scrollTop = container.scrollHeight;
                }
            });
        });
}

function createMessageElement(msg) {
    const div = document.createElement('div');
    div.className = `message ${msg.sender === currentUser.uid ? 'sent' : ''}`;
    div.innerHTML = `
        <div class="message-content">${msg.text}</div>
        <div class="message-footer">
            <span class="timestamp">${new Date(msg.timestamp?.toDate()).toLocaleTimeString()}</span>
            <div class="reactions">
                ${Object.entries(msg.reactions || {}).map(([emoji, count]) => `
                    <span class="reaction" onclick="addReaction('${emoji}', '${msg.id}')">
                        ${emoji} ${count}
                    </span>
                `).join('')}
            </div>
        </div>
    `;
    return div;
}

// Message Handling
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (text && currentRoom) {
        try {
            await db.collection('messages').add({
                roomId: currentRoom,
                sender: currentUser.uid,
                text: text,
                timestamp: new Date(),
                reactions: {}
            });
            input.value = '';
        } catch (error) {
            showError(error.message);
        }
    }
}

// UI Helpers
function initApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    loadUserProfile();
    loadRooms();
}

function showAuthScreen() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}
