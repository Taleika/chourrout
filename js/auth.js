import { auth, ALLOWED_EMAILS } from './firebase-config.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

function normalizarEmail(email){ return String(email || '').trim().toLowerCase(); }
function autorizado(user){ return !!user && ALLOWED_EMAILS.includes(normalizarEmail(user.email)); }

export async function iniciarSesionGoogle(){
  const result = await signInWithPopup(auth, provider);
  if(!autorizado(result.user)){
    const email = result.user?.email || 'esta cuenta';
    await signOut(auth);
    throw new Error(`${email} no está autorizado para usar el sistema.`);
  }
  return result.user;
}

export async function cerrarSesion(){
  await signOut(auth);
  location.href = rutaLogin();
}

function rutaLogin(){
  const path = location.pathname;
  const depth = path.split('/').filter(Boolean).length;
  const inSubfolder = /\/(admin|presupuestos)\//.test(path);
  return inSubfolder ? '../login.html' : 'login.html';
}

function destinoActual(){
  const url = new URL(location.href);
  return url.pathname + url.search + url.hash;
}

export function protegerPagina(){
  document.documentElement.style.visibility='hidden';
  onAuthStateChanged(auth, async user => {
    if(autorizado(user)){
      document.documentElement.style.visibility='visible';
      document.dispatchEvent(new CustomEvent('ch-auth-ready',{detail:{user}}));
      actualizarUsuarioUI(user);
      return;
    }
    if(user) await signOut(auth);
    const login = rutaLogin();
    const destino = encodeURIComponent(destinoActual());
    location.replace(`${login}?return=${destino}`);
  });
}

function actualizarUsuarioUI(user){
  const userInfo = document.querySelector('.user-info');
  if(userInfo){
    const nombre = user.displayName || user.email || 'Usuario';
    userInfo.innerHTML = `<strong>${escapeHtml(nombre)}</strong><span>${escapeHtml(user.email || '')}</span>`;
  }
  const avatar = document.querySelector('.user-avatar');
  if(avatar){
    const base=(user.displayName || user.email || 'CH').trim();
    avatar.textContent=base.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase().slice(0,2) || 'CH';
  }

  if(!document.getElementById('cerrarSesion')){
    const sidebar = document.querySelector('.sidebar');
    if(sidebar){
      const btn=document.createElement('button');
      btn.id='cerrarSesion';
      btn.className='menu-item';
      btn.type='button';
      btn.style.cssText='width:100%;border:0;background:transparent;text-align:left;cursor:pointer;font:inherit;';
      btn.innerHTML='<span class="menu-icon">↪</span>Cerrar sesión';
      btn.addEventListener('click',cerrarSesion);
      const footer=sidebar.querySelector('.sidebar-footer');
      sidebar.insertBefore(btn,footer || null);
    }
  }
}

function escapeHtml(v){
  return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

export { autorizado };
