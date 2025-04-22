document.getElementById("summarize").addEventListener("click", async() => {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = '<div class="loading"><div class="loader"></div></div>';

    const summaryType = document.getElementById("summary-type").value;

    // Get user API key
    chrome.storage.sync.get(['geminiApiKey'], async(result) => {
        if(!result.geminiApiKey) {
            resultDiv.innerHTML = "No API key set. Click the gear icon to add one";
            return;
        }
        
        // Ask content js for page text
        chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
            if(!tab) {
                resultDiv.innerText = "No active tab found";
                return;
            }
            
            // Inject the content script first to ensure it's available
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }, () => {
                // Now send the message after ensuring content script is injected
                chrome.tabs.sendMessage(
                    tab.id,
                    {type: "GET_ARTICLE_TEXT"},
                    async (response) => {
                        if(chrome.runtime.lastError) {
                            console.error(chrome.runtime.lastError.message);
                            resultDiv.innerText = "Error: Could not connect to content script";
                            return;
                        } 
                        if(!response || !response.text) {
                            resultDiv.innerText = "Error: No text found";
                            return;
                        }
                        
                        // Send text to Gemini
                        try {
                            const summary = await getGeminiSummary(response.text, summaryType, result.geminiApiKey);
                            resultDiv.innerText = summary;
                        } catch(error) {
                            resultDiv.innerText = `Error: ${
                                error.message || "Failed to get summary"
                            }`;
                        }
                    }
                );
            });
        });
    });
});

async function getGeminiSummary(rawText,type,apiKey){
    const max=10000;
    const text= rawText.length>max ? rawText.slice(0,max) : rawText;

    const promptMap={
        brief: `Summarize the following text in a few sentences:\n\n${text}`,
        detailed: `Summarize the following text in detail:\n\n${text}`,
        bullet: `Summarize the following text in bullet points:\n\n${text}`,
        eli5: `Explain the following text like I'm 5:\n\n${text}`,
    };
    const prompt = promptMap[type] || promptMap.brief;

    const res=await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method : "POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                contents:[{parts:[{text:prompt}]}],
                generationConfig:{temperature:0.5},
            }),
        }
    );
    if(!res.ok){
        const {error} = await res.json();
        throw new Error(error?.message || "Request Failed!");
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary found";
}

document.getElementById("copy-btn").addEventListener("click",()=>{
    const text=document.getElementById("result").innerText;
    navigator.clipboard.writeText(text).then(()=>{
        const copyBtn = document.getElementById("copy-btn");
        const originalText=copyBtn.innerHTML;

        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg> Copied!`;

        setTimeout(()=>copyBtn.innerHTML = originalText,1500);
    }) 
    .catch((err) => {
        // Handle errors (e.g., clipboard access denied)
        console.error("Failed to copy text: ", err);
        alert("Failed to copy text. Please try again.");
    });
    
});

