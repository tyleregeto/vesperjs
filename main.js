'use strict';

// TODO position auto complete menu at caret position
// TODO remove list from DOM if empty
// TODO deleting needs to cleanup mention tags (contentEditable)
// TODO after insert, a single back space should remove the last name, a second backspace should remove everything up to the '@' character
// TODO support callback match finding, needs to work with AJAX requests
// TODO iframe support (eg: CKEditor)

'use strict';

var te = {};

te.newMentionListener = function(targetId, spec) {
    spec = spec || {};

    var target = null;
    var plugin = null;
    var trigChar = spec.triggerCharacter || '@';
    var insertTmpl = spec.insertTmpl || (trigChar + '{value}');
    var insertEmptySpaceAfter = spec.spaceAfterInsert || false;
    // When looking for @ starts, only look back `maxChar` from the caret position
    var maxChar = 20;
    // Note: an empty class name is valid, but you won't be able to edit
    // mentions if the template contains an anchor tag in that case.
    // This is because we can't tell the origin of the anchor tag.
    // TODO expect this class in the template
    var mentionTagClassName = spec.mentionClassName || 'te-mention';
    var view = te.newMentionListView(onMentionSelection, spec.escapeCloseLength || 3000);
    var termMatch = null;
    var pluginData = null;

    init();
    
    // return an interface to the mention object
    return {
        destory: destory,
    };

    function init() {
        target = document.getElementById(targetId);

        if(target.tagName.toLowerCase() === 'textarea') {
            plugin = te.newMentionTextareaPlugin(target);
        } else if(target.hasAttribute('contentEditable') && target.getAttribute('contentEditable') !== 'false') {
            plugin = te.newMentionContentEditablePlugin(target);
        }

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
            showMatches(findMatches(termMatch.term));
        } else {
            // clear any existing matches in view
            showMatches([]);
        }
    }

    function parseInsertTemplate(data) {
        var keys = Object.keys(data);
        var res = insertTmpl;
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            res = res.replace('{'+k+'}', data[k]);
        }

        return res;
    }

    // called from the view when the user selects a mention
    function onMentionSelection(data) {
        if(typeof(data) === 'string') {
            data = {value: data};
        }

        var tag = parseInsertTemplate(data);
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

    function showMatches(list) {
        view.setList(list);
    }
};

te.newMentionTextareaPlugin = function(textarea) {
    return {
        getValue: getValue,
        insert: insert,
        destory: destory,
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

    function destory() {
        
    }
};

te.newMentionContentEditablePlugin = function() {
    return {
        getValue: getValue,
        insert: insert,
        destory: destory,
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
        if(data.anchorNode.nodeType !== Node.TEXT_NODE) {
            console.log('not a text node: ', data.anchorNode);
        }

        // the mention template we are inserting
        var mention = document.createElement('div');
        mention.innerHTML = tag;
        mention = mention.firstChild;

        var range = data.range;

        // TODO we could be in another anchor tag already, how to handle that? If its ours,
        // We want to replace it. If its a different anchor, we should not be auto completing on it

        // strip the text the user started typing in.
        // TODO what if the element is not a Text Node?
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

    function destory() {

    }
};

te.newMentionListView = function(onItemSelect /*func*/, escapeCloseLength) {
    var cursorPos = 0;
    var numItems = 0;
    var items = null;
    var listItems = null;
    var isVisible = false;
    var wrapper = document.createElement('div');
    var list = document.createElement('ul');
    var rowTmpl = '<b>Name:</b> {value}';
    // when the list was last closed by pressing escape
    var closedAt = 0;

    list.className = 'te-mentions-list-results';
    list.addEventListener('click', onListClick);
    wrapper.className = 'te-mentions-list';
    wrapper.appendChild(list);
    document.body.appendChild(wrapper);

    window.addEventListener('keydown', onKeyDown, true);

    function setList(itemData) {
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

        // add new matches
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var listItem = document.createElement('li');
            listItem.setAttribute('data-te-mention-index', i);

            if(i === 0) {
                listItem.className = 'te-active';
            }

            listItem.innerHTML = parseTemplate(item);
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

    function parseTemplate(data) {
        if(typeof(data) === 'string') {
            data = {value: data};
        }

        var keys = Object.keys(data);
        var res = rowTmpl;
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            res = res.replace('{'+k+'}', data[k]);
        }
        return res;
    }

    function onKeyDown(e) {
        if(!isVisible) {
            return;
        }

        var key = e.key || e.keyIdentifier;
        var handled = false;

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
            handled = true;
            selectItem(cursorPos);
            break;
        case 'Escape':
        case 'U+001B':
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

    function destroy() {
        window.removeEventListener('keydown', onKeyDown);
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