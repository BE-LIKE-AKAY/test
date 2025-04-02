document.addEventListener("DOMContentLoaded", function () {
    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById("auth-section").style.display = "none";
            document.getElementById("chat-section").style.display = "block";
            loadRooms();
        } else {
            document.getElementById("auth-section").style.display = "block";
            document.getElementById("chat-section").style.display = "none";
        }
    });
});

function signup() {
    let email = document.getElementById("signup-email").value;
    let password = document.getElementById("signup-password").value;
    let name = document.getElementById("signup-name").value;

    auth.createUserWithEmailAndPassword(email, password).then(userCredential => {
        return db.collection("users").doc(userCredential.user.uid).set({
            name: name,
            email: email
        });
    }).then(() => {
        alert("User Registered!");
        showLogin();
    }).catch(error => alert(error.message));
}

function login() {
    let email = document.getElementById("login-email").value;
    let password = document.getElementById("login-password").value;

    auth.signInWithEmailAndPassword(email, password).catch(error => alert(error.message));
}

function logout() { auth.signOut(); }

function showSignup() { document.getElementById("signup-form").style.display = "block"; document.getElementById("login-form").style.display = "none"; }
function showLogin() { document.getElementById("signup-form").style.display = "none"; document.getElementById("login-form").style.display = "block"; }

function createRoom() {
    let roomName = document.getElementById("room-name").value;
    let user = auth.currentUser;

    db.collection("rooms").add({
        name: roomName,
        owner: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById("room-name").value = "";
        loadRooms();
    });
}
