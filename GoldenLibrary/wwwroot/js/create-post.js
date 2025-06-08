// Create Post JavaScript Functions
// Extracted from Create.cshtml for better organization

// Publish button handler - enhanced with better validation
function initializePublishButton() {
    document.getElementById('publishBtn').addEventListener('click', function(e) {
        e.preventDefault();
        updateFormFields();
        
        // Validate tag selection and show appropriate UI feedback
        if (!validateTagSelection()) {
            // Scroll to tag selection area with a highlight effect
            document.querySelector('.tag-selection-area').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Add a temporary highlight effect to draw attention
            const tagCloud = document.querySelector('.tag-cloud');
            tagCloud.style.transition = 'background-color 0.3s ease';
            tagCloud.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
            
            setTimeout(() => {
                tagCloud.style.backgroundColor = '';
            }, 1000);
            
            return;
        }
        
        document.getElementById('formAction').value = 'publish';
        
        // Submit the form
        const form = document.getElementById('storyForm');
        
        // Get final list of selected tags
        const selectedTagIds = getSelectedTagIds();
        
        // Ensure hidden tags input is updated with latest selections
        document.getElementById('Tags').value = selectedTagIds.join(',');
        
        // Create hidden inputs for each selected tag
        selectedTagIds.forEach(tagId => {
            // First check if this hidden input already exists to avoid duplicates
            const existingInput = form.querySelector(`input[name="tagIds"][value="${tagId}"]`);
            if (!existingInput || existingInput.checked === undefined) {
                // Remove any old hidden input for this tag that might be unchecked now
                const oldInput = form.querySelector(`input[type="hidden"][name="tagIds"][value="${tagId}"]`);
                if (oldInput) {
                    oldInput.remove();
                }
                
                // Create a new hidden input
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'tagIds';
                hiddenInput.value = tagId;
                form.appendChild(hiddenInput);
            }
        });
        
        // Mark draft as published BEFORE submitting
        localStorageDraft.markAsPublished();
        
        // Set up a success flag to clear localStorage after submission
        const publishedPostId = document.getElementById('postId').value;
        
        // Add event listener for successful form submission
        form.addEventListener('submit', function() {
            // Clear ALL drafts when publishing is successful
            setTimeout(() => {
                localStorageDraft.clearAllDrafts();
                console.log('Cleared all drafts after successful publish');
            }, 200);
        }, { once: true });
        
        // Final verification that all selected tags have corresponding form entries
        const formTagInputs = form.querySelectorAll('input[name="tagIds"]');
        const formTagValues = Array.from(formTagInputs).map(input => input.value);
        console.log(`Submitting form with ${formTagValues.length} tags: ${formTagValues.join(', ')}`);
        
        form.submit();
    });
}

// Helper function to get selected tag IDs - enhanced with validation
function getSelectedTagIds() {
    try {
        // Get all checked tag checkboxes
        const checkedTagElements = document.querySelectorAll('.tag-checkbox:checked');
        
        // Convert to array and extract values
        const tagIds = Array.from(checkedTagElements).map(checkbox => checkbox.value);
        
        return tagIds;
    } catch (error) {
        console.error('Error collecting tag IDs:', error);
        // Return empty array in case of error to prevent breaking the form
        return [];
    }
}

// Validate tag selection and show appropriate UI feedback
function validateTagSelection() {
    const selectedTagIds = getSelectedTagIds();
    const tagValidationMessage = document.getElementById('tagValidationMessage');
    const tagSelectionArea = document.querySelector('.tag-selection-area');
    const infoIcon = tagValidationMessage.previousElementSibling;
    
    if (selectedTagIds.length === 0) {
        // No tags selected - show error
        tagValidationMessage.innerHTML = '<span class="tag-validation-error">Please select at least one tag before publishing</span>';
        tagSelectionArea.classList.add('error');
        infoIcon.classList.add('error-icon');
        return false;
    } else {
        // Tags selected - show success
        tagValidationMessage.innerHTML = `<span class="tag-selection-complete">${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''} selected</span>`;
        tagSelectionArea.classList.remove('error');
        infoIcon.classList.remove('error-icon');
        return true;
    }
}

// Update form fields function - enhanced with tag validation
function updateFormFields() {
    document.getElementById('Title').value = document.getElementById('titleEditor').innerText.trim();
    document.getElementById('Description').value = document.getElementById('descriptionEditor').innerText.trim();
    document.getElementById('Content').value = document.getElementById('contentEditor').innerText.trim();
    
    // Get selected tag IDs using the helper function
    const selectedTagIds = getSelectedTagIds();
    
    // Set the hidden Tags field with comma-separated tag IDs
    document.getElementById('Tags').value = selectedTagIds.join(',');
    
    // Update visual cue for tag selection
    const tagValidationMessage = document.getElementById('tagValidationMessage');
    const tagSelectionArea = document.querySelector('.tag-selection-area');
    const infoIcon = tagValidationMessage.previousElementSibling;
    
    if (selectedTagIds.length > 0) {
        tagValidationMessage.textContent = 
            `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''} selected`;
        tagValidationMessage.classList.remove('text-danger');
        tagSelectionArea.classList.remove('error');
        infoIcon.classList.remove('error-icon');
    } else {
        tagValidationMessage.textContent = 'Add at least one tag to publish your story';
        infoIcon.classList.remove('error-icon');
        tagSelectionArea.classList.remove('error');
    }
}

// Formatting toolbar related code - Updated for minimalist design
function initFormattingToolbar() {
    const toolbar = document.getElementById('formattingToolbar');
    const linkForm = document.getElementById('linkForm');
    const linkInput = document.getElementById('linkInput');
    const applyLinkButton = document.getElementById('applyLinkButton');
    const cancelLinkButton = document.getElementById('cancelLinkButton');
    const contentEditor = document.getElementById('contentEditor');
    const highlightButton = toolbar.querySelector('.toolbar-button[data-command="highlight"]');
    const highlightColorPicker = document.getElementById('highlightColorPicker');
    const colorOptions = highlightColorPicker.querySelectorAll('.color-option');
    const removeHighlightButton = highlightColorPicker.querySelector('.toolbar-button[data-command="removeHighlight"]');
    
    let currentSelection = null; // Store selection range
    let selectionTimeout = null;
    
    // Check for text selection and show toolbar with a small delay
    document.addEventListener('selectionchange', function() {
        clearTimeout(selectionTimeout);
        
        selectionTimeout = setTimeout(() => {
            const selection = window.getSelection();
            
            if (selection.rangeCount > 0 && selection.toString().trim() !== '') {
                const range = selection.getRangeAt(0);
                
                if (contentEditor.contains(range.commonAncestorContainer)) {
                    currentSelection = range.cloneRange(); // Save the current selection
                    showToolbar(selection);
                } else {
                    if (!toolbar.contains(document.activeElement) && (!highlightColorPicker || !highlightColorPicker.contains(document.activeElement))) {
                        hideToolbar();
                    }
                }
            } else {
                // Only hide toolbar if not interacting with it or its sub-elements (like color picker)
                if (!toolbar.contains(document.activeElement) && (!highlightColorPicker || !highlightColorPicker.contains(document.activeElement))) {
                    hideToolbar();
                }
            }
        }, 100); // Small delay to prevent flashing
    });
    
    // Show the toolbar at the selection
    function showToolbar(selection) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Position the toolbar above the selection
        toolbar.style.top = `${window.scrollY + rect.top - toolbar.offsetHeight - 10}px`;
        toolbar.style.left = `${window.scrollX + rect.left + (rect.width / 2) - (toolbar.offsetWidth / 2)}px`;
        
        // Make sure the toolbar stays within viewport bounds
        const rightEdge = toolbar.getBoundingClientRect().right;
        const viewportWidth = window.innerWidth;
        
        if (rightEdge > viewportWidth) {
            const offset = rightEdge - viewportWidth + 10;
            toolbar.style.left = `${parseInt(toolbar.style.left) - offset}px`;
        }
        
        if (parseInt(toolbar.style.left) < 10) {
            toolbar.style.left = '10px';
        }
        
        // Show the toolbar with animation
        toolbar.classList.add('visible');
        
        // Update active state of buttons based on current formatting
        updateToolbarState();
    }
    
    // Hide the toolbar
    function hideToolbar() {
        // Don't hide if we're in the link form and it's focused
        if (linkForm.classList.contains('visible') && 
            (document.activeElement === linkInput || 
             document.activeElement === applyLinkButton || 
             document.activeElement === cancelLinkButton)) {
            return;
        }
        // Don't hide if color picker is active and focused within
        if (highlightColorPicker && highlightColorPicker.style.display !== 'none' && highlightColorPicker.contains(document.activeElement)) {
            return;
        }

        toolbar.classList.remove('visible');
        hideLinkForm();
        if (highlightColorPicker) {
            highlightColorPicker.style.display = 'none';
        }
    }
    
    // Update toolbar button states based on current selection formatting
    function updateToolbarState() {
        const buttons = toolbar.querySelectorAll('.toolbar-buttons .toolbar-button'); // Target only main buttons
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        let parentNode = range.commonAncestorContainer;
        if (parentNode.nodeType === Node.TEXT_NODE) {
            parentNode = parentNode.parentNode;
        }

        buttons.forEach(button => {
            button.classList.remove('active');
            const command = button.getAttribute('data-command');

            try {
                if (command === 'bold' || command === 'italic' || command === 'underline' || command === 'strikeThrough' || command === 'insertOrderedList' || command === 'insertUnorderedList') {
                     if (document.queryCommandState(command)) {
                        button.classList.add('active');
                    }
                }
            } catch (e) { console.warn("Error queryCommandState for " + command, e); }


            const blockType = document.queryCommandValue('formatBlock').toLowerCase();
            if ((command === 'h1' && blockType === 'h1') ||
                (command === 'h2' && blockType === 'h2') ||
                (command === 'h3' && blockType === 'h3') ||
                (command === 'quote' && (blockType === 'blockquote' || parentNode.closest('blockquote')))) { // Check parent for blockquote too
                button.classList.add('active');
            }
             // Check for lists more reliably
            if (command === 'orderedList') {
                if (parentNode.closest('ol')) button.classList.add('active');
            }
            if (command === 'unorderedList') {
                 if (parentNode.closest('ul')) button.classList.add('active');
            }


            if (command === 'inlineCode') {
                if (parentNode.closest('code')) button.classList.add('active');
            }
            
            if (command === 'highlight') {
                let highlightNode = parentNode;
                let isHighlighted = false;
                while(highlightNode && highlightNode !== contentEditor) {
                    if (highlightNode.nodeType === Node.ELEMENT_NODE && highlightNode.className && highlightNode.className.startsWith('highlight-')) {
                        isHighlighted = true;
                        break;
                    }
                    highlightNode = highlightNode.parentNode;
                }
                if (isHighlighted) button.classList.add('active');
            }
            
            if (command === 'link') {
                if (parentNode.closest('a')) {
                    button.classList.add('active');
                }
            }
        });
    }
    
    // Handle toolbar button clicks
    toolbar.querySelectorAll('.toolbar-buttons .toolbar-button').forEach(button => {
        button.addEventListener('click', function(e) {
            const command = this.getAttribute('data-command');
             e.stopPropagation(); // Prevent toolbar from hiding if we click a button that doesn't open a sub-form

            if (command === 'highlight') {
                // Toggle color picker
                if (highlightColorPicker.style.display === 'none') {
                    highlightColorPicker.style.display = 'flex';
                    // Position it. For simplicity, it's part of the toolbar div, so relative positioning works.
                } else {
                    highlightColorPicker.style.display = 'none';
                }
                return; // Don't apply formatting yet, just show/hide picker
            }
            
            // For other commands, hide picker if open
            if (highlightColorPicker) highlightColorPicker.style.display = 'none';


            // Restore the selection before applying formatting
            if (currentSelection) {
                 const selection = window.getSelection();
                 selection.removeAllRanges();
                 selection.addRange(currentSelection);
            }
            
            applyFormatting(command);
            
            // Update the hidden form fields after formatting
            updateFormFields();
            // Toolbar might hide due to selection change, so re-update state if needed
            setTimeout(updateToolbarState, 0); 
        });
    });

    colorOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const color = this.getAttribute('data-color');
             if (currentSelection) {
                 const selection = window.getSelection();
                 selection.removeAllRanges();
                 selection.addRange(currentSelection);
            }
            applyFormatting('highlight', color);
            highlightColorPicker.style.display = 'none';
            setTimeout(hideToolbar, 50); 
        });
    });

    if (removeHighlightButton) {
        removeHighlightButton.addEventListener('click', function(e) {
            e.stopPropagation();
            if (currentSelection) {
                 const selection = window.getSelection();
                 selection.removeAllRanges();
                 selection.addRange(currentSelection);
            }
            applyFormatting('removeHighlight');
            highlightColorPicker.style.display = 'none';
            setTimeout(hideToolbar, 50);
        });
    }
    
    // Apply formatting based on command
    function applyFormatting(command, value = null) {
        // currentSelection should be restored by the caller if needed
        let selectionText = window.getSelection().toString();

        switch (command) {
            case 'bold': document.execCommand('bold'); break;
            case 'italic': document.execCommand('italic'); break;
            case 'h1': document.execCommand('formatBlock', false, 'h1'); break;
            case 'h2': document.execCommand('formatBlock', false, 'h2'); break;
            case 'h3': document.execCommand('formatBlock', false, 'h3'); break;
            case 'orderedList': document.execCommand('insertOrderedList'); break;
            case 'unorderedList': document.execCommand('insertUnorderedList'); break;
            case 'quote': document.execCommand('formatBlock', false, 'blockquote'); break;
            case 'inlineCode':
                if (selectionText) {
                    document.execCommand('insertHTML', false, '<code>' + selectionText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</code>');
                }
                break;
            case 'highlight':
                if (selectionText && value) {
                    document.execCommand('insertHTML', false, `<span class="highlight-${value}">${selectionText}</span>`);
                }
                break;
            case 'removeHighlight':
                if (selectionText) {
                    // Attempt to remove by un-wrapping. This is complex.
                    // A simpler method for now:
                    let sel = window.getSelection();
                    if (sel.rangeCount > 0) {
                        let range = sel.getRangeAt(0);
                        let el = range.commonAncestorContainer;
                        if (el.nodeType !== 1) el = el.parentNode;
                        
                        // Find the closest highlight span and remove it
                        let spanToUnwrap = null;
                        let tempEl = el;
                        while(tempEl && tempEl !== contentEditor) {
                            if (tempEl.nodeType === 1 && tempEl.nodeName === 'SPAN' && tempEl.className && tempEl.className.startsWith('highlight-')) {
                                spanToUnwrap = tempEl;
                                break;
                            }
                            tempEl = tempEl.parentNode;
                        }

                        if (spanToUnwrap) {
                            let parent = spanToUnwrap.parentNode;
                            while (spanToUnwrap.firstChild) {
                                parent.insertBefore(spanToUnwrap.firstChild, spanToUnwrap);
                            }
                            parent.removeChild(spanToUnwrap);
                        } else {
                             // Fallback if no single span is found, try removeFormat on selection
                             // This is broad, but might help.
                             document.execCommand('removeFormat');
                        }
                    }
                }
                break;
            case 'link':
                // currentSelection is already set by selectionchange
                showLinkForm(); 
                return; 
        }
        updateToolbarState();
        updateFormFields();
        contentEditor.focus();
    }
    
    // Show link input form
    function showLinkForm() {
        // Hide toolbar buttons, show link form
        toolbar.querySelector('.toolbar-buttons').style.display = 'none';
        linkForm.classList.add('visible');
        
        // Get any existing link in the selection
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const node = selection.getRangeAt(0).commonAncestorContainer;
            const linkElement = getClosestLink(node);
            
            if (linkElement) {
                linkInput.value = linkElement.href;
            } else {
                linkInput.value = '';
            }
        }
        
        linkInput.focus();
    }
    
    // Hide link form
    function hideLinkForm() {
        linkForm.classList.remove('visible');
        toolbar.querySelector('.toolbar-buttons').style.display = 'flex';
        linkInput.value = '';
    }
    
    // Apply link button click
    applyLinkButton.addEventListener('click', function() {
        const url = linkInput.value.trim();
        if (url) {
            // Restore the selection
            if (currentSelection) {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(currentSelection);
            }
            
            // Add protocol if missing
            let formattedUrl = url;
            if (!/^https?:\/\//i.test(url)) {
                formattedUrl = 'https://' + url;
            }
            
            document.execCommand('createLink', false, formattedUrl);
            
            // Update form fields
            updateFormFields();
        }
        
        hideLinkForm();
        setTimeout(hideToolbar, 100);
    });
    
    // Cancel link button click
    cancelLinkButton.addEventListener('click', function() {
        hideLinkForm();
        setTimeout(hideToolbar, 100);
    });
    
    // Handle keyboard shortcuts
    contentEditor.addEventListener('keydown', function(e) {
        // Ctrl+B: Bold
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            document.execCommand('bold', false, null);
        }
        
        // Ctrl+I: Italic
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            document.execCommand('italic', false, null);
        }
        
        // Ctrl+K: Link
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            if (window.getSelection().toString().trim() !== '') {
                showLinkForm();
            }
        }
        
        // Update form fields after formatting
        updateFormFields();
    });
    
    // Click outside handler to hide toolbar properly
    document.addEventListener('mousedown', function(e) {
        // Check if the click is outside the toolbar AND the color picker
        const isToolbarClick = toolbar.contains(e.target);
        const isPickerClick = highlightColorPicker && highlightColorPicker.contains(e.target);

        if (toolbar.classList.contains('visible') && !isToolbarClick && !isPickerClick) {
            // If the click is on the content editor, do not hide immediately, let selectionchange handle it
            if (contentEditor.contains(e.target)) {
                // If click is inside selection, don't hide.
                if (isClickInsideSelection(e)) return;
            }
            hideToolbar();
        }
    });
    
    // Check if click is inside the current selection
    function isClickInsideSelection(e) {
        if (!currentSelection) return false;
        
        const range = currentSelection;
        const rect = range.getBoundingClientRect();
        
        return (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
        );
    }
}

// Helper function to get the closest link element
function getClosestLink(node) {
    while (node && node !== document) {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A') {
            return node;
        }
        node = node.parentNode;
    }
    return null;
}

// Handle markdown block shortcuts on space
function handleMarkdownBlockShortcutsOnSpace(editor) {
    const selection = window.getSelection();
    if (!selection.rangeCount || !selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    let container = range.startContainer; // Usually a text node
    
    if (container.nodeType !== Node.TEXT_NODE || range.startOffset === 0) return;

    let textContentBeforeSpace = container.textContent.substring(0, range.startOffset -1); // Text before the just-typed space

    // Find the block element (P, DIV, LI etc.)
    let blockElement = container;
    while (blockElement && blockElement !== editor) {
        if (blockElement.nodeType === Node.ELEMENT_NODE && 
            (blockElement.matches('p, div, h1, h2, h3, h4, h5, h6, li') || blockElement.parentNode === editor)) {
            // Check if textContentBeforeSpace is at the beginning of this block
            if ((blockElement.textContent || blockElement.innerText || "").trim().startsWith(textContentBeforeSpace.trim())) {
                 break;
            }
        }
        blockElement = blockElement.parentNode;
    }
    
    if (!blockElement || blockElement === editor) {
         // If we are directly in contentEditor, or couldn't find a block,
         // and the text node is the first child of the editor, treat the text node's content.
        if (container.nodeType === Node.TEXT_NODE && container.parentNode === editor) {
            // This is a simple case, text directly in editor.
        } else {
            return; // Cannot determine block reliably for markdown.
        }
    }
    
    // Use the text content of the text node where space was typed
    const currentTextNodeContent = container.textContent;
    const textForMarkdownCheck = currentTextNodeContent.substring(0, range.startOffset).trim(); // Includes the space

    let command = null;
    let charsToRemove = 0; // Number of chars for markdown prefix (e.g., "# ", "> ")

    if (textForMarkdownCheck === '#') { command = 'h1'; charsToRemove = 1; }
    else if (textForMarkdownCheck === '##') { command = 'h2'; charsToRemove = 2; }
    else if (textForMarkdownCheck === '###') { command = 'h3'; charsToRemove = 3; }
    else if (textForMarkdownCheck === '>') { command = 'quote'; charsToRemove = 1; }
    else if (textForMarkdownCheck === '*' || textForMarkdownCheck === '-') { command = 'insertUnorderedList'; charsToRemove = 1; }
    else if (textForMarkdownCheck.match(/^\d+\.$/)) { // Matches "1.", "10." etc.
        command = 'insertOrderedList'; 
        charsToRemove = textForMarkdownCheck.length;
    }

    if (command) {
        // The space is already typed. We need to remove the markdown prefix from the text node.
        // Range is at: prefix<space>|cursor
        // We want to delete "prefix"
        range.setStart(container, 0); // Start of text node
        range.setEnd(container, charsToRemove); // End of prefix
        
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('delete'); // Delete the markdown prefix (e.g., "#")

        // The space is still there. The cursor is now at the beginning of the space.
        // Applying formatBlock or list command should work correctly.
        
        if (command.startsWith('insert')) { // For lists
            document.execCommand(command);
        } else { // For formatBlock (h1, h2, h3, blockquote)
            document.execCommand('formatBlock', false, command);
        }
        
        // Prevent default space insertion if necessary, though 'input' event is after the fact.
        // The main goal is that the formatting is applied.
        updateFormFields();
    }
}

// Initialize all functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePublishButton();
    initFormattingToolbar();
});
