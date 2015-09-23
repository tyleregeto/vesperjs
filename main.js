'use strict';

// TODO deleting needs to cleanup mention tags (contentEditable)
// TODO after insert, a single back space should remove the last name, a second backspace should remove everything up to the '@' character
// TODO support callback match finding, needs to work with AJAX requests
// TODO iframe support (eg: CKEditor)
// TODO minLen param, only autocompletes after this many chars
// TOOD sanitize values before inserting into template (make it a config setting, default on)
// TODO you should be able to pass a view in, that way it can be overridden
// TODO config setting to determine if tab/enter select mention

var te = te || {};

te.parseTemplate = function(data, tmpl) {
    if(typeof(data) === 'string') {
        data = {value: data};
    }

    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        tmpl = tmpl.replace(new RegExp('{'+k+'}', 'g'), data[k]);
    }
    return tmpl;
};

te.newMentionListener = function(targetNode /*node or ID*/, spec) {
    spec = spec || {};

    var target = null;
    var plugin = null;
    var trigChar = spec.triggerCharacter || '@';
    var insertTmpl = spec.insertTmpl || (trigChar + '{value}');
    var insertEmptySpaceAfter = spec.spaceAfterInsert || false;
    // When looking for @ starts, only look back `maxChar` from the caret position
    var maxChar = spec.maxLen || 20;
    // Note: an empty class name is valid, but you won't be able to edit
    // mentions if the template contains an anchor tag in that case.
    // This is because we can't tell the origin of the anchor tag.
    // TODO expect this class in the template
    var mentionTagClassName = spec.mentionClassName || 'te-mention';
    var view = null;
    var termMatch = null;
    var pluginData = null;

    init();
    
    // return an interface to the mention object
    return {
        destory: destory,
    };

    function init() {
        if(typeof(targetNode) === 'string') {
            targetNode = document.getElementById(targetNode);
        }

        target = targetNode;
        
        if(target.tagName.toLowerCase() === 'textarea') {
            plugin = te.newMentionTextareaPlugin(target);
        } else if(target.hasAttribute('contentEditable') && target.getAttribute('contentEditable') !== 'false') {
            plugin = te.newMentionContentEditablePlugin(target);
        }

        view = te.newMentionListView(onMentionSelection, plugin.type(), spec.escapeCloseLength || 3000);
        target.addEventListener('input', onInput);
        target.addEventListener('keydown', onKeyDown);
        target.addEventListener('click', onClick);
    }

    function destory() {
        target.removeEventListener('input', onInput);
        target.removeEventListener('keydown', onKeyDown);
        target.removeEventListener('click', onClick);
        view.destory();
        plugin.destory();
    }

    function onInput(/*e*/) {
        // We delay to the next animation frame. The field's value
        // is guaranteed to be updated by then
        window.requestAnimationFrame(doAutoComplete);
    }

    function onClick(/*e*/) {
        // when the target is clicked on the caret position could change,
        // We need to update the auto complete to handle that case
        window.requestAnimationFrame(doAutoComplete);  
    }

    function onKeyDown(e) {
        var dirty = false;
        var key = e.key || e.keyIdentifier;
        
        // TODO switch to char codes to save bytes?
        switch(key) {
        case 'Up':
        case 'Down':
        case 'Left':
        case 'Right':
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
            dirty = true;
            break;
        }

        if(dirty) {
            window.requestAnimationFrame(doAutoComplete);
        }
    }

    function doAutoComplete() {
        var value = plugin.getValue();

        if(!value) {
            value = {text:'', caretIndex: 0};
        }

        pluginData = value.data;
        termMatch = findTerm(value.text, value.caretIndex);

        if(termMatch) {
            view.setList(findMatches(termMatch.term), plugin.getMenuPosition(termMatch.start));
        } else {
            // clear any existing matches in view
            view.setList([]);
        }
    }

    // called from the view when the user selects a mention
    function onMentionSelection(data) {
        var tag = te.parseTemplate(data, insertTmpl);
        plugin.insert(tag, termMatch, insertEmptySpaceAfter, pluginData);
    }

    function findTerm(v, i) {
        var offset = 0;

        // walk backwards over the string looking for the trigger char
        while(offset < maxChar) {
            var part = v.substr(i - offset, offset + 1);

            if(part[0] === trigChar) {
                // if the first character after the caret is the trigger character,
                // no matches. The caret is in the wrong position.
                if(offset === 0) {
                    return false;
                }

                // grab from the trigChar up to the caret position 
                var match = v.substr(i - offset + 1, offset - 1);
                // make sure we don't match past another trigger char
                var nextTrigChar = match.indexOf(trigChar);
                if(nextTrigChar !== -1) {
                    match = match.substr(0, nextTrigChar);
                }

                // Make sure we aren't matching backwards
                if(i - offset < 0) {
                    return false;
                }

                return {term:match, start: i - offset, end: i};
            }
            offset++;
        }
        return false;
    }

    function findMatches(term) {
        term = term.toLowerCase();
        var data = spec.data || [];
        var matches = [];
        for (var i = 0; i < data.length; i++) {
            var u = data[i];
            if(u.substr(0, term.length).toLowerCase() === term) {
                matches.push(u);
            }
        }
        return matches;
    }
};

te.newMentionTextareaPlugin = function(textarea) {
    return {
        getValue: getValue,
        insert: insert,
        destory: destory,
        getMenuPosition: getMenuPosition,
        type: function(){return 'te-mention-textarea';},
    };

    // get value should return an object with the follow definition:
    // {text: "", caretIndex: 0}
    function getValue() {
        return {text: textarea.value, caretIndex: textarea.selectionStart};
    }

    function insert(tag, termMatch, spaceAfterInsert) {
        var val = getValue().text;

        if(spaceAfterInsert) {
            tag = tag + ' ';
        }

        textarea.value = val.slice(0, termMatch.start) + tag + val.slice(termMatch.end);

        var newCaretPos = termMatch.start + tag.length;
        textarea.selectionStart = newCaretPos;
        textarea.selectionEnd = newCaretPos;
    }

    function getMenuPosition(/*start*/) {
        // TODO currently we position it to the text area bottom-left,
        // we should return the real x/y position. We can do this with
        // an (gross) off screen div with the same styles.
        var rect = textarea.getClientRects()[0];
        return {top: rect.bottom, left: rect.left};
    }

    function destory() {
        
    }
};

te.newMentionContentEditablePlugin = function() {
    return {
        getValue: getValue,
        insert: insert,
        destory: destory,
        getMenuPosition: getMenuPosition,
        type: function(){return 'te-mention-content-editable';},
    };

    function getValue() {
        var sel = window.getSelection();
        // TODO handle range selections too, should just abort on this case?
        // TODO handle when selectionanchorNode is not text, should probably abort?
        // TODO are there a black list of tags we return no value for? <a>?
        var data = {
            range: sel.getRangeAt(0),
            anchorNode: sel.anchorNode,
        };

        return {text: sel.anchorNode.textContent, caretIndex: sel.anchorOffset, data: data};
    }

    function insert(tag, metrics, spaceAfterInsert, data) {
        /*
        // TODO handle this case
        if(data.anchorNode.nodeType !== Node.TEXT_NODE) {
            console.log('not a text node: ', data.anchorNode);
        }
        */

        // the mention template we are inserting
        var mention = document.createElement('div');
        mention.innerHTML = tag;
        mention = mention.firstChild;

        var range = data.range;

        // TODO we could be in another anchor tag already, how to handle that? If its ours,
        // We want to replace it. If its a different anchor, we should not be auto completing on it

        // strip the text the user started typing in.
        if(data.anchorNode.nodeType ===  Node.TEXT_NODE) {
            range.setStart(data.anchorNode, metrics.start);
            range.setEnd(data.anchorNode, metrics.end);
        }

        range.deleteContents();
        range.insertNode(mention);

        var lastNewElement = mention;

        if(spaceAfterInsert) {
            lastNewElement = document.createTextNode('\u00A0');
            mention.parentNode.insertBefore(lastNewElement, mention.nextSibling);
        }

        // move the caret to the end of the inserted content
        var sel = window.getSelection();
        sel.removeAllRanges();
        range = document.createRange();
        range.selectNode(lastNewElement);
        range.collapse();
        sel.addRange(range);
    }

    function getMenuPosition(start) {
        // TODO this is not safe, need to test for range and selection
        var sel = window.getSelection();
        var range = sel.getRangeAt(0);
        range.cloneRange();
        range.setStart(range.startContainer, start);

        var bounds = range.getClientRects();
        if(bounds && bounds[0]) {
            return {top: bounds[0].top, left: bounds[0].left};
        }
        return {left:0, top:0};
    }

    function destory() {
        // TODO implement this
    }
};

te.newMentionListView = function(onItemSelect /*func*/, typeClass, escapeCloseLength) {
    var cursorPos = 0;
    var numItems = 0;
    var items = null;
    var listItems = null;
    var isVisible = false;
    var wrapper = document.createElement('div');
    var list = document.createElement('ul');
    // TODO this needs to be configurable
    var rowTmpl = '<b>Name:</b> {value}';
    // when the list was last closed by pressing escape
    var closedAt = 0;

    list.className = 'te-mentions-list-results';
    list.addEventListener('click', onListClick);
    wrapper.className = 'te-mentions-list ' + typeClass;
    wrapper.appendChild(list);
    document.body.appendChild(wrapper);

    window.addEventListener('keydown', onKeyDown, true);


    function destroy() {
        document.body.removeChild(wrapper);
        window.removeEventListener('keydown', onKeyDown);
    }

    function setList(itemData, position) {
        // TODO this needs to make sure the menu is within screen bounds

        // Pressing escape when the auto complete menu is open hides it
        // for this length of time
        if(Date.now() - closedAt < escapeCloseLength) {
            return;
        }

        items = itemData;
        numItems = itemData.length;
        isVisible = numItems > 0;
        listItems = [];
        cursorPos = 0;

        // clear old matches
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }

        // if not matches, exit
        if(!isVisible) {
            return;
        }

        wrapper.style.top = position.top;
        wrapper.style.left = position.left;

        // add new matches
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var listItem = document.createElement('li');
            listItem.setAttribute('data-te-mention-index', i);

            if(i === 0) {
                listItem.className = 'te-active';
            }

            listItem.innerHTML = te.parseTemplate(item, rowTmpl);
            list.appendChild(listItem);
            listItems.push(listItem);
        }
    }

    function moveCusor(index) {
        var activeItem = null;
        var prevPos = cursorPos;
        cursorPos = index;

        if(cursorPos < 0) {
            cursorPos = 0;
        }
        else if(cursorPos > numItems - 1) {
            cursorPos = numItems - 1;
        }

        if(prevPos === cursorPos) {
            return;
        }

        for (var i = 0; i < listItems.length; i++) {
            if(i === prevPos) {
                listItems[i].className = '';
            } else if(i === cursorPos) {
                activeItem = listItems[i];
                activeItem.className = 'te-active';
            }
        }

        // make sure the active item in scrolled into view
        if(activeItem) {
            // COMPATIBILITY: scrollIntoViewIfNeeded is blink/webkit, No support in Firefox. (IE is unknown)
            // Both work reasonably well, `scrollIntoViewIfNeeded` feels a little nicer
            if(typeof(activeItem.scrollIntoViewIfNeeded) === 'function') {
                activeItem.scrollIntoViewIfNeeded(false);
            } else {
                activeItem.scrollIntoView(false);
            }
        }
    }

    function selectItem(i) {
        var item = items[i];
        // clear the current list
        setList([]);
        // insert the selected item
        onItemSelect(item);
    }

    function onKeyDown(e) {
        if(!isVisible) {
            return;
        }

        var key = e.key || e.keyIdentifier;
        var handled = false;

        // TODO switch to char codes to save bytes?
        switch(key) {
        case 'Up':
        case 'ArrowUp':
            handled = true;
            moveCusor(cursorPos - 1);
            break;
        case 'Down':
        case 'ArrowDown':
            handled = true;
            moveCusor(cursorPos + 1);
            break;
        case 'Enter':
        case 'Tab':
        case 'U+0009'://chrome tab
            handled = true;
            selectItem(cursorPos);
            break;
        case 'Escape':
        case 'U+001B'://chrome escape
            // clear the current list
            setList([]);
            // we have to clear before setting this time
            closedAt = Date.now();
            break;
        }

        if(handled) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }

    function onListClick(e) {
        var target = e.target;

        while(target && !target.hasAttribute('data-te-mention-index')) {
            target = target.parentNode;
        }

        if(target) {
            selectItem(parseInt(target.getAttribute('data-te-mention-index'), 10));
        }
        
        e.stopImmediatePropagation();
        e.preventDefault();
    }

    // return interface
    return {
        setList: setList,
        destroy: destroy,
    };
};

// COMPATIBILITY: IE9 doesn't support this
if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
        setTimeout(callback, 1000 / 30);
    };
}