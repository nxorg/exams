const ghpages = require('gh-pages');
const path = require('path');

console.log('Deploying exams-site to GitHub Pages...');

// Configure your deployment options here
const options = {
    // Branch to deploy to (gh-pages is the standard)
    branch: 'gh-pages',
    
    // IMPORTANT: Replace with your actual GitHub repository URL
    repo: 'https://github.com/nxorg/exams.git',
    
    // This tells GitHub Pages to map to your custom domain
    cname: 'exams.xchip.in',
    
    // Only deploy these specific files (ignores node_modules, scripts, etc.)
    src: [
        'index.html',
        'style.css',
        'script.js',
        'data/**/*',
        'CNAME'
    ],
    
    // Custom commit message
    message: 'Auto-deployed updates via scripts/deploy.js',
    
    // Set to true to push to the remote repository
    push: true
};

// The first argument is the directory to publish (in this case, the parent folder of 'scripts')
const deployDir = path.join(__dirname, '..');

ghpages.publish(deployDir, options, (err) => {
    if (err) {
        console.error('❌ Deployment failed!', err);
        return;
    }
    console.log('✅ Deployment successful! Your site is live at https://exams.xchip.in');
});
