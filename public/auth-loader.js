// ================== GLOBAL AUTH LOADER ==================
(function () {

// =======================================
// EMAIL AUTH
// =======================================

let emailLoginMode = true;

function createEmailModal(){

    if(document.getElementById("email-auth-modal")) return;

    const css = `
<style>

.email-modal{
display:none;
position:fixed;
inset:0;
z-index:20000;
justify-content:center;
align-items:center;
padding:16px;
backdrop-filter:blur(12px);
background:rgba(0,0,0,.75);
}

.email-modal-card{
width:100%;
max-width:430px;
background:linear-gradient(180deg,#222,#161616);
border-radius:20px;
padding:24px;
box-sizing:border-box;
color:#fff;
}

.email-modal-card h2{
margin:0 0 18px;
text-align:center;
}

.email-modal-card input{
width:100%;
padding:13px;
margin-bottom:12px;
border:none;
border-radius:12px;
background:#2c2c2c;
color:#fff;
box-sizing:border-box;
}

.password-wrapper {
  position: relative;
}

.password-wrapper input {
  width: 100%;
  padding-right: 40px;
}

.password-toggle {
  position: absolute;
  top: -5%;
  right: -170px;            
  background: transparent;
  border: none;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
}

.password-toggle:hover{
color:#fff;
}

.password-toggle svg{
width:20px;
height:20px;
pointer-events:none;
}

.email-modal-card button{
width:100%;
padding:13px;
margin-top:10px;
border:none;
border-radius:12px;
cursor:pointer;
font-weight:bold;
}

#email-auth-submit{
background:#3b82f6;
color:#fff;
}

#toggle-auth-mode{
background:#2d2d2d;
color:#ddd;
}

.email-cancel-btn{
background:#444;
color:#fff;
}

#email-error{
color:#ff6b6b;
font-size:13px;
min-height:20px;
margin-bottom:10px;
text-align:center;
}

</style>
`;

document.head.insertAdjacentHTML("beforeend",css);

document.body.insertAdjacentHTML("beforeend",`

<div id="email-auth-modal" class="email-modal">

<div class="email-modal-card">

<h2 id="modal-title">Sign In</h2>

<input
id="email-input"
type="email"
placeholder="Email"
autocomplete="email">

<div class="password-wrapper">
<input
id="password-input"
type="password"
placeholder="Password"
autocomplete="current-password">

<button type="button" class="password-toggle" id="toggle-password" aria-label="Show password">
<!-- Eye icon (show) -->
<svg id="eye-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
</svg>
<!-- Eye-off icon (hide) -->
<svg id="eye-off-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="display:none">
<path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
</svg>
</button>
</div>

<div id="email-error"></div>

<button id="email-auth-submit">
Sign In
</button>

<button id="toggle-auth-mode">
Don't have an account? Sign Up
</button>

<button class="email-cancel-btn" id="close-email-modal">
Cancel
</button>

</div>

</div>

`);

// ===== Event listeners =====

const modal = document.getElementById("email-auth-modal");
modal.addEventListener("click", function(e){
    if(e.target === modal){ 
        closeEmailModal();
    }
});

document.querySelector(".email-modal-card").addEventListener("click", function(e){
    e.stopPropagation();
});

document
.getElementById("close-email-modal")
.onclick = closeEmailModal;

document
.getElementById("toggle-auth-mode")
.onclick = toggleMode;

document
.getElementById("email-auth-submit")
.onclick = submitEmailAuth;


document.getElementById("toggle-password").onclick = function(e){
    e.stopPropagation();
    const input = document.getElementById("password-input");
    const eye = document.getElementById("eye-icon");
    const eyeOff = document.getElementById("eye-off-icon");

    if(input.type === "password"){
        input.type = "text";
        eye.style.display = "none";
        eyeOff.style.display = "block";
        this.setAttribute("aria-label", "Hide password");
    }else{
        input.type = "password";
        eye.style.display = "block";
        eyeOff.style.display = "none";
        this.setAttribute("aria-label", "Show password");
    }
};

}

function openEmailModal(){
createEmailModal();
document.getElementById("email-auth-modal").style.display="flex";
document.getElementById("email-input").value="";
document.getElementById("password-input").value="";
document.getElementById("password-input").type = "password";
document.getElementById("email-error").textContent="";

const eye = document.getElementById("eye-icon");
const eyeOff = document.getElementById("eye-off-icon");
if(eye && eyeOff){
    eye.style.display = "block";
    eyeOff.style.display = "none";
}
}

function closeEmailModal(){
document.getElementById("email-auth-modal").style.display="none";
}

function toggleMode(){
emailLoginMode=!emailLoginMode;
document.getElementById("modal-title").textContent=
emailLoginMode?"Sign In":"Create Account";
document.getElementById("email-auth-submit").textContent=
emailLoginMode?"Sign In":"Create Account";
document.getElementById("toggle-auth-mode").textContent=
emailLoginMode
?"Don't have an account? Sign Up"
:"Already have an account? Sign In";

const input = document.getElementById("password-input");
if(input){
    input.type = "password";
    const eye = document.getElementById("eye-icon");
    const eyeOff = document.getElementById("eye-off-icon");
    if(eye && eyeOff){
        eye.style.display = "block";
        eyeOff.style.display = "none";
    }
}
}

function getFriendlyErrorMessage(error){
    const code = error?.code || "";
    const message = error?.message || "";

    switch(code){
        case "auth/invalid-email":
            return "Email tidak valid. Periksa kembali format email Anda.";
        case "auth/user-disabled":
            return "Akun ini telah dinonaktifkan. Hubungi admin.";
        case "auth/user-not-found":
            return "Email tidak terdaftar. Silakan daftar terlebih dahulu.";
        case "auth/wrong-password":
            return "Password salah. Silakan coba lagi.";
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
            return "Email atau password salah. Silakan periksa kembali.";
        case "auth/too-many-requests":
            return "Terlalu banyak percobaan gagal. Coba lagi nanti.";
        case "auth/email-already-in-use":
            return "Email sudah terdaftar. Silakan login atau gunakan email lain.";
        case "auth/weak-password":
            return "Password terlalu lemah. Minimal 6 karakter.";
        case "auth/network-request-failed":
            return "Koneksi gagal. Periksa internet Anda.";
        case "auth/operation-not-allowed":
            return "Metode login ini belum diaktifkan.";
        default:
            if(message.includes("INVALID_LOGIN_CREDENTIALS") || 
               message.includes("invalid-credential") ||
               message.includes("wrong-password") ||
               message.includes("user-not-found")){
                return "Email atau password salah. Silakan periksa kembali.";
            }
            return message || "Terjadi kesalahan. Silakan coba lagi.";
    }
}

async function submitEmailAuth(){

const email=document.getElementById("email-input").value.trim();
const password=document.getElementById("password-input").value.trim();
const error=document.getElementById("email-error");

if(!email || !password){
error.textContent="Mohon isi email dan password.";
return;
}

try{

error.textContent="Memproses...";
error.style.color = "#aaa";

if(emailLoginMode){

await firebase.auth()
.signInWithEmailAndPassword(email,password);

}else{

await firebase.auth()
.createUserWithEmailAndPassword(email,password);

}

closeEmailModal();

}catch(e){

error.style.color = "#ff6b6b";
error.textContent = getFriendlyErrorMessage(e);

}

}

// =======================================
// GLOBAL LOGIN
// =======================================
window.triggerLogin = async function(provider){
if(typeof firebase==="undefined"){
return;

}

try{
if(provider==="email"){

openEmailModal();
return;

}

let authProvider;

switch(provider){

case "google":
authProvider=new firebase.auth.GoogleAuthProvider();
break;

case "github":
authProvider=new firebase.auth.GithubAuthProvider();
break;

case "facebook":
authProvider=new firebase.auth.FacebookAuthProvider();
break;

case "twitter":
authProvider=new firebase.auth.TwitterAuthProvider();
break;

default:
return;

}

await firebase.auth().signInWithPopup(authProvider);

}catch(e){

}

};

// =======================================
// AUTH STATE
// =======================================
function initGlobalAuth() {
  if (typeof firebase === "undefined" || !firebase.auth) {
    setTimeout(initGlobalAuth, 150);
    return;
  }

  try {
    firebase.app();
  } catch (e) {
    setTimeout(initGlobalAuth, 150);
    return;
  }

  if (window.__authListenerAttached) return;
  window.__authListenerAttached = true;

  firebase.auth().onAuthStateChanged(user => {
    window.currentUser = user;

    if (window.updateHeaderAuth) {
      window.updateHeaderAuth();
    }
  });
}

initGlobalAuth();

})();