document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            document.getElementById("api-key").value = result.geminiApiKey;
        }
    });

    document.getElementById("save-btn").addEventListener("click", () => {
        const apiKey = document.getElementById("api-key").value.trim();
        if (!apiKey) {
            alert("Please enter a valid API key");
            return;
        }
        chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
            document.getElementById("success-message").style.display = "block";
            setTimeout(() => {
                window.close();
                chrome.tabs.getCurrent((tab) => {
                    if (tab) {
                        chrome.tabs.remove(tab.id);
                    }
                });
            }, 1000);
        });
    });
});