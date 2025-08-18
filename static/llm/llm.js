function explainRules() {
    console.log("llego a pasar las fechas", selectedDatesRules)
    const resultsDiv = document.getElementById('llm-results');
    resultsDiv.innerHTML = '<p style="color: #007bff; font-weight: bold;">Generating explanations...</p>';

    fetch('/explain_llm', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: selectedRuleId, selected_dates: selectedDatesRules, selectedStateName: selectedStateName})
    })
    .then(response => response.json())
    .then(data => {
        data = data.response;
        var fullHTML = '';
        for (const dt of data){
            fullHTML += formatLLMResponse(dt);
            fullHTML += "<br>"
        }
        resultsDiv.innerHTML = fullHTML;
    })
    .catch(error => {
        console.error('Error en explainRules:', error);
        resultsDiv.innerHTML = '<p class="text-red-500 font-medium">Error generating explanation</p>';
    });
}

function formatLLMResponse(data) {
    function formatSources(sources) {
        if (!sources || sources.length === 0) return '';
        
        return sources.map((source, index) => 
            `<a href="${source}" 
               target="_blank" 
               class="inline-flex items-center text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-150 text-xs">
                <svg class="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
                Source ${index + 1}
            </a>`
        ).join('<span class="mx-2 text-gray-300">•</span>');
    }

    return `
        <div class="space-y-4">
            <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3">
                        <div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-sm font-bold text-gray-900 mb-2 tracking-wide">HYPOTHESIS</h3>
                        <p class="text-sm text-gray-700 leading-relaxed">${data.hypothesis || 'Not available'}</p>
                    </div>
                </div>
            </div>

            <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3">
                        <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-sm font-bold text-gray-900 mb-2 tracking-wide">DESCRIPTION</h3>
                        <p class="text-sm text-gray-700 leading-relaxed">${data.description || 'Not available'}</p>
                    </div>
                </div>
            </div>

            ${data.sources && data.sources.length > 0 ? `
            <div class="bg-gray-50 border border-gray-200 rounded-md p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3">
                        <div class="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                            <svg class="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-sm font-bold text-gray-900 mb-3 tracking-wide">REFERENCE SOURCES</h3>
                        <div class="flex flex-wrap items-center gap-2">
                            ${formatSources(data.sources)}
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `;
}