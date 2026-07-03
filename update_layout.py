import re
import sys

def main():
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            content = f.read()

        css_new = """        /* ── FASE 2: ESQUELETO MODERNO (LAYOUT, SIDEBAR, TOPBAR) ── */
        
        /* Contenedor Maestro */
        #app-container {
            display: flex;
            height: 100vh;
            width: 100vw;
            background-color: var(--bg-body);
            overflow: hidden;
        }

        /* Panel Lateral (Sidebar) */
        #sidebar {
            width: 260px;
            background-color: var(--bg-surface);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 100;
            box-shadow: 4px 0 24px rgba(0,0,0,0.2);
        }

        #sidebar .logo-container {
            height: 70px;
            display: flex;
            align-items: center;
            padding: 0 24px;
            border-bottom: 1px solid var(--border);
        }

        #sidebar .logo-container h2 {
            font-size: 1.4rem;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        #sidebar .menu-list {
            padding: 20px 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex-grow: 1;
            overflow-y: auto;
        }

        /* Botones del Menú (Nav Items) */
        .menu-item, .nav-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            color: var(--text-secondary);
            text-decoration: none;
            border-radius: var(--radius-md);
            font-weight: 500;
            font-size: 0.95rem;
            transition: all 0.2s ease;
            cursor: pointer;
            gap: 12px;
            border: 1px solid transparent;
        }

        .menu-item:hover, .nav-item:hover {
            background-color: var(--bg-surface-hover);
            color: var(--text-primary);
        }

        /* Estado Activo del Menú */
        .menu-item.active, .nav-item.active {
            background: linear-gradient(90deg, rgba(245,158,11,0.1) 0%, transparent 100%);
            color: var(--primary);
            border-left: 3px solid var(--primary);
            font-weight: 600;
        }

        /* Área Principal de Contenido */
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow-x: hidden;
        }

        /* Barra Superior (Topbar) con Glassmorphism */
        #topbar {
            height: 70px;
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 32px;
            position: sticky;
            top: 0;
            z-index: 90;
        }

        #topbar .user-info {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            color: var(--text-primary);
        }

        /* Contenedor desplazable de las vistas (Dashboard, Inventario, etc.) */
        .view-container {
            padding: 32px;
            overflow-y: auto;
            flex: 1;
            height: calc(100vh - 70px);
        }"""

        # 1. CSS Block Replacement
        # It replaces from /* ====== CONTAINER & HEADER to just before /* ======= TAB INDICATOR BAR
        pattern_css = re.compile(r'/\*\s*============================================================\s*CONTAINER & HEADER.*?/\*\s*============================================================\s*TAB INDICATOR BAR', re.DOTALL)
        if not pattern_css.search(content):
            print("Could not find CSS block!")
            sys.exit(1)
        content = pattern_css.sub(css_new + '\n\n        /* ============================================================\n           TAB INDICATOR BAR', content)

        # 2. HTML Restructuring (Replacing <div class="container">...<nav class="sidebar-menu"> to matching #app-container)
        pattern_html_start = re.compile(r'<div id="main-screen" class="hidden">\s*<div class="container">\s*<header>.*?</header>\s*<div class="menu-overlay"[^>]*></div>\s*<nav class="sidebar-menu" id="sidebarMenu">\s*<div class="sidebar-header">.*?</div>\s*<div class="sidebar-nav">', re.DOTALL)
        
        html_start_new = """<div id="main-screen" class="hidden">
        <div id="app-container">
            <!-- Panel Lateral (Sidebar) -->
            <nav id="sidebar">
                <div class="logo-container">
                    <h2>
                        <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="100" height="100" rx="22" fill="#0F172A"/>
                            <text x="48" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="46" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="-2">L<tspan fill="#F59E0B">P</tspan></text>
                        </svg>
                        LisPro POS
                    </h2>
                </div>
                <div class="menu-list">"""

        if not pattern_html_start.search(content):
            print("Could not find HTML start block!")
            sys.exit(1)
        content = pattern_html_start.sub(html_start_new, content)

        # 3. Middle HTML Restructuring
        pattern_html_mid = re.compile(r'</div>\s*</nav>\s*<div class="tab-indicator-bar">', re.DOTALL)
        
        html_mid_new = """                </div>
            </nav>

            <!-- Área Principal de Contenido -->
            <div class="main-content">
                <!-- Barra Superior (Topbar) -->
                <div id="topbar">
                    <button class="menu-toggle-btn" onclick="SidebarMenu.toggle()" title="Menú" style="background:transparent; border:none; color:var(--text-primary); font-size:24px; cursor:pointer; padding:0;">☰</button>
                    
                    <div id="panel-superadmin" class="solo-admin" style="display:none; align-items:center; gap:10px;">
                        <span style="font-size:13px; font-weight:600;">🏢 Supervisar:</span>
                        <select id="select-empresas" onchange="Auth.cambiarTenant(this.value)" style="padding:6px 12px; border-radius:6px; background:rgba(255,255,255,0.05); color:var(--text-primary); border:1px solid var(--border); outline:none; max-width:220px;">
                            <option value="">Cargando clientes...</option>
                        </select>
                        <button id="btn-respaldo-global" onclick="BackupManager.descargarRespaldoGlobal()" style="background:linear-gradient(135deg,#10B981,#059669); color:white; border:none; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer;">📥 Backup</button>
                        <button onclick="document.getElementById('fileRestoreTenant').click()" style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:bold; cursor:pointer;">⚠️ Restaurar</button>
                        <input type="file" id="fileRestoreTenant" accept=".json" style="display:none;" onchange="BackupManager.restaurarTenant(event)">
                    </div>

                    <div class="user-info">
                        <button id="theme-toggle-btn" onclick="ThemeManager.toggle()" title="Cambiar modo" style="background:transparent; border:1px solid var(--border); color:var(--text-primary); padding:6px 16px; border-radius:var(--radius-sm); cursor:pointer; font-weight:600; display:flex; align-items:center; gap:6px;">
                            <span id="theme-icon">🌙</span> Modo
                        </button>
                        <div id="firebase-sync-indicator" style="display:none; align-items:center; gap:6px; background:rgba(255,255,255,0.05); padding:6px 12px; border-radius:20px; font-size:12px;">
                            <span style="display:inline-block; width:8px; height:8px; background:#10B981; border-radius:50%; animation:pulse 1s infinite;"></span>
                            Sincronizando...
                        </div>
                        <button class="logout-btn" onclick="Auth.cerrarSesion()" style="background:transparent; border:1px solid var(--border); color:var(--text-primary); padding:6px 16px; border-radius:var(--radius-sm); cursor:pointer; font-weight:600;">🚪 Salir</button>
                    </div>
                </div>

                <!-- Contenedor Desplazable de Vistas -->
                <div class="view-container">
                    <div class="tab-indicator-bar" style="background:transparent; border:none; padding:0 0 20px 0;">"""

        if not pattern_html_mid.search(content):
            print("Could not find HTML mid block!")
            sys.exit(1)
        content = pattern_html_mid.sub(html_mid_new, content)

        # 4. End HTML restructuring
        pattern_html_end = re.compile(r'</div>\s*</div>\s*<div id="os-lightbox"', re.DOTALL)
        html_end_new = '''            </div>
                </div> <!-- End .view-container -->
            </div> <!-- End .main-content -->
        </div> <!-- End #app-container -->
    </div> <!-- End #main-screen -->
    
    <div id="os-lightbox"'''
        if not pattern_html_end.search(content):
            print("Could not find HTML end block!")
            sys.exit(1)
        content = pattern_html_end.sub(html_end_new, content)

        # 5. Class renaming for sidebar-item
        content = content.replace('class="sidebar-item', 'class="menu-item')
        content = content.replace('.sidebar-item', '.menu-item')

        # 6. JS element ID update
        content = content.replace("getElementById('sidebarMenu')", "getElementById('sidebar')")

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(content)
        
        print("SUCCESS")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
