const fs = require('fs');
const acorn = require('acorn');

const code = fs.readFileSync('js/app.js', 'utf8');
let ast;
try {
    ast = acorn.parse(code, { ecmaVersion: 2022, ranges: true });
} catch (e) {
    console.error("Parse error", e);
    process.exit(1);
}

const mapping = {
  core: ['firebaseConfig', 'db', 'firebaseOK', '_mostrarEstadoFirebase', 'Firebase', 'Config', 'Estado', '_modoDatos', 'cambiarModoDatos', 'obtenerDatosFiltradosGlobales', 'Auth'],
  ui: ['SidebarMenu', 'UI', 'Dashboard', 'Filtros', 'Exportar', 'ThemeManager'],
  ventas: ['Ventas', 'Boletas', 'Facturas', 'Cotizaciones', 'Devoluciones', 'CierreCaja'],
  inventario: ['Inventario', 'Compras', 'Proveedores', 'SkuGen', 'Autocomplete'],
  clientes: ['Clientes', 'CuentasCobrar'],
  servicios: ['OrdenesServicio'],
  admin: ['GestionUsuarios', 'ConfiguracionNegocio', 'Rentabilidad', 'Reportes', 'Gastos', 'Papelera', 'BackupManager', 'SuperAdmin']
};

const output = {
  core: [], ui: [], ventas: [], inventario: [], clientes: [], servicios: [], admin: [], main: []
};

let lastEnd = 0;

ast.body.forEach(node => {
    let name = null;
    if (node.type === 'VariableDeclaration') {
        name = node.declarations[0].id.name;
    } else if (node.type === 'FunctionDeclaration') {
        name = node.id.name;
    } else if (node.type === 'ExpressionStatement') {
        if (node.expression.type === 'AssignmentExpression' && node.expression.left.object && node.expression.left.object.name === 'window') {
            name = node.expression.left.property.name;
        }
    }
    
    // The code slice for this node including preceding comments/whitespace
    const chunk = code.substring(lastEnd, node.end);
    lastEnd = node.end;

    let assigned = false;
    if (name) {
        for (const [mod, names] of Object.entries(mapping)) {
            if (names.includes(name)) {
                output[mod].push(chunk);
                assigned = true;
                break;
            }
        }
    }
    
    if (!assigned) {
        // E.g. IIFEs, DOMContentLoaded
        // Monkey patch at the top has no name (IIFE)
        if (chunk.includes('MONKEY PATCH FIREBASE')) {
            output.core.push(chunk); // keep it in core
        } else {
            output.main.push(chunk);
        }
    }
});

// push remaining
if (lastEnd < code.length) {
    output.main.push(code.substring(lastEnd));
}

fs.mkdirSync('js/modules', {recursive:true});
for(const [mod, content] of Object.entries(output)) {
    if(content.length > 0) {
        fs.writeFileSync(`js/modules/${mod}.js`, content.join(''));
    }
}
console.log("Splitting complete.");
