const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

// Replace hardcoded hex colors
css = css.replace(/#58c8ff/gi, 'var(--cyan)');
css = css.replace(/#2563eb/gi, 'var(--primary)');
css = css.replace(/#22c55e/gi, 'var(--green)');
css = css.replace(/#f59e0b/gi, 'var(--orange)');

// Replace hardcoded RGB arrays in rgba with color-mix
const colorMaps = [
  { rgb: '31,111,235', varName: '--primary' },
  { rgb: '63,185,80', varName: '--green' },
  { rgb: '88,200,255', varName: '--cyan' },
  { rgb: '88,166,255', varName: '--cyan' },
  { rgb: '249,115,22', varName: '--orange' },
  { rgb: '227,179,65', varName: '--yellow' },
  { rgb: '248,81,73', varName: '--red' },
  { rgb: '99,102,241', varName: '--primary' } // Indigo mapped to primary
];

colorMaps.forEach(({ rgb, varName }) => {
  // Regex to match rgba(R,G,B, A) with optional spaces
  const regex = new RegExp(`rgba\\(${rgb.replace(/,/g, '\\s*,\\s*')}\\s*,\\s*([0-9.]+)\\)`, 'g');
  css = css.replace(regex, (match, alpha) => {
    const percentage = Math.round(parseFloat(alpha) * 100);
    return `color-mix(in srgb, var(${varName}) ${percentage}%, transparent)`;
  });
});

// Improve font sizes for readability
css = css.replace(/\.brand-sub\{([^}]*?)font-size:\.65rem/g, '.brand-sub{$1font-size:.75rem');
css = css.replace(/\.fnav-label\{([^}]*?)font-size:\.68rem/g, '.fnav-label{$1font-size:.75rem');
css = css.replace(/\.fnav-btn i\{([^}]*?)font-size:1\.35rem/g, '.fnav-btn i{$1font-size:1.5rem');
css = css.replace(/\.ctable th\{([^}]*?)font-size:\.72rem/g, '.ctable th{$1font-size:.8rem');
css = css.replace(/\.badge-shift\{([^}]*?)font-size:\.68rem/g, '.badge-shift{$1font-size:.75rem');
css = css.replace(/\.aktif-pay-badge\{([^}]*?)font-size:\.65rem/g, '.aktif-pay-badge{$1font-size:.72rem');

fs.writeFileSync('src/index.css', css);
console.log('CSS updated successfully');
