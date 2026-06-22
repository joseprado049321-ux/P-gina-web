import re
import sys

def main():
    path = r"c:\Users\jose0\Documents\NextTech\Pagina_Web\P-gina-web-1\index.html"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    auth_login_old = r'''            async loginTradicional\(e\) \{
                e\.preventDefault\(\);
                const user = document\.getElementById\('username'\)\.value\.trim\(\);
                const pass = document\.getElementById\('password'\)\.value\.trim\(\);
                
                const btnSubmit = document\.querySelector\('#loginForm button\[type="submit"\]'\);
                const btnOriginalText = btnSubmit \? btnSubmit\.innerHTML : '🚀 Ingresar';
                if \(btnSubmit\) \{ btnSubmit\.innerHTML = '⏳ Verificando\.\.\.'; btnSubmit\.disabled = true; \}

                if \(user === this\.ADMIN_EMAIL && pass === "12345678"\) \{
                    this\.esAdmin = true; this\.modoInvitado = false;
                    localStorage\.setItem\('superAdmin', 'true'\);
                    localStorage\.setItem\('sesionActiva', 'true'\);
                    localStorage\.removeItem\('sesionInvitado'\);
                    this\.mostrarPantallaPrincipal\(\);
                    this\._notificar\("✅ Bienvenido Administrador", "linear-gradient\(to right,#4472C4,#2c5aa0\)"\);
                \} else \{
                    let localUser = LocalUsers\.verificar\(user, pass\);
                    
                    if \(!localUser && window\.firebaseOK\) \{
                        try \{
                            const datosFB = await Firebase\.leer\('localUsersDB'\);
                            if \(datosFB !== null\) \{
                                localStorage\.setItem\('localUsersDB', JSON\.stringify\(datosFB\)\);
                                localUser = LocalUsers\.verificar\(user, pass\);
                            \}
                        \} catch\(err\) \{ console\.warn\("Error sync local users", err\); \}
                    \}

                    if \(localUser\) \{
                        this\.esAdmin = \(localUser\.rol === 'admin'\); 
                        this\.modoInvitado = false;
                        localStorage\.removeItem\('superAdmin'\);
                        localStorage\.setItem\('sesionActiva', 'true'\);
                        this\.mostrarPantallaPrincipal\(\);
                        this\._notificar\(`✅ Bienvenido, \$\{localUser\.nombre\}`\, "linear-gradient\(to right,#00b09b,#96c93d\)"\);
                    \} else \{ this\._notificar\("❌ Usuario o clave incorrectos", "#ff5f6d"\); \}
                \}
                
                if \(btnSubmit\) \{ btnSubmit\.innerHTML = btnOriginalText; btnSubmit\.disabled = false; \}
            \},'''

    auth_login_new = '''            async loginTradicional(e) {
                e.preventDefault();
                const user = document.getElementById('username').value.trim();
                const pass = document.getElementById('password').value.trim();
                
                const btnSubmit = document.querySelector('#loginForm button[type="submit"]');
                const btnOriginalText = btnSubmit ? btnSubmit.innerHTML : '🚀 Ingresar';
                if (btnSubmit) { btnSubmit.innerHTML = '⏳ Verificando...'; btnSubmit.disabled = true; }

                if (user === this.ADMIN_EMAIL && pass === "12345678") {
                    this.esAdmin = true; this.modoInvitado = false;
                    localStorage.setItem('superAdmin', 'true');
                    localStorage.setItem('sesionActiva', 'true');
                    localStorage.removeItem('sesionInvitado');
                    this.mostrarPantallaPrincipal();
                    this._notificar("✅ Bienvenido Administrador", "linear-gradient(to right,#4472C4,#2c5aa0)");
                } else {
                    let localUser = await LocalUsers.verificar(user, pass);

                    if (localUser) {
                        this.esAdmin = (localUser.rol === 'admin'); 
                        this.modoInvitado = false;
                        localStorage.removeItem('superAdmin');
                        localStorage.setItem('sesionActiva', 'true');
                        this.mostrarPantallaPrincipal();
                        this._notificar(`✅ Bienvenido, ${localUser.nombre}`, "linear-gradient(to right,#00b09b,#96c93d)");
                    } else { this._notificar("❌ Usuario o clave incorrectos", "#ff5f6d"); }
                }
                
                if (btnSubmit) { btnSubmit.innerHTML = btnOriginalText; btnSubmit.disabled = false; }
            },'''

    # Because I updated `Firebase.cargar` to `Firebase.leer` earlier, I used `Firebase\.leer` in the old regex above.
    content = re.sub(auth_login_old, auth_login_new, content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done refactor auth")

if __name__ == "__main__":
    main()
