/**
 * Medium-like Rich Text Editor JavaScript
 * GoldenLibrary Project
 */

// Auto-save configuration
let autoSaveTimeout;
let lastSavedContent = '';
let saveIndicator;

// Function to initialize the rich text editor
function initializeRichEditor() {
    // Editor elements
    const titleEditor = document.getElementById('titleEditor');
    const descriptionEditor = document.getElementById('descriptionEditor');
    const contentEditor = document.getElementById('contentEditor');
    const toolbar = document.getElementById('formattingToolbar');
    const toolbarButtons = toolbar.querySelectorAll('.toolbar-button');
    
    // Initialize save indicator
    initializeSaveIndicator();
    
    // Initialize placeholder behavior
    initializePlaceholders();
    
    // Current selection for formatting
    let currentSelection = null;
    
    // Initialize auto-save
    initializeAutoSave();
    
    // Event listener for selection changes
    document.addEventListener('selectionchange', function() {
        const selection = window.getSelection();
        
        // Only show toolbar when there's a selection in the content editor
        if (selection.rangeCount > 0 && selection.toString().trim() !== '' && 
            contentEditor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
            
            // Store current selection for later use
            currentSelection = selection;
            
            // Get position for toolbar
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Position toolbar above selection
            toolbar.style.top = `${window.scrollY + rect.top - toolbar.offsetHeight - 10}px`;
            toolbar.style.left = `${window.scrollX + rect.left + (rect.width / 2) - (toolbar.offsetWidth / 2)}px`;
            
            // Make sure toolbar is visible on screen
            if (parseInt(toolbar.style.left) < 10) {
                toolbar.style.left = '10px';
            }
            
            const rightEdge = parseInt(toolbar.style.left) + toolbar.offsetWidth;
            if (rightEdge > window.innerWidth - 10) {
                toolbar.style.left = `${window.innerWidth - toolbar.offsetWidth - 10}px`;
            }
            
            // Show toolbar
            toolbar.classList.add('visible');
            
            // Update active state of toolbar buttons
            updateToolbarState();
        } else {
            // Hide toolbar if clicking outside (except when in link form)
            const linkForm = document.getElementById('linkForm');
            if (!linkForm.classList.contains('visible')) {
                toolbar.classList.remove('visible');
            }
        }
    });
    
    // Update which toolbar buttons are active based on current formatting
    function updateToolbarState() {
        toolbarButtons.forEach(button => {
            const command = button.getAttribute('data-command');
            button.classList.remove('active');
            
            switch (command) {
                case 'bold':
                    if (document.queryCommandState('bold')) {
                        button.classList.add('active');
                    }
                    break;
                case 'italic':
                    if (document.queryCommandState('italic')) {
                        button.classList.add('active');
                    }
                    break;
                case 'heading':
                    if (isHeadingActive('h1')) {
                        button.classList.add('active');
                    }
                    break;
                case 'subheading':
                    if (isHeadingActive('h2')) {
                        button.classList.add('active');
                    }
                    break;
                case 'quote':
                    if (isBlockquoteActive()) {
                        button.classList.add('active');
                    }
                    break;
                case 'orderedList':
                    if (isListActive('ol')) {
                        button.classList.add('active');
                    }
                    break;
                case 'unorderedList':
                    if (isListActive('ul')) {
                        button.classList.add('active');
                    }
                    break;
                case 'link':
                    if (isLinkActive()) {
                        button.classList.add('active');
                    }
                    break;
            }
        });
    }
    
    // Helper function to check if selection is within a heading
    function isHeadingActive(tagName) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return false;
        
        let node = selection.getRangeAt(0).commonAncestorContainer;
        while (node && node !== contentEditor) {
            if (node.nodeType === 1 && node.tagName.toLowerCase() === tagName) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }
    
    // Helper function to check if selection is within a blockquote
    function isBlockquoteActive() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return false;
        
        let node = selection.getRangeAt(0).commonAncestorContainer;
        while (node && node !== contentEditor) {
            if (node.nodeType === 1 && node.tagName.toLowerCase() === 'blockquote') {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }
    
    // Helper function to check if selection is within a list
    function isListActive(tagName) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return false;
        
        let node = selection.getRangeAt(0).commonAncestorContainer;
        while (node && node !== contentEditor) {
            if (node.nodeType === 1 && node.tagName.toLowerCase() === tagName) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }
    
    // Helper function to check if selection is within a link
    function isLinkActive() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return false;
        
        let node = selection.getRangeAt(0).commonAncestorContainer;
        while (node && node !== contentEditor) {
            if (node.nodeType === 1 && node.tagName.toLowerCase() === 'a') {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }
    
    // Handle toolbar button clicks
    toolbarButtons.forEach(button => {
        button.addEventListener('click', function() {
            const command = this.getAttribute('data-command');
            
            // Restore selection if it was lost
            if (currentSelection) {
                const selection = window.getSelection();
                if (selection.rangeCount === 0) {
                    selection.removeAllRanges();
                    selection.addRange(currentSelection.getRangeAt(0));
                }
            }
            
            // Apply formatting based on command
            applyFormatting(command);
            
            // Update hidden form fields
            updateFormFields();
        });
    });
    
    // Apply formatting based on command
    function applyFormatting(command) {
        switch (command) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'heading':
                applyHeading('h1');
                break;
            case 'subheading':
                applyHeading('h2');
                break;
            case 'orderedList':
                applyList('ol');
                break;
            case 'unorderedList':
                applyList('ul');
                break;
            case 'quote':
                applyBlockquote();
                break;
            case 'link':
                showLinkForm();
                break;
        }
        
        // Update toolbar state after applying formatting
        updateToolbarState();
    }
    
    // Apply heading formatting
    function applyHeading(tagName) {
        // If already in this heading, remove it
        if (isHeadingActive(tagName)) {
            document.execCommand('formatBlock', false, 'p');
        } else {
            document.execCommand('formatBlock', false, tagName);
        }
    }
    
    // Apply list formatting
    function applyList(listType) {
        if (isListActive(listType)) {
            // If already in this list type, remove it
            document.execCommand('insertOrderedList', false, null);
            document.execCommand('insertUnorderedList', false, null);
        } else {
            // Apply list formatting
            if (listType === 'ol') {
                document.execCommand('insertOrderedList', false, null);
            } else {
                document.execCommand('insertUnorderedList', false, null);
            }
        }
    }
    
    // Apply blockquote formatting
    function applyBlockquote() {
        if (isBlockquoteActive()) {
            document.execCommand('formatBlock', false, 'p');
        } else {
            document.execCommand('formatBlock', false, 'blockquote');
        }
    }
    
    // Show the link form
    function showLinkForm() {
        const linkForm = document.getElementById('linkForm');
        const linkInput = document.getElementById('linkInput');
        const toolbarButtons = document.querySelector('.toolbar-buttons');
        
        // Hide toolbar buttons, show link form
        toolbarButtons.style.display = 'none';
        linkForm.classList.add('visible');
        
        // Check if selection is already a link
        if (isLinkActive()) {
            const selection = window.getSelection();
            let node = selection.getRangeAt(0).commonAncestorContainer;
            
            // Find the link element
            while (node && node !== contentEditor) {
                if (node.nodeType === 1 && node.tagName.toLowerCase() === 'a') {
                    linkInput.value = node.href;
                    break;
                }
                node = node.parentNode;
            }
        } else {
            linkInput.value = '';
        }
        
        // Focus the input
        linkInput.focus();
    }
    
    // Apply link button click
    document.getElementById('applyLinkButton').addEventListener('click', function() {
        const url = document.getElementById('linkInput').value.trim();
        
        if (url) {
            // Format URL if needed
            let formattedUrl = url;
            if (!/^https?:\/\//i.test(url)) {
                formattedUrl = 'https://' + url;
            }
            
            // Apply link to selection
            document.execCommand('createLink', false, formattedUrl);
            
            // Find the newly created link and add target="_blank"
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const links = contentEditor.querySelectorAll('a');
                
                // Check all links to find ones in the current selection
                links.forEach(link => {
                    const linkRange = document.createRange();
                    linkRange.selectNodeContents(link);
                    
                    if (range.compareBoundaryPoints(Range.END_TO_START, linkRange) <= 0 && 
                        range.compareBoundaryPoints(Range.START_TO_END, linkRange) >= 0) {
                        link.setAttribute('target', '_blank');
                    }
                });
            }
        }
        
        // Hide the link form
        hideLinkForm();
        
        // Update hidden form fields
        updateFormFields();
    });
    
    // Cancel link button click
    document.getElementById('cancelLinkButton').addEventListener('click', function() {
        hideLinkForm();
    });
    
    // Hide the link form
    function hideLinkForm() {
        const linkForm = document.getElementById('linkForm');
        const toolbarButtons = document.querySelector('.toolbar-buttons');
        
        linkForm.classList.remove('visible');
        toolbarButtons.style.display = 'flex';
        
        // Hide toolbar after a short delay
        setTimeout(function() {
            toolbar.classList.remove('visible');
        }, 200);
    }
    
    // Handle keyboard shortcuts
    contentEditor.addEventListener('keydown', function(e) {
        // Bold: Ctrl+B
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            applyFormatting('bold');
        }
        
        // Italic: Ctrl+I
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            applyFormatting('italic');
        }
        
        // Link: Ctrl+K
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            if (window.getSelection().toString().trim() !== '') {
                applyFormatting('link');
            }
        }
        
        // Heading 1: Ctrl+Alt+1
        if (e.ctrlKey && e.altKey && e.key === '1') {
            e.preventDefault();
            applyFormatting('heading');
        }
        
        // Heading 2: Ctrl+Alt+2
        if (e.ctrlKey && e.altKey && e.key === '2') {
            e.preventDefault();
            applyFormatting('subheading');
        }
        
        // Update form fields after any formatting
        updateFormFields();
    });
    
    // Function to update hidden form fields with current content
    function updateFormFields() {
        document.getElementById('Title').value = titleEditor.innerText.trim();
        document.getElementById('Description').value = descriptionEditor.innerText.trim();
        document.getElementById('Content').value = contentEditor.innerHTML.trim();
        
        // Get selected tag IDs
        const tagCheckboxes = document.querySelectorAll('.tag-checkbox');
        const selectedTagIds = Array.from(tagCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);
        
        document.getElementById('Tags').value = selectedTagIds.join(',');
    }
}

// Initialize the editor when the DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeRichEditor();
});

// Initialize save indicator
function initializeSaveIndicator() {
    saveIndicator = document.createElement('div');
    saveIndicator.className = 'save-indicator';
    saveIndicator.innerHTML = `
        <div class="save-status">
            <span class="save-text">Draft saved</span>
            <span class="save-spinner"></span>
        </div>
    `;
    document.body.appendChild(saveIndicator);
}

// Initialize placeholder behavior
function initializePlaceholders() {
    const titleEditor = document.getElementById('titleEditor');
    const descriptionEditor = document.getElementById('descriptionEditor');
    const contentEditor = document.getElementById('contentEditor');
    
    // Enhanced placeholder behavior for title
    titleEditor.addEventListener('focus', function() {
        if (this.innerText.trim() === '') {
            this.setAttribute('data-placeholder-active', 'true');
        }
    });
    
    titleEditor.addEventListener('blur', function() {
        this.removeAttribute('data-placeholder-active');
    });
    
    titleEditor.addEventListener('input', function() {
        if (this.innerText.trim() === '') {
            this.setAttribute('data-empty', 'true');
        } else {
            this.removeAttribute('data-empty');
        }
    });
    
    // Enhanced placeholder behavior for description
    descriptionEditor.addEventListener('focus', function() {
        if (this.innerText.trim() === '') {
            this.setAttribute('data-placeholder-active', 'true');
        }
    });
    
    descriptionEditor.addEventListener('blur', function() {
        this.removeAttribute('data-placeholder-active');
    });
    
    descriptionEditor.addEventListener('input', function() {
        if (this.innerText.trim() === '') {
            this.setAttribute('data-empty', 'true');
        } else {
            this.removeAttribute('data-empty');
        }
    });
    
    // Enhanced placeholder behavior for content
    contentEditor.addEventListener('focus', function() {
        if (this.innerText.trim() === '') {
            this.setAttribute('data-placeholder-active', 'true');
        }
    });
    
    contentEditor.addEventListener('blur', function() {
        this.removeAttribute('data-placeholder-active');
    });
    
    contentEditor.addEventListener('input', function() {
        if (this.innerText.trim() === '') {
            this.setAttribute('data-empty', 'true');
        } else {
            this.removeAttribute('data-empty');
        }
    });
}

// Initialize auto-save functionality
function initializeAutoSave() {
    const titleEditor = document.getElementById('titleEditor');
    const descriptionEditor = document.getElementById('descriptionEditor');
    const contentEditor = document.getElementById('contentEditor');
    
    // Add input listeners for auto-save
    [titleEditor, descriptionEditor, contentEditor].forEach(editor => {
        editor.addEventListener('input', debounceAutoSave);
        editor.addEventListener('paste', debounceAutoSave);
    });
    
    // Load draft from localStorage on page load
    loadDraftFromStorage();
}

// Debounced auto-save function
function debounceAutoSave() {
    clearTimeout(autoSaveTimeout);
    showSaveIndicator('saving');
    
    autoSaveTimeout = setTimeout(() => {
        performAutoSave();
    }, 2000); // Save 2 seconds after user stops typing
}

// Perform the actual auto-save
function performAutoSave() {
    const currentContent = {
        title: document.getElementById('titleEditor').innerText.trim(),
        description: document.getElementById('descriptionEditor').innerText.trim(),
        content: document.getElementById('contentEditor').innerHTML.trim(),
        timestamp: new Date().toISOString()
    };
    
    // Only save if content has changed
    const contentString = JSON.stringify(currentContent);
    if (contentString !== lastSavedContent) {
        // Save to localStorage as backup
        localStorage.setItem('goldenLibrary_draft', contentString);
        
        // Send to server
        sendAutoSaveToServer(currentContent);
        
        lastSavedContent = contentString;
    }
}

// Send auto-save data to server
function sendAutoSaveToServer(content) {
    fetch('/Posts/AutoSave', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value
        },
        body: JSON.stringify(content)
    })
    .then(response => {
        if (response.ok) {
            showSaveIndicator('saved');
        } else {
            showSaveIndicator('error');
        }
    })
    .catch(error => {
        console.error('Auto-save error:', error);
        showSaveIndicator('error');
    });
}

// Show save indicator with different states
function showSaveIndicator(state) {
    if (!saveIndicator) return;
    
    const saveText = saveIndicator.querySelector('.save-text');
    const saveSpinner = saveIndicator.querySelector('.save-spinner');
    
    saveIndicator.className = `save-indicator ${state}`;
    
    switch (state) {
        case 'saving':
            saveText.textContent = 'Saving...';
            saveSpinner.style.display = 'inline-block';
            break;
        case 'saved':
            saveText.textContent = 'Draft saved';
            saveSpinner.style.display = 'none';
            break;
        case 'error':
            saveText.textContent = 'Save failed';
            saveSpinner.style.display = 'none';
            break;
    }
    
    saveIndicator.classList.add('visible');
    
    // Hide after 3 seconds (except when saving)
    if (state !== 'saving') {
        setTimeout(() => {
            saveIndicator.classList.remove('visible');
        }, 3000);
    }
}

// Load draft from localStorage
function loadDraftFromStorage() {
    const savedDraft = localStorage.getItem('goldenLibrary_draft');
    if (savedDraft) {
        try {
            const draft = JSON.parse(savedDraft);
            const titleEditor = document.getElementById('titleEditor');
            const descriptionEditor = document.getElementById('descriptionEditor');
            const contentEditor = document.getElementById('contentEditor');
            
            // Only load if editors are empty
            if (titleEditor.innerText.trim() === '' && draft.title) {
                titleEditor.innerText = draft.title;
            }
            if (descriptionEditor.innerText.trim() === '' && draft.description) {
                descriptionEditor.innerText = draft.description;
            }
            if (contentEditor.innerHTML.trim() === '' && draft.content) {
                contentEditor.innerHTML = draft.content;
            }
            
            // Update form fields
            updateFormFields();
            
            // Show notification if draft was loaded
            if (draft.title || draft.description || draft.content) {
                showSaveIndicator('saved');
                setTimeout(() => {
                    const saveText = saveIndicator.querySelector('.save-text');
                    saveText.textContent = 'Draft restored';
                    showSaveIndicator('saved');
                }, 100);
            }
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }
}

// Clear draft from localStorage (call this when post is published)
function clearDraftFromStorage() {
    localStorage.removeItem('goldenLibrary_draft');
}