/**
 * Build plugin admin pages bundle using esbuild
 */
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const pluginName = 'ai-paper-reviewer';
const pluginDir = path.join(process.cwd(), 'plugins', pluginName);
const componentsDir = path.join(pluginDir, 'components');
const distDir = path.join(pluginDir, 'dist');

// Find all admin-*.tsx files
const adminComponents = fs.readdirSync(componentsDir)
  .filter(f => f.startsWith('admin-') && f.endsWith('.tsx'));

console.log(`Building plugin bundle for ${pluginName}...`);
console.log(`Found admin components: ${adminComponents.join(', ')}`);

// Create entry point that exports all admin components
const entryContent = adminComponents.map(f => {
  const name = f.replace('.tsx', '');
  const componentName = name.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  return `export { ${componentName} } from './components/${name}';`;
}).join('\n');

const entryFile = path.join(pluginDir, '_bundle-entry.ts');
fs.writeFileSync(entryFile, entryContent);

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build the bundle
const globalName = `__PLUGIN_${pluginName.replace(/-/g, '_').toUpperCase()}__`;

try {
  await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    outfile: path.join(distDir, 'admin-pages.js'),
    format: 'iife',
    globalName: globalName,
    platform: 'browser',
    target: 'es2020',
    jsx: 'automatic',
    jsxImportSource: 'react',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    banner: {
      js: `// Plugin: ${pluginName}
// Built: ${new Date().toISOString()}
const React = window.__PLUGIN_REACT__;
const { jsx, jsxs, Fragment } = window.__PLUGIN_JSX_RUNTIME__;
`,
    },
    footer: {
      js: `window.${globalName} = ${globalName};`,
    },
    plugins: [
      {
        name: 'react-externalize',
        setup(build) {
          // Externalize React
          build.onResolve({ filter: /^react$/ }, () => ({
            path: 'react',
            namespace: 'react-external',
          }));
          build.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({
            path: 'react/jsx-runtime',
            namespace: 'react-external',
          }));
          build.onLoad({ filter: /.*/, namespace: 'react-external' }, (args) => {
            if (args.path === 'react') {
              return { contents: 'module.exports = window.__PLUGIN_REACT__;', loader: 'js' };
            }
            if (args.path === 'react/jsx-runtime') {
              return { contents: 'module.exports = window.__PLUGIN_JSX_RUNTIME__;', loader: 'js' };
            }
          });
          // Handle lucide-react - let esbuild bundle it but warn
          build.onResolve({ filter: /^lucide-react$/ }, () => ({
            path: 'lucide-react',
            external: true,
          }));
        },
      },
    ],
  });

  // Create manifest
  const manifest = {
    pluginName,
    components: adminComponents.map(f => f.replace('.tsx', '').split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')),
    builtAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(distDir, 'admin-pages.manifest.json'), JSON.stringify(manifest, null, 2));

  // Clean up entry file
  fs.unlinkSync(entryFile);

  console.log('Bundle built successfully!');
  console.log(`Output: ${path.join(distDir, 'admin-pages.js')}`);
} catch (error) {
  console.error('Build failed:', error);
  // Clean up entry file on error
  if (fs.existsSync(entryFile)) {
    fs.unlinkSync(entryFile);
  }
  process.exit(1);
}
