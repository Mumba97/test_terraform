// --- CONFIGURACIÓN ---
// ⚠️ RELLENA ESTOS VALORES CON LOS DE TU PROYECTO
const config = {
    cognito: {
        userPoolId: 'us-east-1_mq0dj1Lo8', // Ejemplo: 'us-east-1_xxxxxxxxx'
        userPoolWebClientId: 't4fqothieerh5jkq7e7ff7okgtj', // Ejemplo: 'xxxxxxxxxxxxxxxxxxxxxx'
        region: 'us-east-1' // La región de tu User Pool
    },
    api: {
        invokeUrl: 'https://s0o26sqlv6.execute-api.us-east-1.amazonaws.com/v1/contact', // La URL de despliegue de tu API Gateway
       // apiKey: 'tu_clave_de_api_para_el_dispositivo' // La API Key (solo para la alerta, pero la guardamos aquí por si acaso)
    }
};

// --- LÓGICA DE LA APLICACIÓN ---

const poolData = {
    UserPoolId: config.cognito.userPoolId,
    ClientId: config.cognito.userPoolWebClientId,
};
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
let currentUserToken = null;

// Helper para mostrar mensajes al usuario
function showStatus(message, isSuccess) {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = isSuccess ? 'success' : 'error';
    statusEl.style.display = 'block';
    setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
}

// Función genérica para llamadas a la API
async function apiCall(endpoint, method, body) {
    if (!currentUserToken) {
        showStatus('Error: Debes iniciar sesión.', false);
        return;
    }
    const res = await fetch(config.api.invokeUrl + endpoint, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': currentUserToken
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Ocurrió un error en la petición.');
    }
    // No todos los métodos devuelven un JSON (ej. DELETE puede devolver respuesta vacía)
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return res.json();
    }
}

// --- Autenticación con Cognito ---

function signIn() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({ Username: email, Password: password });
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session) => {
            currentUserToken = session.getIdToken().getJwtToken();
            document.getElementById('user-email').textContent = email;
            showLoggedInState();
        },
        onFailure: (err) => {
            showStatus(err.message || 'Error al iniciar sesión.', false);
        },
    });
}

function signOut() {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
        cognitoUser.signOut();
    }
    currentUserToken = null;
    showLoggedOutState();
}

// ✅ **NUEVA FUNCIÓN: REGISTRAR USUARIO**
function signUp() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (!email || !password) {
        showStatus('El email y la contraseña son obligatorios.', false);
        return;
    }

    userPool.signUp(email, password, null, null, (err, result) => {
        if (err) {
            showStatus(err.message || 'Error en el registro.', false);
            return;
        }
        showStatus('¡Registro exitoso! Revisa tu correo para obtener el código de confirmación.', true);
        // Mostrar el formulario de confirmación
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('confirm-email').value = email; // Rellenar el email automáticamente
        document.getElementById('confirm-form').classList.remove('hidden');
    });
}
// ✅ **NUEVA FUNCIÓN: CONFIRMAR REGISTRO**
function confirmSignUp() {
    const email = document.getElementById('confirm-email').value;
    const code = document.getElementById('confirm-code').value;

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({ Username: email, Pool: userPool });

    cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
            showStatus(err.message || 'Error en la confirmación.', false);
            return;
        }
        showStatus('¡Cuenta confirmada con éxito! Ahora puedes iniciar sesión.', true);
        // Regresar al formulario de inicio de sesión
        document.getElementById('confirm-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    });
}
// --- Gestión de Estado de la UI ---
// ✅ **NUEVA FUNCIÓN: ALTERNAR FORMULARIOS DE LOGIN/REGISTRO**
function toggleAuthForms() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    loginForm.classList.toggle('hidden');
    signupForm.classList.toggle('hidden');
    // Asegurarse de que el formulario de confirmación esté oculto
    document.getElementById('confirm-form').classList.add('hidden');
}
function showLoggedInState() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-content').classList.remove('hidden');
    // Cargar datos del usuario
    getDeviceStatus();
    getContacts();
}

function showLoggedOutState() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app-content').classList.add('hidden');
}

// --- Gestión de Dispositivo ---

async function getDeviceStatus() {
    try {
        const result = await apiCall('/device', 'GET');
        if (result && result.deviceId) {
            document.getElementById('current-deviceId').textContent = result.deviceId;
            document.getElementById('pairing-form').classList.add('hidden');
            document.getElementById('paired-device-info').classList.remove('hidden');
        } else {
            document.getElementById('pairing-form').classList.remove('hidden');
            document.getElementById('paired-device-info').classList.add('hidden');
        }
    } catch (error) {
        console.error("Error obteniendo estado del dispositivo:", error);
    }
}

async function pairDevice() {
    const deviceId = document.getElementById('deviceId-input').value;
    if (!deviceId) {
        showStatus('Por favor, ingresa un ID de dispositivo.', false);
        return;
    }
    try {
        await apiCall('/device', 'POST', { deviceId });
        showStatus('Dispositivo pareado con éxito.', true);
        getDeviceStatus(); // Refrescar vista
    } catch (error) {
        showStatus(error.message, false);
    }
}

async function unpairDevice() {
    try {
        await apiCall('/device', 'DELETE');
        showStatus('Dispositivo desvinculado con éxito.', true);
        getDeviceStatus(); // Refrescar vista
    } catch (error) {
        showStatus(error.message, false);
    }
}

// --- Gestión de Contactos ---

async function getContacts() {
    const list = document.querySelector('#contact-list ul');
    list.innerHTML = '<li>Cargando...</li>'; 
    try {
        const result = await apiCall('/contacts', 'GET');
        list.innerHTML = ''; 
        if (result.contacts && result.contacts.length > 0) {
            result.contacts.forEach(contact => {
                const item = document.createElement('li');
                item.innerHTML = `
                    <span>
                        <strong>${contact.name}</strong> (${contact.relationship})<br>
                        ${contact.phone}
                    </span>
                    <button class="danger-btn" onclick="deleteContact('${contact.contactId}')">Eliminar</button>
                `;
                list.appendChild(item);
            });
        } else {
            list.innerHTML = '<li>No tienes contactos de emergencia.</li>';
        }
    } catch (error) {
        list.innerHTML = `<li>Error al cargar contactos.</li>`;
        console.error("Error obteniendo contactos:", error);
    }
}

async function addContact() {
    const name = document.getElementById('contact-name').value;
    const phone = document.getElementById('contact-phone').value;
    const relationship = document.getElementById('contact-relationship').value;

    if (!name || !phone || !relationship) {
        showStatus('Todos los campos son obligatorios.', false);
        return;
    }
    try {
        await apiCall('/contacts', 'POST', { name, phone, relationship });
        showStatus('Contacto añadido con éxito.', true);
        document.getElementById('add-contact-form').reset();
        getContacts(); // Refrescar lista
    } catch (error) {
        showStatus(error.message, false);
    }
}

async function deleteContact(contactId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este contacto?')) return;
    try {
        await apiCall('/contacts', 'DELETE', { contactId });
        showStatus('Contacto eliminado con éxito.', true);
        getContacts(); // Refrescar lista
    } catch (error) {
        showStatus(error.message, false);
    }
}

// --- Inicialización ---

document.addEventListener('DOMContentLoaded', () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
        cognitoUser.getSession((err, session) => {
            if (err) {
                console.error(err);
                showLoggedOutState();
                return;
            }
            if (session.isValid()) {
                currentUserToken = session.getIdToken().getJwtToken();
                document.getElementById('user-email').textContent = cognitoUser.getUsername();
                showLoggedInState();
            } else {
                showLoggedOutState();
            }
        });
    } else {
        showLoggedOutState();
    }
});