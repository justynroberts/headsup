document.addEventListener('DOMContentLoaded', () => {
    // Open side panel button (if it exists)
    const sidePanelBtn = document.getElementById('openSidePanel');
    if (sidePanelBtn) {
        sidePanelBtn.addEventListener('click', async () => {
        try {
            // Get current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Open side panel for this tab
            await chrome.sidePanel.open({ tabId: tab.id });
            
            // Close popup
            window.close();
        } catch (error) {
            console.error('Failed to open side panel:', error);
        }
        });
    }
    
    // Open standalone app button
    document.getElementById('openStandalone').addEventListener('click', async () => {
        try {
            // Open the standalone version in a new tab
            await chrome.tabs.create({
                url: chrome.runtime.getURL('standalone.html')
            });
            
            // Close popup
            window.close();
        } catch (error) {
            console.error('Failed to open standalone app:', error);
        }
    });
    
    // Open microphone test button
    document.getElementById('openMicTest').addEventListener('click', async () => {
        try {
            // Open the microphone test page
            await chrome.tabs.create({
                url: chrome.runtime.getURL('mic-test.html')
            });
            
            // Close popup
            window.close();
        } catch (error) {
            console.error('Failed to open mic test:', error);
        }
    });
    
    // Check if side panel is supported
    if (!chrome.sidePanel) {
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h2>Unsupported Browser</h2>
                <p>This extension requires Chrome 114+ with side panel support.</p>
                <p>Please update your browser or use Chrome Canary.</p>
            </div>
        `;
    }
});