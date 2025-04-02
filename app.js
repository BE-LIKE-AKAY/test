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
            rooms: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
    try {
        const roomId = db.collection('rooms').doc().id;
        await db.collection('rooms').doc(roomId).set({
            name: `Room ${roomId.substring(0,5)}`,
            owner: currentUser.uid,
            members: [currentUser.uid],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        joinRoom(roomId);
    } catch (error) {
        showError(error.message);
    }
}

function joinRoom(roomId) {
    currentRoom = roomId;
    document.getElementById('currentRoom').textContent = `Room: ${roomId.substring(0,8)}`;
    
    if (unsubscribeMessages) unsubscribeMessages();
    
    unsubscribeMessages = db.collection('messages')
        .where('roomId', '==', roomId)
        .orderBy('timestamp')
        .onSnapshot(snapshot => {
            const container = document.getElementById('messagesContainer');
            container.innerHTML = '';
            snapshot.forEach(doc => {
                const msg = doc.data();
                container.appendChild(createMessageElement(msg, doc.id));
            });
            container.scrollTop = container.scrollHeight;
        });
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
                text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                reactions: {}
            });
            input.value = '';
        } catch (error) {
            showError(error.message);
        }
    }
}

// Profile Management
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
        toggleModal('profileModal');
        loadProfile();
    } catch (error) {
        showError(error.message);
    }
}

// Invite System
async function sendInvite() {
    const email = document.getElementById('inviteEmail').value;
    try {
        await db.collection('rooms').doc(currentRoom).update({
            members: firebase.firestore.FieldValue.arrayUnion(email)
        });
        toggleModal('inviteModal');
    } catch (error) {
        showError(error.message);
    }
}

// UI Functions
function toggleModal(modalId) {
    document.getElementById(modalId).classList.toggle('hidden');
}

function showApp() {
    document.getElementById('authContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

function showAuth() {
    document.getElementById('authContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
}

function showError(message) {
    alert(`Error: ${message}`);
}
