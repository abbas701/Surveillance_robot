import { startServices } from './services/processManager.js';

try {
    console.log('Starting Robot Backend Services...');
    await startServices();
    
    console.log('🎉 Background services initialization completed');
    console.log('🚀 Starting main server...');
    
    // Import and start your main server
    await import('./server.js');
    
} catch (error) {
    console.error('❌ Failed to start services:', error.message);
    console.log('💡 The application may continue with limited functionality');
    
    // Still try to start the main server
    console.log('🚀 Attempting to start main server anyway...');
    await import('./server.js');
}