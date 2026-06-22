import re
import sys

def main():
    path = r"c:\Users\jose0\Documents\NextTech\Pagina_Web\P-gina-web-1\index.html"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Firebase
    firebase_regex = re.compile(r'const Firebase = \{.*?\n\s+guardar\(clave, datos\) \{.*?\n\s+\}\n\s+\};', re.DOTALL)
    firebase_replacement = """const Firebase = {
            _col() { 
                const tenant = localStorage.getItem('superAdminTenant') || localStorage.getItem('tenantId') || 'demo'; 
                return db ? db.collection('empresas').doc(tenant).collection('datos') : null; 
            },
            async leer(clave) {
                if (!firebaseOK) return null;
                try {
                    const doc = await this._col().doc(clave).get();
                    return doc.exists ? doc.data().datos : null;
                } catch(e) { return null; }
            },
            async guardar(clave, datos) {
                if (!firebaseOK) return;
                try {
                    await this._col().doc(clave).set({ datos });
                    _mostrarEstadoFirebase('☁️ Guardado: ' + clave, '#28a745');
                } catch(e) {
                    _mostrarEstadoFirebase('❌ Error Firebase: ' + e.message, '#dc3545');
                    throw e;
                }
            }
        };"""
    content = firebase_regex.sub(firebase_replacement, content)
    
    # Update all Firebase.cargar to Firebase.leer
    content = content.replace("Firebase.cargar(", "Firebase.leer(")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done phase 1")

if __name__ == "__main__":
    main()
