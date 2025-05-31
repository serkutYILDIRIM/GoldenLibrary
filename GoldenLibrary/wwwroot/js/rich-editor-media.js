/**
 * Rich Media Editor Extension
 * Handles media insertion for the rich content editor
 */

document.addEventListener('DOMContentLoaded', function() {
    initRichMediaEditor();
});

function initRichMediaEditor() {
    // Elements
    const contentEditor = document.getElementById('contentEditor');
    const contentAddButton = document.getElementById('contentAddButton');
    const addButtonTrigger = contentAddButton?.querySelector('.add-button-trigger');
    const addMenuItems = contentAddButton?.querySelectorAll('.add-menu-item');
    const mediaDialog = document.getElementById('mediaDialog');
    const closeMediaDialog = document.getElementById('closeMediaDialog');
    
    // Skip initialization if elements aren't found (not on rich editor page)
    if (!contentEditor || !contentAddButton || !mediaDialog) {
        console.log("Rich media editor elements not found - skipping initialization");
        return;
    }
    
    // Current cursor position in the editor
    let savedSelection = null;
    let currentPos = 0;
    
    // Track button position
    let lastParagraph = null;
    let buttonUpdateTimer = null;
    
    // Update the add button position when scrolling
    contentEditor.addEventListener('scroll', function() {
        clearTimeout(buttonUpdateTimer);
        buttonUpdateTimer = setTimeout(updateButtonPosition, 100);
    });
    
    // Toggle add menu on click
    addButtonTrigger.addEventListener('click', function() {
        contentAddButton.classList.toggle('open');
        
        // Save current selection
        saveSelection();
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!contentAddButton.contains(e.target)) {
            contentAddButton.classList.remove('open');
        }
    });
    
    // Content editor click to update button position
    contentEditor.addEventListener('click', function() {
        updateButtonPosition();
    });
    
    // Content editor keyup to update button position
    contentEditor.addEventListener('keyup', function() {
        updateButtonPosition();
    });
    
    // Save the current selection
    function saveSelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedSelection = selection.getRangeAt(0).cloneRange();
        }
    }
    
    // Restore the saved selection
    function restoreSelection() {
        if (savedSelection) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedSelection);
        } else {
            // If no selection was saved, set cursor at the end
            const range = document.createRange();
            range.selectNodeContents(contentEditor);
            range.collapse(false); // collapse to end
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
    
    // Update add button position based on current caret
    function updateButtonPosition() {
        // Save current selection for later use
        saveSelection();
        
        // Get the current selection
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        // Get the current paragraph
        const range = selection.getRangeAt(0);
        let currentNode = range.startContainer;
        
        // Find paragraph or block-level element
        while (currentNode && currentNode !== contentEditor) {
            if (currentNode.nodeType === 1 && 
                (currentNode.tagName === 'P' || 
                 currentNode.tagName === 'BLOCKQUOTE' ||
                 currentNode.tagName === 'H1' ||
                 currentNode.tagName === 'H2' ||
                 currentNode.tagName === 'H3')) {
                break;
            }
            currentNode = currentNode.parentNode;
        }
        
        // Use content editor if no specific block found
        if (!currentNode || currentNode === contentEditor) {
            // If no paragraph exists, create one
            if (contentEditor.childNodes.length === 0 || 
                (contentEditor.childNodes.length === 1 && contentEditor.childNodes[0].nodeType === 3 && contentEditor.childNodes[0].textContent.trim() === '')) {
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                contentEditor.appendChild(p);
                currentNode = p;
                
                // Set cursor in this paragraph
                const range = document.createRange();
                range.setStart(p, 0);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                currentNode = contentEditor;
            }
        }
        
        // Only update position if we've moved to a new paragraph
        if (currentNode !== lastParagraph) {
            lastParagraph = currentNode;
            
            // Get position of current paragraph
            const rect = currentNode.getBoundingClientRect();
            const editorRect = contentEditor.getBoundingClientRect();
            
            // Position the button at the left of the editor, aligned with the current paragraph
            contentAddButton.style.top = `${rect.top - editorRect.top + contentEditor.scrollTop}px`;
        }
    }
    
    // Handle menu item clicks
    addMenuItems.forEach(item => {
        item.addEventListener('click', function() {
            const contentType = this.getAttribute('data-content-type');
            
            // Close the menu
            contentAddButton.classList.remove('open');
            
            // Handle each content type
            switch (contentType) {
                case 'image':
                    showMediaDialog('imageUploadPane', 'Add Image');
                    break;
                    
                case 'video':
                    showMediaDialog('videoUploadPane', 'Add Video');
                    break;
                    
                case 'embed':
                    showMediaDialog('embedUploadPane', 'Add Embed');
                    break;
                    
                case 'code':
                    showMediaDialog('codeBlockPane', 'Add Code Block');
                    break;
                    
                case 'divider':
                    insertContentAtCaret('<hr class="content-divider"><p></p>');
                    break;
            }
        });
    });
    
    // Show media dialog
    function showMediaDialog(paneId, title) {
        // Set dialog title
        document.getElementById('mediaDialogTitle').textContent = title;
        
        // Hide all panes and show the selected one
        document.querySelectorAll('.media-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(paneId).classList.add('active');
        
        // Show the dialog
        mediaDialog.classList.add('visible');
    }
    
    // Close dialog button
    closeMediaDialog.addEventListener('click', function() {
        mediaDialog.classList.remove('visible');
    });
    
    // Close dialog when clicking outside
    mediaDialog.addEventListener('click', function(e) {
        if (e.target === mediaDialog) {
            mediaDialog.classList.remove('visible');
        }
    });
    
    // Image drag & drop functionality
    const imageDropArea = document.getElementById('imageDropArea');
    const imageFileInput = document.getElementById('imageFileInput');
    
    if (imageDropArea && imageFileInput) {
        // Click on drop area to trigger file input
        imageDropArea.addEventListener('click', function(e) {
            e.preventDefault();
            imageFileInput.click();
        });
        
        // Handle file selection
        imageFileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                handleImageUpload(this.files[0]);
            }
        });
        
        // Handle drag and drop
        imageDropArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.style.borderColor = '#d4af37';
            this.style.backgroundColor = 'rgba(212, 175, 55, 0.05)';
        });
        
        imageDropArea.addEventListener('dragleave', function() {
            this.style.borderColor = '#e9ecef';
            this.style.backgroundColor = '';
        });
        
        imageDropArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.style.borderColor = '#e9ecef';
            this.style.backgroundColor = '';
            
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleImageUpload(e.dataTransfer.files[0]);
            }
        });
    }
    
    // Image URL input
    const insertImageUrlBtn = document.getElementById('insertImageUrlBtn');
    if (insertImageUrlBtn) {
        insertImageUrlBtn.addEventListener('click', function() {
            const imageUrl = document.getElementById('imageUrlInput').value.trim();
            if (imageUrl) {
                insertImage(imageUrl);
                document.getElementById('imageUrlInput').value = '';
                mediaDialog.classList.remove('visible');
            }
        });
    }
    
    // Video URL input
    const insertVideoBtn = document.getElementById('insertVideoBtn');
    if (insertVideoBtn) {
        insertVideoBtn.addEventListener('click', function() {
            const videoUrl = document.getElementById('videoUrlInput').value.trim();
            if (videoUrl) {
                insertVideo(videoUrl);
                document.getElementById('videoUrlInput').value = '';
                mediaDialog.classList.remove('visible');
            }
        });
    }
    
    // Embed code input
    const insertEmbedBtn = document.getElementById('insertEmbedBtn');
    if (insertEmbedBtn) {
        insertEmbedBtn.addEventListener('click', function() {
            const embedCode = document.getElementById('embedCodeInput').value.trim();
            if (embedCode) {
                insertEmbed(embedCode);
                document.getElementById('embedCodeInput').value = '';
                mediaDialog.classList.remove('visible');
            }
        });
    }
    
    // Code block input
    const insertCodeBtn = document.getElementById('insertCodeBtn');
    if (insertCodeBtn) {
        insertCodeBtn.addEventListener('click', function() {
            const code = document.getElementById('codeInput').value;
            const language = document.getElementById('codeLanguageSelect').value;
            
            if (code) {
                insertCodeBlock(code, language);
                document.getElementById('codeInput').value = '';
                mediaDialog.classList.remove('visible');
            }
        });
    }
    
    // Upload image file to server
    function handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }
        
        // Show loading indicator
        const imageDropArea = document.getElementById('imageDropArea');
        const originalContent = imageDropArea.innerHTML;
        imageDropArea.innerHTML = '<div class="spinner-border text-golden" role="status"><span class="visually-hidden">Loading...</span></div><p>Uploading image...</p>';
        
        // Create form data
        const formData = new FormData();
        formData.append('mediaFile', file);
        formData.append('mediaType', 'image');
        
        // Get the anti-forgery token
        const token = document.querySelector('input[name="__RequestVerificationToken"]').value;
        
        // Upload the image
        fetch('/Posts/UploadMedia', {
            method: 'POST',
            body: formData,
            headers: {
                'RequestVerificationToken': token
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                insertImage(data.mediaUrl);
                mediaDialog.classList.remove('visible');
            } else {
                alert('Error uploading image: ' + data.message);
                // Restore original content
                imageDropArea.innerHTML = originalContent;
            }
        })
        .catch(error => {
            console.error('Error uploading image:', error);
            alert('Error uploading image. Please try again.');
            // Restore original content
            imageDropArea.innerHTML = originalContent;
        });
    }
      // Insert image at cursor position
    function insertImage(src) {
        restoreSelection();
        
        const imageHtml = `
            <figure class="content-image">
                <img src="${src}" alt="User uploaded image">
                <figcaption contenteditable="true" class="empty-caption"><span class="caption-placeholder">Click to add a caption</span></figcaption>
                <div class="resize-handle top-left"></div>
                <div class="resize-handle top-right"></div>
                <div class="resize-handle bottom-left"></div>
                <div class="resize-handle bottom-right"></div>
            </figure>
            <p><br></p>
        `;
        
        insertContentAtCaret(imageHtml);
        
        // Update form fields
        updateFormFields();
    }
    
    // Insert video at cursor position
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
                embedCode = `<div class="video-container"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe><figcaption contenteditable="true" class="empty-caption"><span class="caption-placeholder">Click to add a caption</span></figcaption></div>`;
            }
        } else if (url.includes('vimeo.com')) {            // Vimeo
            const vimeoId = url.split('vimeo.com/')[1].split('?')[0];
            embedCode = `<div class="video-container"><iframe src="https://player.vimeo.com/video/${vimeoId}" frameborder="0" allowfullscreen></iframe><figcaption contenteditable="true" class="empty-caption"><span class="caption-placeholder">Click to add a caption</span></figcaption></div>`;
        } else {
            alert('Unsupported video URL. Please use YouTube or Vimeo links.');
            return;
        }
        
        if (embedCode) {
            insertContentAtCaret(embedCode + '<p><br></p>');
            
            // Update form fields
            updateFormFields();
        }
    }
    
    // Insert embed code
    function insertEmbed(code) {
        restoreSelection();
        
        // Sanitize the embed code - this is a simple example and may need more robust sanitization
        const sanitizedCode = sanitizeHtml(code);
        
        insertContentAtCaret(`<div class="embed-container">${sanitizedCode}<figcaption contenteditable="true" class="empty-caption"><span class="caption-placeholder">Click to add a caption</span></figcaption></div><p><br></p>`);
        
        // Update form fields
        updateFormFields();
    }
    
    // Insert code block
    function insertCodeBlock(code, language) {
        restoreSelection();
        
        // Escape HTML entities to prevent rendering
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        insertContentAtCaret(`<pre class="code-block" data-language="${language}">${escapedCode}</pre><p><br></p>`);
        
        // Update form fields
        updateFormFields();
    }
    
    // Insert HTML content at current caret position
    function insertContentAtCaret(html) {
        // Focus the editor first
        contentEditor.focus();
        
        // Restore saved selection
        restoreSelection();
        
        // Insert the HTML
        document.execCommand('insertHTML', false, html);
        
        // Update button position
        setTimeout(updateButtonPosition, 0);
    }
    
    // Update form fields after content changes
    function updateFormFields() {
        if (typeof window.updateFormFields === 'function') {
            window.updateFormFields();
        } else {
            // Fallback implementation
            document.getElementById('Content').value = contentEditor.innerHTML;
        }
        
        // Trigger auto-save if available
        if (typeof performAutoSave === 'function') {
            clearTimeout(window.autoSaveTimer);
            window.autoSaveTimer = setTimeout(performAutoSave, 3000);
        }
    }
    
    // Basic HTML sanitizer - should be replaced with a more robust solution in production
    function sanitizeHtml(html) {
        // This is a very basic sanitizer that allows only certain tags
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Remove potentially dangerous attributes
        const allElements = tempDiv.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i];
            
            // Remove dangerous events
            const attrs = element.attributes;
            for (let j = attrs.length - 1; j >= 0; j--) {
                const attr = attrs[j];
                if (attr.name.startsWith('on') || 
                    attr.name === 'href' && attr.value.toLowerCase().startsWith('javascript:')) {
                    element.removeAttribute(attr.name);
                }
            }
        }
        
        // Return sanitized HTML
        return tempDiv.innerHTML;
    }
    
    // Initialize position on page load
    setTimeout(updateButtonPosition, 300);
}