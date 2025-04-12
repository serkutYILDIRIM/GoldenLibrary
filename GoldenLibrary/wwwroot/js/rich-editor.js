/**
 * rich-editor.js - Medium-like WYSIWYG Editor
 * A JavaScript module for creating a rich text editing experience
 */

(function() {
    // Store editor elements
    let editor = {
        container: null,
        title: null,
        subtitle: null,
        content: null,
        toolbar: null,
        addButton: null,
        mediaDialog: null
    };

    // Track selection and caret position
    let currentSelection = null;
    let currentCaretNode = null;
    let currentCaretOffset = 0;
    let selectionTimeout = null;
    let lastFocusedElement = null;

    // Autosave tracking
    let autoSaveTimer = null;
    let localSaveTimer = null;
    const AUTO_SAVE_DELAY = 3000; // 3 seconds
    const LOCAL_SAVE_DELAY = 1000; // 1 second
    let lastSavedContent = '';
    let savingInProgress = false;

    /**
     * Initialize the rich text editor
     */
    function initEditor() {
        // Get all editor elements
        editor.container = document.querySelector('.editor-container');
        if (!editor.container) return;

        editor.title = document.getElementById('titleEditor');
        editor.subtitle = document.getElementById('descriptionEditor');
        editor.content = document.getElementById('contentEditor');
        editor.toolbar = document.getElementById('formattingToolbar');
        editor.addButton = document.getElementById('contentAddButton');
        editor.mediaDialog = document.getElementById('mediaDialog');

        // Initialize components
        initContentEditors();
        initFormattingToolbar();
        initContentAddButton();
        initMediaDialogs();
        initAutoSave();
        initPublishFlow();
        
        // Track word and character count
        setInterval(updateWordCount, 2000);
        
        // Initial word count
        updateWordCount();
    }

    /**
     * Initialize contentEditable editors
     */
    function initContentEditors() {
        if (!editor.title || !editor.subtitle || !editor.content) return;

        // Auto-expanding behavior
        [editor.title, editor.subtitle, editor.content].forEach(element => {
            // Set initial height if content exists
            adjustHeight(element);

            // Add input event listeners
            element.addEventListener('input', function(e) {
                adjustHeight(this);
                updateFormFields();
                
                // Track selection
                saveCurrentSelection();
                
                // Reset autosave timers
                resetAutoSaveTimers();
            });

            // Handle paste to clean formatting
            element.addEventListener('paste', function(e) {
                e.preventDefault();
                const text = (e.originalEvent || e).clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
            });

            // Handle focus to track last focused element
            element.addEventListener('focus', function() {
                lastFocusedElement = this;
            });
        });

        // Special handling for title and subtitle - press Enter to move to next field
        editor.title.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                editor.subtitle.focus();
            }
        });

        editor.subtitle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                editor.content.focus();
            }
        });

        // Tab key navigation between editors
        editor.title.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                editor.subtitle.focus();
            }
        });

        editor.subtitle.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                    editor.title.focus();
                } else {
                    editor.content.focus();
                }
            }
        });

        editor.content.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                editor.subtitle.focus();
            }
        });

        // Content area keyboard shortcuts
        editor.content.addEventListener('keydown', function(e) {
            // Ctrl+B: Bold
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                document.execCommand('bold', false);
            }
            
            // Ctrl+I: Italic
            if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                document.execCommand('italic', false);
            }
            
            // Ctrl+K: Link
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                showLinkForm();
            }
        });

        // Track selection changes in content
        document.addEventListener('selectionchange', handleSelectionChange);

        // Initial focus on title if empty
        if (!editor.title.textContent.trim()) {
            editor.title.focus();
        }
    }

    /**
     * Formatting toolbar functionality
     */
    function initFormattingToolbar() {
        if (!editor.toolbar) return;

        const toolbarButtons = editor.toolbar.querySelectorAll('.toolbar-button');
        const headingDropdownBtn = document.getElementById('headingDropdownBtn');
        const headingDropdown = document.getElementById('headingDropdown');
        const linkForm = document.getElementById('linkForm');
        const linkInput = document.getElementById('linkInput');
        const applyLinkButton = document.getElementById('applyLinkButton');
        const cancelLinkButton = document.getElementById('cancelLinkButton');

        // Handle toolbar button clicks
        toolbarButtons.forEach(button => {
            button.addEventListener('click', function() {
                const command = this.getAttribute('data-command');
                const value = this.getAttribute('data-value') || null;

                // Handle special cases
                if (command === 'link') {
                    showLinkForm();
                    return;
                }

                // Restore selection if needed
                restoreSelection();
                
                // Apply formatting
                document.execCommand(command, false, value);
                
                // Update form fields
                updateFormFields();
                
                // Update button states
                updateToolbarButtonStates();
            });
        });

        // Heading dropdown toggle
        if (headingDropdownBtn && headingDropdown) {
            headingDropdownBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                headingDropdown.classList.toggle('active');
            });

            // Close dropdown when clicking elsewhere
            document.addEventListener('click', function() {
                headingDropdown.classList.remove('active');
            });

            // Handle dropdown item clicks
            headingDropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const command = this.getAttribute('data-command');
                    const value = this.getAttribute('data-value');
                    
                    // Restore selection
                    restoreSelection();
                    
                    // Apply heading format
                    document.execCommand(command, false, value);
                    
                    // Update form fields
                    updateFormFields();
                    
                    // Close the dropdown
                    headingDropdown.classList.remove('active');
                });
            });
        }

        // Link form handling
        if (linkForm) {
            // Apply link button
            applyLinkButton.addEventListener('click', function() {
                applyLink();
            });
            
            // Cancel link button
            cancelLinkButton.addEventListener('click', function() {
                hideLinkForm();
            });
            
            // Enter key in link input
            linkInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                } else if (e.key === 'Escape') {
                    hideLinkForm();
                }
            });
        }
        
        // Function to show link form
        function showLinkForm() {
            // Hide toolbar buttons, show link form
            const toolbarButtons = editor.toolbar.querySelector('.toolbar-buttons');
            if (toolbarButtons) toolbarButtons.style.display = 'none';
            
            if (linkForm) {
                linkForm.classList.add('active');
                
                // Check if selection contains a link to pre-fill
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const node = selection.getRangeAt(0).commonAncestorContainer;
                    const linkElement = findParentWithTag(node, 'A');
                    
                    if (linkElement) {
                        linkInput.value = linkElement.href;
                    } else {
                        linkInput.value = '';
                    }
                }
                
                linkInput.focus();
            }
        }
        
        // Function to hide link form
        function hideLinkForm() {
            if (linkForm) linkForm.classList.remove('active');
            
            const toolbarButtons = editor.toolbar.querySelector('.toolbar-buttons');
            if (toolbarButtons) toolbarButtons.style.display = 'flex';
            
            if (linkInput) linkInput.value = '';
        }
        
        // Function to apply link
        function applyLink() {
            const url = linkInput.value.trim();
            
            if (url) {
                // Restore selection
                restoreSelection();
                
                // Format URL if needed
                let formattedUrl = url;
                if (!/^https?:\/\//i.test(url)) {
                    formattedUrl = 'https://' + url;
                }
                
                // Create the link
                document.execCommand('createLink', false, formattedUrl);
                
                // Update form fields
                updateFormFields();
            }
            
            hideLinkForm();
        }
    }

    /**
     * Handle selection changes and show/hide toolbar
     */
    function handleSelectionChange() {
        clearTimeout(selectionTimeout);
        
        selectionTimeout = setTimeout(() => {
            const selection = window.getSelection();
            
            if (selection.rangeCount > 0 && selection.toString().trim() !== '') {
                const range = selection.getRangeAt(0);
                
                // Check if selection is within the content editor
                if (editor.content && editor.content.contains(range.commonAncestorContainer)) {
                    // Save current selection
                    saveCurrentSelection();
                    
                    // Show toolbar at selection
                    showToolbarAtSelection(selection);
                } else {
                    hideToolbar();
                }
            } else {
                // Only hide toolbar if not interacting with it
                if (editor.toolbar && !editor.toolbar.contains(document.activeElement)) {
                    hideToolbar();
                }
            }
        }, 100);
    }

    /**
     * Show toolbar at current selection
     */
    function showToolbarAtSelection(selection) {
        if (!editor.toolbar) return;
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Position the toolbar above the selection
        editor.toolbar.style.top = `${window.scrollY + rect.top - editor.toolbar.offsetHeight - 10}px`;
        editor.toolbar.style.left = `${window.scrollX + rect.left + (rect.width / 2) - (editor.toolbar.offsetWidth / 2)}px`;
        
        // Make sure the toolbar stays within viewport bounds
        const rightEdge = editor.toolbar.getBoundingClientRect().right;
        const viewportWidth = window.innerWidth;
        
        if (rightEdge > viewportWidth) {
            const offset = rightEdge - viewportWidth + 10;
            editor.toolbar.style.left = `${parseInt(editor.toolbar.style.left) - offset}px`;
        }
        
        if (parseInt(editor.toolbar.style.left) < 10) {
            editor.toolbar.style.left = '10px';
        }
        
        // Show the toolbar with animation
        editor.toolbar.classList.add('active');
        
        // Update active state of buttons based on current formatting
        updateToolbarButtonStates();
    }

    /**
     * Hide the formatting toolbar
     */
    function hideToolbar() {
        if (!editor.toolbar) return;
        
        // Don't hide if we're focused in the link form
        const linkForm = editor.toolbar.querySelector('#linkForm');
        if (linkForm && linkForm.classList.contains('active') && 
            linkForm.contains(document.activeElement)) {
            return;
        }
        
        editor.toolbar.classList.remove('active');
        
        // Also hide any active link form
        const activeLinkForm = editor.toolbar.querySelector('#linkForm.active');
        if (activeLinkForm) {
            activeLinkForm.classList.remove('active');
            
            // Show toolbar buttons again
            const toolbarButtons = editor.toolbar.querySelector('.toolbar-buttons');
            if (toolbarButtons) toolbarButtons.style.display = 'flex';
        }
    }

    /**
     * Update toolbar button states based on current selection formatting
     */
    function updateToolbarButtonStates() {
        if (!editor.toolbar) return;
        
        const buttons = editor.toolbar.querySelectorAll('.toolbar-button');
        
        buttons.forEach(button => {
            button.classList.remove('active');
            
            const command = button.getAttribute('data-command');
            
            if (command === 'bold' && document.queryCommandState('bold')) {
                button.classList.add('active');
            } 
            else if (command === 'italic' && document.queryCommandState('italic')) {
                button.classList.add('active');
            }
            else if (command === 'underline' && document.queryCommandState('underline')) {
                button.classList.add('active');
            }
            else if (command === 'formatBlock') {
                const value = button.getAttribute('data-value');
                const selection = window.getSelection();
                
                if (selection.rangeCount > 0) {
                    const node = selection.getRangeAt(0).commonAncestorContainer;
                    const parent = findParentWithTag(node, value.toUpperCase());
                    
                    if (parent) {
                        button.classList.add('active');
                    }
                }
            }
            else if (command === 'insertUnorderedList' && document.queryCommandState('insertUnorderedList')) {
                button.classList.add('active');
            }
            else if (command === 'insertOrderedList' && document.queryCommandState('insertOrderedList')) {
                button.classList.add('active');
            }
            else if (command === 'link') {
                // Check if selection contains a link
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const node = selection.getRangeAt(0).commonAncestorContainer;
                    const linkElement = findParentWithTag(node, 'A');
                    
                    if (linkElement) {
                        button.classList.add('active');
                    }
                }
            }
        });
    }

    /**
     * Initialize content addition button
     */
    function initContentAddButton() {
        if (!editor.addButton || !editor.content) return;

        const addButtonTrigger = editor.addButton.querySelector('.add-button-trigger');
        const addMenuItems = editor.addButton.querySelectorAll('.add-menu-item');
        
        // Current node in content where button is shown
        let lastFocusNode = null;
        
        // Toggle add menu on click
        if (addButtonTrigger) {
            addButtonTrigger.addEventListener('click', function(e) {
                e.preventDefault();
                editor.addButton.classList.toggle('open');
                
                // Save current selection
                saveCurrentSelection();
            });
        }
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (editor.addButton && !editor.addButton.contains(e.target)) {
                editor.addButton.classList.remove('open');
            }
        });
        
        // Update button position on click and key events
        editor.content.addEventListener('click', updateAddButtonPosition);
        editor.content.addEventListener('keyup', function(e) {
            // Only update on navigation and text change keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace', 'Delete'].includes(e.key)) {
                updateAddButtonPosition();
            }
        });
        
        // Handle menu item clicks
        addMenuItems.forEach(item => {
            item.addEventListener('click', function() {
                const contentType = this.getAttribute('data-content-type');
                
                // Close the menu
                editor.addButton.classList.remove('open');
                
                // Handle different content types
                switch (contentType) {
                    case 'image':
                        showMediaPane('imageUploadPane', 'Add Image');
                        break;
                    case 'video':
                        showMediaPane('videoUploadPane', 'Add Video');
                        break;
                    case 'embed':
                        showMediaPane('embedUploadPane', 'Add Embed');
                        break;
                    case 'code':
                        showMediaPane('codeBlockPane', 'Add Code Block');
                        break;
                    case 'divider':
                        insertDivider();
                        break;
                }
            });
        });
    }

    /**
     * Update the position of the content add button
     */
    function updateAddButtonPosition() {
        if (!editor.addButton || !editor.content) return;
        
        // Get current selection
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        // Get the current node
        const range = selection.getRangeAt(0);
        let currentNode = range.startContainer;
        
        // Find closest block-level element
        let blockNode = currentNode;
        while (blockNode && blockNode !== editor.content) {
            if (blockNode.nodeType === 1 && isBlockElement(blockNode)) {
                break;
            }
            blockNode = blockNode.parentNode;
        }
        
        // Default to editor if no block found
        if (!blockNode || blockNode === editor.content) {
            if (editor.content.children.length > 0) {
                blockNode = editor.content.children[0];
            } else {
                blockNode = editor.content;
            }
        }
        
        // Only update if we moved to a different block
        if (blockNode !== lastFocusNode) {
            lastFocusNode = blockNode;
            
            // Get positions
            const rect = blockNode.getBoundingClientRect();
            const editorRect = editor.content.getBoundingClientRect();
            
            // Position button next to current block
            editor.addButton.style.top = `${rect.top - editorRect.top + editor.content.scrollTop}px`;
            editor.addButton.style.display = 'block';
            
            // Make button visible
            editor.addButton.style.opacity = '1';
        }
    }

    /**
     * Initialize media dialog and panes
     */
    function initMediaDialogs() {
        if (!editor.mediaDialog) return;

        const closeBtn = editor.mediaDialog.querySelector('#closeMediaDialog');
        const imageDropArea = document.getElementById('imageDropArea');
        const imageFileInput = document.getElementById('imageFileInput');
        const insertImageUrlBtn = document.getElementById('insertImageUrlBtn');
        const insertVideoBtn = document.getElementById('insertVideoBtn');
        const insertEmbedBtn = document.getElementById('insertEmbedBtn');
        const insertCodeBtn = document.getElementById('insertCodeBtn');
        
        // Close dialog button
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                editor.mediaDialog.classList.remove('active');
            });
        }
        
        // Close dialog when clicking outside
        editor.mediaDialog.addEventListener('click', function(e) {
            if (e.target === editor.mediaDialog) {
                editor.mediaDialog.classList.remove('active');
            }
        });
        
        // Image drop area functionality
        if (imageDropArea && imageFileInput) {
            // Click to select file
            imageDropArea.addEventListener('click', function() {
                imageFileInput.click();
            });
            
            // Handle file selection
            imageFileInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    handleImageFile(this.files[0]);
                }
            });
            
            // Drag and drop functionality
            imageDropArea.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.style.borderColor = '#1a8917';
                this.style.backgroundColor = 'rgba(26, 137, 23, 0.05)';
            });
            
            imageDropArea.addEventListener('dragleave', function() {
                this.style.borderColor = '';
                this.style.backgroundColor = '';
            });
            
            imageDropArea.addEventListener('drop', function(e) {
                e.preventDefault();
                this.style.borderColor = '';
                this.style.backgroundColor = '';
                
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleImageFile(e.dataTransfer.files[0]);
                }
            });
        }
        
        // Insert image from URL
        if (insertImageUrlBtn) {
            insertImageUrlBtn.addEventListener('click', function() {
                const imageUrl = document.getElementById('imageUrlInput').value.trim();
                if (imageUrl) {
                    insertImage(imageUrl);
                    document.getElementById('imageUrlInput').value = '';
                    editor.mediaDialog.classList.remove('active');
                }
            });
        }
        
        // Insert video
        if (insertVideoBtn) {
            insertVideoBtn.addEventListener('click', function() {
                const videoUrl = document.getElementById('videoUrlInput').value.trim();
                if (videoUrl) {
                    insertVideo(videoUrl);
                    document.getElementById('videoUrlInput').value = '';
                    editor.mediaDialog.classList.remove('active');
                }
            });
        }
        
        // Insert embed
        if (insertEmbedBtn) {
            insertEmbedBtn.addEventListener('click', function() {
                const embedCode = document.getElementById('embedCodeInput').value.trim();
                if (embedCode) {
                    insertEmbed(embedCode);
                    document.getElementById('embedCodeInput').value = '';
                    editor.mediaDialog.classList.remove('active');
                }
            });
        }
        
        // Insert code block
        if (insertCodeBtn) {
            insertCodeBtn.addEventListener('click', function() {
                const code = document.getElementById('codeInput').value;
                const language = document.getElementById('codeLanguageSelect').value;
                
                if (code) {
                    insertCodeBlock(code, language);
                    document.getElementById('codeInput').value = '';
                    editor.mediaDialog.classList.remove('active');
                }
            });
        }
    }

    /**
     * Show a specific media dialog pane
     */
    function showMediaPane(paneId, title) {
        if (!editor.mediaDialog) return;
        
        // Set dialog title
        const titleElem = document.getElementById('mediaDialogTitle');
        if (titleElem) titleElem.textContent = title;
        
        // Hide all panes
        const panes = editor.mediaDialog.querySelectorAll('.media-pane');
        panes.forEach(pane => pane.classList.remove('active'));
        
        // Show requested pane
        const pane = document.getElementById(paneId);
        if (pane) pane.classList.add('active');
        
        // Show dialog
        editor.mediaDialog.classList.add('active');
    }

    /**
     * Handle selected image file
     */
    function handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPEG, PNG, GIF).');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // In a real app, you would upload to server
            // For now, just use the data URL
            insertImage(e.target.result);
            editor.mediaDialog.classList.remove('active');
        };
        reader.readAsDataURL(file);
    }

    /**
     * Insert image at current selection
     */
    function insertImage(src) {
        restoreSelection();
        
        const imageHtml = `
            <figure class="media-container">
                <img src="${src}" alt="User uploaded image">
                <figcaption contenteditable="true" data-placeholder="Add a caption (optional)"></figcaption>
            </figure>
            <p><br></p>
        `;
        
        insertContentAtCaret(imageHtml);
    }

    /**
     * Insert video at current selection
     */
    function insertVideo(url) {
        restoreSelection();
        
        // Extract video ID and create embed code
        let embedCode = '';
        
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            // YouTube
            let videoId = '';
            
            if (url.includes('youtube.com/watch')) {
                const urlParams = new URLSearchParams(new URL(url).search);
                videoId = urlParams.get('v');
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split('?')[0];
            }
            
            if (videoId) {
                embedCode = `<div class="video-container"><iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe></div><p><br></p>`;
            }
        } else if (url.includes('vimeo.com')) {
            // Vimeo
            const vimeoId = url.split('vimeo.com/')[1].split('?')[0];
            embedCode = `<div class="video-container"><iframe src="https://player.vimeo.com/video/${vimeoId}" allowfullscreen></iframe></div><p><br></p>`;
        } else {
            alert('Unsupported video URL. Please use YouTube or Vimeo links.');
            return;
        }
        
        if (embedCode) {
            insertContentAtCaret(embedCode);
        }
    }

    /**
     * Insert embed code at current selection
     */
    function insertEmbed(code) {
        restoreSelection();
        insertContentAtCaret(`<div class="embed-container">${code}</div><p><br></p>`);
    }

    /**
     * Insert code block at current selection
     */
    function insertCodeBlock(code, language) {
        restoreSelection();
        
        // Escape HTML entities
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        insertContentAtCaret(`<pre class="code-block" data-language="${language}">${escapedCode}</pre><p><br></p>`);
    }

    /**
     * Insert divider at current selection
     */
    function insertDivider() {
        restoreSelection();
        insertContentAtCaret('<hr class="content-divider"><p><br></p>');
    }

    /**
     * Save current selection for later restoration
     */
    function saveCurrentSelection() {
        const selection = window.getSelection();
        
        if (selection.rangeCount > 0) {
            currentSelection = selection.getRangeAt(0).cloneRange();
            
            // Also save specific node and offset for more reliable restoration
            currentCaretNode = selection.focusNode;
            currentCaretOffset = selection.focusOffset;
        }
    }

    /**
     * Restore previously saved selection
     */
    function restoreSelection() {
        // Focus content editor first
        if (editor.content) editor.content.focus();
        
        if (currentSelection) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(currentSelection);
            return true;
        } else if (currentCaretNode) {
            try {
                const selection = window.getSelection();
                const range = document.createRange();
                range.setStart(currentCaretNode, currentCaretOffset);
                range.setEnd(currentCaretNode, currentCaretOffset);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            } catch (e) {
                console.error('Error restoring selection from node/offset:', e);
            }
        }
        
        return false;
    }

    /**
     * Insert HTML content at current caret position
     */
    function insertContentAtCaret(html) {
        // Try to restore selection
        if (!restoreSelection()) {
            // If no selection to restore, place cursor at end of content
            if (editor.content) {
                const range = document.createRange();
                range.selectNodeContents(editor.content);
                range.collapse(false); // Collapse to end
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        
        // Insert HTML at current selection
        document.execCommand('insertHTML', false, html);
        
        // Update form fields
        updateFormFields();
    }

    /**
     * Initialize autosave functionality
     */
    function initAutoSave() {
        // Update form fields on input events
        [editor.title, editor.subtitle, editor.content].forEach(element => {
            if (element) {
                element.addEventListener('input', function() {
                    updateFormFields();
                    resetAutoSaveTimers();
                });
            }
        });
        
        // Tag checkboxes change
        const tagCheckboxes = document.querySelectorAll('.tag-checkbox');
        tagCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateFormFields();
                resetAutoSaveTimers();
            });
        });
        
        // Save before user leaves the page
        window.addEventListener('beforeunload', function() {
            updateFormFields();
            saveToLocalStorage();
        });
        
        // Init values
        updateFormFields();
        const title = document.getElementById('Title').value;
        const content = document.getElementById('Content').value;
        const description = document.getElementById('Description').value;
        lastSavedContent = title + content + description;
        
        // Check for existing draft
        checkForLocalDraft();
    }

    /**
     * Reset autosave timers
     */
    function resetAutoSaveTimers() {
        clearTimeout(autoSaveTimer);
        clearTimeout(localSaveTimer);
        
        localSaveTimer = setTimeout(saveToLocalStorage, LOCAL_SAVE_DELAY);
        autoSaveTimer = setTimeout(performAutoSave, AUTO_SAVE_DELAY);
    }

    /**
     * Save content to local storage
     */
    function saveToLocalStorage() {
        try {
            // Get form values
            const title = document.getElementById('Title').value;
            const content = document.getElementById('Content').value;
            const description = document.getElementById('Description').value;
            
            // Don't save if empty
            if (!title && !content) return;
            
            // Get post ID for key
            const postId = document.getElementById('postId').value;
            const storageKey = postId !== '0' ? `post_draft_${postId}` : 'new_post_draft';
            
            // Get selected tags
            const tagCheckboxes = document.querySelectorAll('.tag-checkbox:checked');
            const selectedTags = Array.from(tagCheckboxes).map(cb => cb.value);
            
            // Create draft object
            const draft = {
                title,
                description,
                content,
                tagIds: selectedTags,
                timestamp: new Date().toISOString()
            };
            
            // Save to localStorage
            localStorage.setItem(storageKey, JSON.stringify(draft));
            
            // Update save indicator
            updateSaveStatus('saved', 'Saved locally');
            
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            return false;
        }
    }

    /**
     * Check for local draft
     */
    function checkForLocalDraft() {
        try {
            // Get storage key based on post ID
            const postId = document.getElementById('postId').value;
            const storageKey = postId !== '0' ? `post_draft_${postId}` : 'new_post_draft';
            
            // Check for existing draft
            const draftData = localStorage.getItem(storageKey);
            if (!draftData) return;
            
            const draft = JSON.parse(draftData);
            const title = editor.title.innerText.trim();
            const content = editor.content.innerText.trim();
            
            // Only offer to restore if current post is empty
            if (!title && !content && (draft.title || draft.content)) {
                // Show restore button
                const draftStatus = document.getElementById('draftStatus');
                const restoreBtn = document.getElementById('restoreDraftBtn');
                
                if (draftStatus && restoreBtn) {
                    // Format time ago
                    const draftDate = new Date(draft.timestamp);
                    const timeAgo = getTimeAgo(draftDate);
                    
                    restoreBtn.innerHTML = `<i class="bi bi-arrow-counterclockwise"></i> Restore draft from ${timeAgo}`;
                    draftStatus.style.display = 'block';
                    
                    // Restore button click handler
                    restoreBtn.onclick = function() {
                        restoreLocalDraft(draft);
                        draftStatus.style.display = 'none';
                    };
                    
                    // Ask to restore on empty post
                    setTimeout(() => {
                        if (confirm(`Found an unsaved draft from ${timeAgo}. Would you like to restore it?`)) {
                            restoreLocalDraft(draft);
                            draftStatus.style.display = 'none';
                        }
                    }, 500);
                }
            }
        } catch (e) {
            console.error('Error checking for local draft:', e);
        }
    }

    /**
     * Restore draft from local storage
     */
    function restoreLocalDraft(draft) {
        try {
            // Restore content
            if (editor.title) editor.title.innerHTML = draft.title || '';
            if (editor.subtitle) editor.subtitle.innerHTML = draft.description || '';
            if (editor.content) editor.content.innerHTML = draft.content || '';
            
            // Restore tags
            if (draft.tagIds && draft.tagIds.length) {
                // Clear all checkboxes
                document.querySelectorAll('.tag-checkbox').forEach(cb => cb.checked = false);
                
                // Check selected ones
                draft.tagIds.forEach(tagId => {
                    const checkbox = document.querySelector(`.tag-checkbox[value="${tagId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            // Update form fields
            updateFormFields();
            
            // Update word count
            updateWordCount();
            
            // Adjust heights
            [editor.title, editor.subtitle, editor.content].forEach(element => {
                if (element) adjustHeight(element);
            });
            
            // Show confirmation
            updateSaveStatus('saved', 'Draft restored');
        } catch (e) {
            console.error('Error restoring draft:', e);
        }
    }

    /**
     * Perform auto save to server
     */
    function performAutoSave() {
        if (savingInProgress) return;
        
        // Get form values
        const title = document.getElementById('Title').value;
        const content = document.getElementById('Content').value;
        const description = document.getElementById('Description').value;
        const url = document.getElementById('Url').value;
        const postId = document.getElementById('postId').value;
        
        // Get selected tag IDs
        const tagCheckboxes = document.querySelectorAll('.tag-checkbox:checked');
        const selectedTagIds = Array.from(tagCheckboxes).map(cb => cb.value);
        const tagString = selectedTagIds.join(',');
        
        // Don't save if nothing changed or empty
        const currentContent = title + content + description + tagString;
        if (currentContent === lastSavedContent || (title.trim() === '' && content.trim() === '')) {
            return;
        }
        
        savingInProgress = true;
        updateSaveStatus('saving', 'Saving...');
        
        // Create URL slug from title if empty
        let formUrl = url;
        if (!formUrl && title.trim() !== '') {
            formUrl = createSlug(title);
            document.getElementById('Url').value = formUrl;
        }
        
        // Create form data
        const formData = new FormData();
        formData.append('Title', title);
        formData.append('Content', content);
        formData.append('Description', description);
        formData.append('Url', formUrl);
        formData.append('PostId', postId);
        formData.append('Tags', tagString);
        
        // Add tag IDs as separate form values for proper array handling
        selectedTagIds.forEach(tagId => {
            formData.append('tagIds[]', tagId);
        });
        
        // Get anti-forgery token
        const token = document.querySelector('input[name="__RequestVerificationToken"]').value;
        
        // Send AJAX request
        fetch('/Posts/AutoSave', {
            method: 'POST',
            body: formData,
            headers: {
                'RequestVerificationToken': token
            }
        })
        .then(response => response.json())
        .then(data => {
            savingInProgress = false;
            
            if (data.success) {
                updateSaveStatus('saved', 'Saved');
                lastSavedContent = currentContent;
                
                // If new draft, update post ID
                if (postId === '0' && data.postId) {
                    document.getElementById('postId').value = data.postId;
                }
                
                // Also save to localStorage as backup
                saveToLocalStorage();
            } else {
                updateSaveStatus('error', 'Failed to save');
                console.error('AutoSave error:', data.message);
            }
        })
        .catch(error => {
            savingInProgress = false;
            updateSaveStatus('error', 'Error saving');
            console.error('AutoSave error:', error);
            
            // Try localStorage backup
            saveToLocalStorage();
        });
    }

    /**
     * Initialize publish workflow
     */
    function initPublishFlow() {
        // Preview button
        const previewBtn = document.getElementById('previewBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', function(e) {
                e.preventDefault();
                showPreview();
            });
        }
        
        // Publish button
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Validate before publishing
                if (!validateBeforePublish()) {
                    return;
                }
                
                // Set form action to publish
                document.getElementById('formAction').value = 'publish';
                
                // Submit form
                const form = document.getElementById('storyForm');
                if (form) {
                    // Clear localStorage draft
                    try {
                        const postId = document.getElementById('postId').value;
                        const storageKey = postId !== '0' ? `post_draft_${postId}` : 'new_post_draft';
                        localStorage.removeItem(storageKey);
                    } catch (e) {
                        console.error('Error clearing localStorage:', e);
                    }
                    
                    form.submit();
                }
            });
        }
    }

    /**
     * Show story preview
     */
    function showPreview() {
        // Get content
        const title = document.getElementById('Title').value || 'Untitled';
        const content = document.getElementById('Content').value || '';
        const description = document.getElementById('Description').value || '';
        
        // Get selected tag names
        const tagElements = document.querySelectorAll('.tag-checkbox:checked');
        const tags = Array.from(tagElements).map(el => {
            const label = el.nextElementSibling;
            return label ? label.textContent.trim() : '';
        }).filter(Boolean);
        
        // Create preview HTML
        const previewHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title} - Preview</title>
                <link rel="stylesheet" href="/lib/bootstrap/css/bootstrap.min.css">
                <link rel="stylesheet" href="/lib/bootstrap-icons/font/bootstrap-icons.min.css">
                <link rel="stylesheet" href="/css/style.css">
                <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Merriweather', serif; line-height: 1.8; padding: 40px; max-width: 800px; margin: 0 auto; }
                    h1 { font-family: 'Montserrat', sans-serif; font-weight: 700; margin-bottom: 20px; }
                    .subtitle { font-size: 1.2rem; color: #6c757d; margin-bottom: 30px; }
                    .preview-banner { background-color: #f8f9fa; padding: 10px; text-align: center; margin-bottom: 30px; }
                    .tags-container { margin-top: 30px; }
                    .tag { display: inline-block; background-color: rgba(26, 137, 23, 0.1); border: 1px solid rgba(26, 137, 23, 0.3); color: #6c757d; padding: 4px 10px; border-radius: 20px; margin-right: 8px; margin-bottom: 8px; font-size: 14px; font-family: 'Montserrat', sans-serif; }
                </style>
            </head>
            <body>
                <div class="preview-banner">
                    <strong>Preview Mode</strong> - This is how your story will look when published
                </div>
                <h1>${title}</h1>
                <div class="subtitle">${description}</div>
                <div class="content">${content}</div>
                <div class="tags-container">
                    ${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </body>
            </html>
        `;
        
        // Open preview in new window
        const previewWindow = window.open('', '_blank');
        previewWindow.document.write(previewHtml);
        previewWindow.document.close();
    }

    /**
     * Validate before publishing
     */
    function validateBeforePublish() {
        // Check if tags are selected
        const selectedTags = document.querySelectorAll('.tag-checkbox:checked');
        if (selectedTags.length === 0) {
            // Highlight tag section
            const tagSection = document.querySelector('.tag-selection-area');
            if (tagSection) {
                tagSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Visual highlight
                tagSection.classList.add('error');
                
                // Update validation message
                const message = document.getElementById('tagValidationMessage');
                if (message) {
                    message.innerHTML = '<span class="text-danger">Please select at least one tag before publishing</span>';
                }
                
                setTimeout(() => {
                    tagSection.classList.remove('error');
                }, 1500);
            }
            
            return false;
        }
        
        // Check title
        const title = document.getElementById('Title').value.trim();
        if (!title) {
            editor.title.focus();
            alert('Please add a title before publishing.');
            return false;
        }
        
        // Check content
        const content = document.getElementById('Content').value.trim();
        if (!content) {
            editor.content.focus();
            alert('Please add content to your story before publishing.');
            return false;
        }
        
        return true;
    }

    /**
     * Update form hidden fields with current editor content
     */
    function updateFormFields() {
        if (editor.title) {
            document.getElementById('Title').value = editor.title.innerText.trim();
        }
        
        if (editor.subtitle) {
            document.getElementById('Description').value = editor.subtitle.innerText.trim();
        }
        
        if (editor.content) {
            document.getElementById('Content').value = editor.content.innerHTML.trim();
        }
        
        // Update tags field
        const selectedTags = document.querySelectorAll('.tag-checkbox:checked');
        const tagIds = Array.from(selectedTags).map(cb => cb.value);
        document.getElementById('Tags').value = tagIds.join(',');
    }

    /**
     * Update word and character count
     */
    function updateWordCount() {
        if (!editor.content) return;
        
        const text = editor.content.innerText || '';
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        const chars = text.length;
        
        const wordCountEl = document.getElementById('wordCount');
        const charCountEl = document.getElementById('characterCount');
        
        if (wordCountEl) wordCountEl.textContent = `${words} words`;
        if (charCountEl) charCountEl.textContent = `${chars} characters`;
    }

    /**
     * Update save status indicator
     */
    function updateSaveStatus(status, message) {
        const saveStatus = document.querySelector('.save-indicator');
        if (!saveStatus) return;
        
        const saveText = saveStatus.querySelector('.save-text');
        if (saveText) saveText.textContent = message;
        
        saveStatus.className = 'save-indicator ' + status;
        
        if (status === 'saved') {
            setTimeout(() => {
                saveText.textContent = 'Saved';
                saveStatus.className = 'save-indicator';
            }, 3000);
        }
    }

    /**
     * Utility: Adjust height of contentEditable element
     */
    function adjustHeight(element) {
        if (!element) return;
        
        // Reset height
        element.style.height = 'auto';
        
        // Get scrollHeight and set new height
        const newHeight = element.scrollHeight;
        element.style.height = `${newHeight}px`;
        
        // Minimum height
        if (element.id === 'titleEditor' && newHeight < 60) {
            element.style.height = '60px';
        } else if (element.id === 'descriptionEditor' && newHeight < 40) {
            element.style.height = '40px';
        }
    }

    /**
     * Utility: Create URL slug from text
     */
    function createSlug(text) {
        return text.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    /**
     * Utility: Get "time ago" string from date
     */
    function getTimeAgo(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'just now';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
        
        const months = Math.floor(days / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    }

    /**
     * Utility: Find parent element with specific tag
     */
    function findParentWithTag(node, tagName) {
        while (node) {
            if (node.nodeType === 1 && node.tagName === tagName) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    /**
     * Utility: Check if element is a block element
     */
    function isBlockElement(element) {
        const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'LI', 'TABLE', 'TR', 'FIGURE'];
        return blockTags.includes(element.tagName);
    }

    // Initialize editor when DOM is ready
    document.addEventListener('DOMContentLoaded', initEditor);
})();