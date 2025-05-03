/**
 * Medium-like Rich Text Editor JavaScript
 * GoldenLibrary Project
 */

// Function to initialize the rich text editor
function initializeRichEditor() {
    // Editor elements
    const titleEditor = document.getElementById('titleEditor');
    const descriptionEditor = document.getElementById('descriptionEditor');
    const contentEditor = document.getElementById('contentEditor');
    const toolbar = document.getElementById('formattingToolbar');
    const toolbarButtons = toolbar.querySelectorAll('.toolbar-button');
    
    // Current selection for formatting
    let currentSelection = null;
    
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