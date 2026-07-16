const fs = require('fs-extra');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { minify: minifyHtml } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

const ignoreDirs = ['node_modules', '.git', 'dist', '.gemini'];

async function build() {
    console.log('Iniciando proceso de build y ofuscación...');
    
    // Limpiar dist
    await fs.emptyDir(distDir);
    
    // Copiar archivos (excluyendo carpetas ignoradas)
    console.log('Copiando archivos...');
    await fs.copy(srcDir, distDir, {
        filter: (src) => {
            const relative = path.relative(srcDir, src);
            if (ignoreDirs.some(dir => relative.startsWith(dir) || relative === dir)) {
                return false;
            }
            if (relative === 'package.json' || relative === 'package-lock.json' || relative === 'build.js') {
                return false;
            }
            return true;
        }
    });

    console.log('Ofuscando JavaScript...');
    const jsDir = path.join(distDir, 'js');
    if (await fs.pathExists(jsDir)) {
        const files = await fs.readdir(jsDir);
        for (const file of files) {
            if (file.endsWith('.js')) {
                const filePath = path.join(jsDir, file);
                const code = await fs.readFile(filePath, 'utf8');
                const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
                    compact: true,
                    controlFlowFlattening: true,
                    controlFlowFlatteningThreshold: 0.75,
                    deadCodeInjection: true,
                    deadCodeInjectionThreshold: 0.4,
                    debugProtection: false,
                    debugProtectionInterval: 0,
                    disableConsoleOutput: false,
                    identifierNamesGenerator: 'hexadecimal',
                    log: false,
                    numbersToExpressions: true,
                    renameGlobals: false,
                    selfDefending: true,
                    simplify: true,
                    splitStrings: true,
                    splitStringsChunkLength: 10,
                    stringArray: true,
                    stringArrayCallsTransform: true,
                    stringArrayCallsTransformThreshold: 0.5,
                    stringArrayEncoding: ['base64'],
                    stringArrayIndexShift: true,
                    stringArrayRotate: true,
                    stringArrayShuffle: true,
                    stringArrayWrappersCount: 1,
                    stringArrayWrappersChainedCalls: true,
                    stringArrayWrappersParametersMaxCount: 2,
                    stringArrayWrappersType: 'variable',
                    stringArrayThreshold: 0.75,
                    unicodeEscapeSequence: false
                });
                await fs.writeFile(filePath, obfuscationResult.getObfuscatedCode());
                console.log(`- Ofuscado: ${file}`);
            }
        }
    }

    console.log('Minificando CSS...');
    const cssDir = path.join(distDir, 'css');
    if (await fs.pathExists(cssDir)) {
        const files = await fs.readdir(cssDir);
        for (const file of files) {
            if (file.endsWith('.css')) {
                const filePath = path.join(cssDir, file);
                const code = await fs.readFile(filePath, 'utf8');
                const minified = new CleanCSS({}).minify(code);
                await fs.writeFile(filePath, minified.styles);
                console.log(`- Minificado: ${file}`);
            }
        }
    }

    console.log('Minificando HTML...');
    const indexHtmlPath = path.join(distDir, 'index.html');
    if (await fs.pathExists(indexHtmlPath)) {
        const html = await fs.readFile(indexHtmlPath, 'utf8');
        const minifiedHtml = await minifyHtml(html, {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
            minifyCSS: true,
            minifyJS: true
        });
        await fs.writeFile(indexHtmlPath, minifiedHtml);
        console.log('- Minificado: index.html');
    }

    console.log('✅ Proceso completado exitosamente. Los archivos listos para producción están en la carpeta "dist".');
}

build().catch(console.error);
